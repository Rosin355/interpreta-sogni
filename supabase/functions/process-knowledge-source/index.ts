// Process Knowledge Source — v1 (no embeddings yet, conservative)
//
// Loads an ai_knowledge_sources row, splits raw_text into chunks, and in
// `process` mode inserts them into ai_knowledge_chunks with embedding=null.
// Source status is left as 'draft' (NOT 'active') so chunks are NOT exposed
// via the authenticated_read_active_chunks RLS policy until a future pass
// generates embeddings and explicitly activates the source.
//
// This function does NOT call OpenAI / Anthropic / Lovable / ElevenLabs.
// Embeddings will be added in a follow-up function.

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
  mode: z.enum(["dry_run", "process"]).default("dry_run"),
  chunk_size: z.number().int().min(500).max(3000).default(1200),
  chunk_overlap: z.number().int().min(0).max(500).default(150),
}).refine((b) => b.chunk_overlap < b.chunk_size, {
  message: "chunk_overlap must be smaller than chunk_size",
  path: ["chunk_overlap"],
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const prefix = (id: string) => id.slice(0, 8);

/**
 * Deterministic text chunker.
 * - Splits on blank-line paragraphs first.
 * - Greedily packs paragraphs into chunks <= chunk_size.
 * - For paragraphs longer than chunk_size, falls back to character slicing
 *   with overlap.
 * - Adds tail-overlap between chunks built from packed paragraphs.
 */
function chunkText(
  text: string,
  chunkSize: number,
  overlap: number,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    if (buf.trim().length > 0) chunks.push(buf.trim());
    buf = "";
  };

  for (const para of paragraphs) {
    if (para.length > chunkSize) {
      flush();
      let start = 0;
      while (start < para.length) {
        const end = Math.min(start + chunkSize, para.length);
        chunks.push(para.slice(start, end).trim());
        if (end >= para.length) break;
        start = end - overlap;
        if (start < 0) start = 0;
      }
      continue;
    }

    const candidate = buf.length === 0 ? para : buf + "\n\n" + para;
    if (candidate.length <= chunkSize) {
      buf = candidate;
    } else {
      // Carry overlap from current buf into next
      const tail = overlap > 0 && buf.length > overlap
        ? buf.slice(buf.length - overlap)
        : "";
      flush();
      buf = tail.length > 0 ? tail + "\n\n" + para : para;
      if (buf.length > chunkSize) {
        // Paragraph + tail overflowed: hard slice
        let start = 0;
        while (start < buf.length) {
          const end = Math.min(start + chunkSize, buf.length);
          chunks.push(buf.slice(start, end).trim());
          if (end >= buf.length) break;
          start = end - overlap;
          if (start < 0) start = 0;
        }
        buf = "";
      }
    }
  }
  flush();
  return chunks;
}

const estimateTokens = (s: string) => Math.ceil(s.length / 4);

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
      return json({ error: "Dati non validi", details: parsed.error.flatten() }, 400);
    }
    const { source_id, mode, chunk_size, chunk_overlap } = parsed.data;

    console.log(
      `[process-knowledge-source] started userIdPrefix=${prefix(user.id)} sourceIdPrefix=${prefix(source_id)} mode=${mode}`,
    );

    // Load source
    const { data: source, error: srcErr } = await admin
      .from("ai_knowledge_sources")
      .select("id, raw_text, status, archived_at")
      .eq("id", source_id)
      .maybeSingle();

    if (srcErr) {
      console.error("[process-knowledge-source] fetch error", srcErr);
      return json({ error: "Errore lettura sorgente" }, 500);
    }
    if (!source) return json({ error: "Sorgente non trovata" }, 404);
    if (source.archived_at) return json({ error: "Sorgente archiviata" }, 409);
    if (!source.raw_text || source.raw_text.length < 100) {
      return json({ error: "raw_text mancante o troppo corto (min 100)" }, 400);
    }

    // Chunk
    const chunks = chunkText(source.raw_text, chunk_size, chunk_overlap);
    const tokenEstimates = chunks.map(estimateTokens);
    const totalTokens = tokenEstimates.reduce((a, b) => a + b, 0);

    // DRY RUN
    if (mode === "dry_run") {
      console.log(
        `[process-knowledge-source] dry_run chunkCount=${chunks.length}`,
      );
      return json({
        source_id,
        mode,
        chunk_count: chunks.length,
        estimated_token_count: totalTokens,
        chunk_size,
        chunk_overlap,
        chunks_preview: chunks.map((c, i) => ({
          chunk_index: i,
          length: c.length,
          token_estimate: tokenEstimates[i],
        })),
        embeddings: "not_generated",
        note: "Dry run: nessuna scrittura in DB, nessuna chiamata AI",
      });
    }

    // PROCESS MODE — insert chunks with embedding=null, keep source as draft.
    // Mark processing
    await admin
      .from("ai_knowledge_sources")
      .update({ status: "processing", error_message: null })
      .eq("id", source_id);

    try {
      // Wipe existing chunks for idempotent reprocessing
      const { error: delErr } = await admin
        .from("ai_knowledge_chunks")
        .delete()
        .eq("source_id", source_id);
      if (delErr) throw delErr;

      if (chunks.length > 0) {
        const rows = chunks.map((content, i) => ({
          source_id,
          chunk_index: i,
          content,
          token_count: tokenEstimates[i],
          embedding: null,
          metadata: { chunked_at: new Date().toISOString(), chunker_version: 1 },
        }));
        const { error: insErr } = await admin
          .from("ai_knowledge_chunks")
          .insert(rows);
        if (insErr) throw insErr;
      }

      // Stay in 'draft' — embeddings missing means retrieval shouldn't pick it up.
      await admin
        .from("ai_knowledge_sources")
        .update({
          status: "draft",
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", source_id);

      console.log(
        `[process-knowledge-source] processed sourceIdPrefix=${prefix(source_id)} chunkCount=${chunks.length}`,
      );

      return json({
        source_id,
        mode,
        chunk_count: chunks.length,
        estimated_token_count: totalTokens,
        source_status: "draft",
        embeddings: "pending",
        message:
          "Chunks created without embeddings. Run a future embedding pass to activate the source.",
      });
    } catch (e) {
      const reason = (e as Error)?.message ?? "unknown";
      await admin
        .from("ai_knowledge_sources")
        .update({
          status: "failed",
          error_message: "processing_failed",
        })
        .eq("id", source_id);
      console.error(
        `[process-knowledge-source] failed sourceIdPrefix=${prefix(source_id)} reason=${reason.slice(0, 120)}`,
      );
      return json({ error: "Errore processing", source_status: "failed" }, 500);
    }
  } catch (e) {
    console.error("[process-knowledge-source] unhandled", e);
    return json({ error: "Errore interno" }, 500);
  }
});
