import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_DOMAINS = [
  "dreams",
  "alchemy",
  "astrology",
  "symbols",
  "mythology",
  "psychology",
  "rituals",
  "voice_scripts",
  "community_guidelines",
  "app_content",
] as const;

const BodySchema = z
  .object({
    source_id: z.string().uuid().optional(),
    title: z.string().trim().min(3).max(200),
    domain: z.enum(ALLOWED_DOMAINS),
    source_type: z
      .enum(["manual_text", "note", "markdown", "txt", "pdf"])
      .default("manual_text"),
    language: z.string().trim().min(2).max(8).default("it"),
    author: z.string().trim().max(200).nullable().optional(),
    origin: z.string().trim().max(500).nullable().optional(),
    tags: z.array(z.string()).max(50).default([]),
    raw_text: z.string().min(100).max(200_000).optional(),
    storage_path: z.string().trim().min(1).max(500).optional(),
    status: z.enum(["draft", "active"]).default("draft"),
  })
  .superRefine((val, ctx) => {
    if (val.source_type === "pdf") {
      if (!val.storage_path) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["storage_path"],
          message: "storage_path richiesto per source_type='pdf'",
        });
      }
    } else {
      if (!val.raw_text || val.raw_text.length < 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["raw_text"],
          message: "raw_text richiesto (min 100 char) per fonti testuali",
        });
      }
    }
  });

const normalizeTags = (tags: string[]): string[] => {
  const set = new Set<string>();
  for (const t of tags) {
    const v = t.trim().toLowerCase();
    if (v.length > 0 && v.length <= 64) set.add(v);
  }
  return Array.from(set);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const prefix = (id: string) => id.slice(0, 8);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Non autorizzato" }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Non autorizzato" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Admin check: reuse existing security-definer RPC
    const { data: isAdminData, error: adminErr } = await admin.rpc("is_admin", {
      _user_id: user.id,
    });
    let isAdmin = !!isAdminData && !adminErr;

    // Optional fallback: KB_ADMIN_USER_IDS env (comma-separated UUIDs)
    if (!isAdmin) {
      const allowlist = (Deno.env.get("KB_ADMIN_USER_IDS") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (allowlist.includes(user.id)) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return json({ error: "Accesso negato: solo admin" }, 403);
    }

    console.log(
      `[ingest-knowledge-source] started userIdPrefix=${prefix(user.id)}`,
    );

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return json({ error: "JSON non valido" }, 400);
    }

    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return json(
        {
          error: "Dati non validi",
          details: parsed.error.flatten().fieldErrors,
        },
        400,
      );
    }
    const body = parsed.data;
    const tags = normalizeTags(body.tags);

    // UPDATE mode
    if (body.source_id) {
      const { data: existing, error: fetchErr } = await admin
        .from("ai_knowledge_sources")
        .select("id, created_by, raw_text")
        .eq("id", body.source_id)
        .maybeSingle();

      if (fetchErr) {
        console.error("[ingest-knowledge-source] fetch error", fetchErr);
        return json({ error: "Errore lettura sorgente" }, 500);
      }
      if (!existing) {
        return json({ error: "Sorgente non trovata" }, 404);
      }

      // Any admin can update; creator can also update their own
      const rawTextChanged = existing.raw_text !== body.raw_text;

      const update: Record<string, unknown> = {
        title: body.title,
        domain: body.domain,
        source_type: body.source_type,
        language: body.language,
        author: body.author ?? null,
        origin: body.origin ?? null,
        tags,
        raw_text: body.raw_text,
        status: rawTextChanged ? "draft" : body.status,
        updated_at: new Date().toISOString(),
      };
      if (rawTextChanged) {
        update.processed_at = null;
        // TODO: when chunk pipeline lands, delete existing chunks for this source_id
      }

      const { error: updErr } = await admin
        .from("ai_knowledge_sources")
        .update(update)
        .eq("id", body.source_id);

      if (updErr) {
        console.error("[ingest-knowledge-source] update error", updErr);
        return json({ error: "Errore aggiornamento sorgente" }, 500);
      }

      console.log(
        `[ingest-knowledge-source] updated sourceIdPrefix=${prefix(body.source_id)} domain=${body.domain} status=${update.status}`,
      );

      return json({
        source_id: body.source_id,
        status: update.status,
        message: "Knowledge source updated",
      });
    }

    // INSERT mode
    const { data: inserted, error: insErr } = await admin
      .from("ai_knowledge_sources")
      .insert({
        title: body.title,
        domain: body.domain,
        source_type: body.source_type,
        language: body.language,
        author: body.author ?? null,
        origin: body.origin ?? null,
        tags,
        raw_text: body.raw_text,
        status: body.status,
        created_by: user.id,
        metadata: { ingest_method: "manual_text", version: 1 },
      })
      .select("id, status")
      .single();

    if (insErr || !inserted) {
      console.error("[ingest-knowledge-source] insert error", insErr);
      return json({ error: "Errore inserimento sorgente" }, 500);
    }

    console.log(
      `[ingest-knowledge-source] created sourceIdPrefix=${prefix(inserted.id)} domain=${body.domain} status=${inserted.status}`,
    );

    return json({
      source_id: inserted.id,
      status: inserted.status,
      message: "Knowledge source created",
    });
  } catch (e) {
    console.error("[ingest-knowledge-source] unhandled", e);
    return json({ error: "Errore interno" }, 500);
  }
});
