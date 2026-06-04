// Manage Knowledge Source — admin status transitions + protected delete.
//
// Actions:
//   * archive            → status='archived', archived_at=now()  (chunks kept)
//   * restore_draft      → status='draft', archived_at=null, error_message=null
//   * delete_permanently → delete chunks for source_id, then delete the source row
//
// This function does NOT call OpenAI / Anthropic / Lovable / ElevenLabs, does
// NOT generate embeddings, and does NOT process documents. Same admin auth
// pattern as ingest-/process-knowledge-source (JWT + public.is_admin + optional
// KB_ADMIN_USER_IDS fallback). All writes use the service role server-side.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  source_id: z.string().uuid(),
  action: z.enum(["archive", "restore_draft", "delete_permanently"]),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const prefix = (id: string) => id.slice(0, 8);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorizzato" }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Non autorizzato" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: isAdminData, error: adminErr } = await admin.rpc("is_admin", {
      _user_id: user.id,
    });
    let isAdmin = !!isAdminData && !adminErr;
    if (!isAdmin) {
      const allowlist = (Deno.env.get("KB_ADMIN_USER_IDS") ?? "")
        .split(",").map((s) => s.trim()).filter(Boolean);
      if (allowlist.includes(user.id)) isAdmin = true;
    }
    if (!isAdmin) return json({ error: "Accesso negato: solo admin" }, 403);

    let raw: unknown;
    try { raw = await req.json(); } catch { return json({ error: "JSON non valido" }, 400); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "Dati non validi", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { source_id, action } = parsed.data;

    console.log(
      `[manage-knowledge-source] started userIdPrefix=${prefix(user.id)} sourceIdPrefix=${prefix(source_id)} action=${action}`,
    );

    // Ensure the source exists (avoid silent no-op on a bad id).
    const { data: source, error: srcErr } = await admin
      .from("ai_knowledge_sources")
      .select("id")
      .eq("id", source_id)
      .maybeSingle();
    if (srcErr) {
      console.error(`[manage-knowledge-source] fetch error code=${srcErr.code ?? "unknown"}`);
      return json({ error: "Errore lettura sorgente" }, 500);
    }
    if (!source) return json({ error: "Sorgente non trovata" }, 404);

    const nowIso = new Date().toISOString();

    if (action === "archive") {
      const { error } = await admin
        .from("ai_knowledge_sources")
        .update({ status: "archived", archived_at: nowIso, error_message: null, updated_at: nowIso })
        .eq("id", source_id);
      if (error) {
        console.error(`[manage-knowledge-source] archive error code=${error.code ?? "unknown"}`);
        return json({ error: "Errore archiviazione" }, 500);
      }
      console.log(`[manage-knowledge-source] archived sourceIdPrefix=${prefix(source_id)}`);
      return json({ source_id, status: "archived", message: "Fonte archiviata" });
    }

    if (action === "restore_draft") {
      const { error } = await admin
        .from("ai_knowledge_sources")
        .update({
          status: "draft",
          archived_at: null,
          error_message: null,
          updated_at: nowIso,
        })
        .eq("id", source_id);
      if (error) {
        console.error(`[manage-knowledge-source] restore error code=${error.code ?? "unknown"}`);
        return json({ error: "Errore ripristino" }, 500);
      }
      console.log(`[manage-knowledge-source] restored sourceIdPrefix=${prefix(source_id)}`);
      return json({ source_id, status: "draft", message: "Fonte ripristinata in bozza" });
    }

    // delete_permanently — explicitly remove chunks first (FK cascade is not
    // guaranteed by a committed migration), then the source row.
    // TODO: also delete the Storage PDF object (bucket 'knowledge-sources',
    // source.storage_path) in a future pass — skipped here to avoid orphaned
    // deletes if a path is shared/reused.
    const { error: chunkErr } = await admin
      .from("ai_knowledge_chunks")
      .delete()
      .eq("source_id", source_id);
    if (chunkErr) {
      console.error(`[manage-knowledge-source] chunk delete error code=${chunkErr.code ?? "unknown"}`);
      return json({ error: "Errore eliminazione chunk" }, 500);
    }
    const { error: delErr } = await admin
      .from("ai_knowledge_sources")
      .delete()
      .eq("id", source_id);
    if (delErr) {
      console.error(`[manage-knowledge-source] source delete error code=${delErr.code ?? "unknown"}`);
      return json({ error: "Errore eliminazione sorgente" }, 500);
    }
    console.log(`[manage-knowledge-source] deleted sourceIdPrefix=${prefix(source_id)}`);
    return json({ source_id, deleted: true, message: "Fonte eliminata definitivamente" });
  } catch (e) {
    console.error(
      `[manage-knowledge-source] unhandled: ${String((e as Error)?.message ?? e).slice(0, 120)}`,
    );
    return json({ error: "Errore interno" }, 500);
  }
});
