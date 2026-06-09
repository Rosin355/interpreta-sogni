// Manage Knowledge Source — admin status transitions + protected delete.
//
// Actions:
//   * activate           → status='active' ONLY if the source is ready (see
//                          readiness checks below); else 409. error_message=null
//   * move_to_draft      → status='draft' (chunks + embeddings kept, no AI)
//   * archive            → status='archived', archived_at=now()  (chunks kept)
//   * restore_draft      → status='draft', archived_at=null, error_message=null
//   * delete_permanently → delete chunks for source_id, then delete the source row
//
// Activation readiness (server-side, authoritative — never trust the client):
//   1. the source has at least one ai_knowledge_chunks row
//   2. every chunk has embedding IS NOT NULL (no pending embeddings)
//   3. the source is not archived
//   4. the source has no current error_message
// If not ready → 409 with error_code `source_not_ready_for_activation`.
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
  action: z.enum([
    "activate",
    "move_to_draft",
    "archive",
    "restore_draft",
    "delete_permanently",
  ]),
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

    // Ensure the source exists (avoid silent no-op on a bad id). Also pull the
    // fields the activation readiness check needs.
    const { data: source, error: srcErr } = await admin
      .from("ai_knowledge_sources")
      .select("id, status, archived_at, error_message")
      .eq("id", source_id)
      .maybeSingle();
    if (srcErr) {
      console.error(`[manage-knowledge-source] fetch error code=${srcErr.code ?? "unknown"}`);
      return json({ error: "Errore lettura sorgente" }, 500);
    }
    if (!source) return json({ error: "Sorgente non trovata" }, 404);

    const nowIso = new Date().toISOString();
    const isArchived = source.status === "archived" || !!source.archived_at;

    if (action === "activate") {
      // Archived sources must be restored first (dedicated action), not activated.
      if (isArchived) {
        return json(
          { error: "Sorgente archiviata", error_code: "source_archived" },
          409,
        );
      }
      // A source carrying an error must be reprocessed/embedded before activation.
      if (source.error_message) {
        console.log(
          `[manage-knowledge-source] activate rejected sourceIdPrefix=${prefix(source_id)} reason=error_message`,
        );
        return json(
          {
            error: "Fonte non pronta per l'attivazione",
            error_code: "source_not_ready_for_activation",
          },
          409,
        );
      }

      // Readiness: at least one chunk AND zero pending embeddings. Service role
      // sees all chunks regardless of RLS, so this is authoritative.
      const totalQ = await admin
        .from("ai_knowledge_chunks")
        .select("id", { count: "exact", head: true })
        .eq("source_id", source_id);
      if (totalQ.error) {
        console.error(`[manage-knowledge-source] activate count error code=${totalQ.error.code ?? "unknown"}`);
        return json({ error: "Errore verifica chunk" }, 500);
      }
      const pendingQ = await admin
        .from("ai_knowledge_chunks")
        .select("id", { count: "exact", head: true })
        .eq("source_id", source_id)
        .is("embedding", null);
      if (pendingQ.error) {
        console.error(`[manage-knowledge-source] activate pending error code=${pendingQ.error.code ?? "unknown"}`);
        return json({ error: "Errore verifica chunk" }, 500);
      }
      const total = totalQ.count ?? 0;
      const pending = pendingQ.count ?? 0;
      if (total === 0 || pending > 0) {
        console.log(
          `[manage-knowledge-source] activate rejected sourceIdPrefix=${prefix(source_id)} total=${total} pending=${pending}`,
        );
        return json(
          {
            error: "Fonte non pronta per l'attivazione",
            error_code: "source_not_ready_for_activation",
          },
          409,
        );
      }

      const { error } = await admin
        .from("ai_knowledge_sources")
        .update({ status: "active", error_message: null, updated_at: nowIso })
        .eq("id", source_id);
      if (error) {
        console.error(`[manage-knowledge-source] activate error code=${error.code ?? "unknown"}`);
        return json({ error: "Errore attivazione" }, 500);
      }
      console.log(`[manage-knowledge-source] activated sourceIdPrefix=${prefix(source_id)}`);
      return json({ source_id, status: "active", message: "Fonte attivata" });
    }

    if (action === "move_to_draft") {
      // Demote to draft WITHOUT touching chunks/embeddings or running anything.
      // Archived sources use restore_draft (dedicated action) instead.
      if (isArchived) {
        return json(
          { error: "Sorgente archiviata", error_code: "source_archived" },
          409,
        );
      }
      const { error } = await admin
        .from("ai_knowledge_sources")
        .update({ status: "draft", updated_at: nowIso })
        .eq("id", source_id);
      if (error) {
        console.error(`[manage-knowledge-source] move_to_draft error code=${error.code ?? "unknown"}`);
        return json({ error: "Errore spostamento in bozza" }, 500);
      }
      console.log(`[manage-knowledge-source] moved_to_draft sourceIdPrefix=${prefix(source_id)}`);
      return json({ source_id, status: "draft", message: "Fonte spostata in bozza" });
    }

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
