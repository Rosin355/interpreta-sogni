// Embed Knowledge Source — generate OpenAI embeddings for pending chunks.
//
// Loads an ai_knowledge_sources row and embeds its ai_knowledge_chunks rows
// that still have embedding = NULL, in batches. When no pending chunks remain
// the source is promoted to status = 'active' (which is what the
// authenticated_read_active_chunks RLS policy gates retrieval on).
//
// Provider: OpenAI embeddings ONLY (text-embedding-3-small, 1536 dims).
//   * OPENAI_API_KEY is read server-side only, never returned/logged.
//   * Optional EMBEDDING_MODEL overrides the default model name.
// This function does NOT call Anthropic / Lovable / ElevenLabs / Claude and
// does NOT implement search. Same admin auth pattern as the other KB functions
// (JWT + public.is_admin + optional KB_ADMIN_USER_IDS fallback); all writes use
// the service role server-side.
//
// dry_run mode guarantees ZERO provider calls and ZERO DB writes.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "text-embedding-3-small";
const EXPECTED_DIM = 1536; // must match vector(1536) on ai_knowledge_chunks.embedding
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

const BodySchema = z.object({
  source_id: z.string().uuid(),
  mode: z.enum(["dry_run", "embed"]).default("dry_run"),
  batch_size: z.number().int().min(1).max(50).default(20),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const prefix = (id: string) => id.slice(0, 8);

/** Safe machine error code + HTTP status. The code is what gets persisted to
 * ai_knowledge_sources.error_message; it must never contain provider content. */
class KbError extends Error {
  constructor(public readonly code: string, public readonly httpStatus: number) {
    super(code);
    this.name = "KbError";
  }
}

const estimateTokens = (s: string) => Math.ceil(s.length / 4);

/** Count chunks for a source split into total / pending(embedding IS NULL). */
async function countChunks(
  // deno-lint-ignore no-explicit-any
  admin: any,
  sourceId: string,
): Promise<{ total: number; pending: number; embedded: number }> {
  const totalQ = await admin
    .from("ai_knowledge_chunks")
    .select("id", { count: "exact", head: true })
    .eq("source_id", sourceId);
  if (totalQ.error) throw totalQ.error;

  const pendingQ = await admin
    .from("ai_knowledge_chunks")
    .select("id", { count: "exact", head: true })
    .eq("source_id", sourceId)
    .is("embedding", null);
  if (pendingQ.error) throw pendingQ.error;

  const total = totalQ.count ?? 0;
  const pending = pendingQ.count ?? 0;
  return { total, pending, embedded: Math.max(0, total - pending) };
}

/** Format a numeric vector as a pgvector text literal: "[0.1,0.2,...]". */
const toVectorLiteral = (vec: number[]) => `[${vec.join(",")}]`;

/**
 * Call OpenAI embeddings for a batch of inputs. Returns embeddings (ordered to
 * match `inputs`) plus reported input tokens. Throws KbError on any failure.
 * The raw provider error body is NEVER surfaced or persisted.
 */
async function fetchEmbeddings(
  apiKey: string,
  model: string,
  inputs: string[],
): Promise<{ vectors: number[][]; inputTokens: number | null }> {
  let resp: Response;
  try {
    resp = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: inputs, encoding_format: "float" }),
    });
  } catch {
    throw new KbError("embedding_provider_failed", 502);
  }

  if (!resp.ok) {
    // Read+discard the body so the socket frees; never log/store it.
    await resp.text().catch(() => undefined);
    throw new KbError("embedding_provider_failed", 502);
  }

  // deno-lint-ignore no-explicit-any
  let payload: any;
  try {
    payload = await resp.json();
  } catch {
    throw new KbError("embedding_provider_failed", 502);
  }

  const data = Array.isArray(payload?.data) ? payload.data : null;
  if (!data || data.length !== inputs.length) {
    throw new KbError("embedding_dimension_mismatch", 502);
  }

  // OpenAI returns an `index` per item; sort defensively to match input order.
  const ordered = [...data].sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0));
  const vectors: number[][] = [];
  for (const item of ordered) {
    const v = item?.embedding;
    if (!Array.isArray(v) || v.length !== EXPECTED_DIM) {
      throw new KbError("embedding_dimension_mismatch", 502);
    }
    for (const n of v) {
      if (typeof n !== "number" || !Number.isFinite(n)) {
        throw new KbError("embedding_dimension_mismatch", 502);
      }
    }
    vectors.push(v as number[]);
  }

  const usage = payload?.usage ?? {};
  const inputTokens = typeof usage.prompt_tokens === "number"
    ? usage.prompt_tokens
    : (typeof usage.total_tokens === "number" ? usage.total_tokens : null);

  return { vectors, inputTokens };
}

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
    const { source_id, mode, batch_size } = parsed.data;
    const model = (Deno.env.get("EMBEDDING_MODEL") ?? "").trim() || DEFAULT_MODEL;

    console.log(
      `[embed-knowledge-source] started userIdPrefix=${prefix(user.id)} sourceIdPrefix=${prefix(source_id)} mode=${mode}`,
    );

    // Load the source (status only — never raw_text here).
    const { data: source, error: srcErr } = await admin
      .from("ai_knowledge_sources")
      .select("id, status, archived_at")
      .eq("id", source_id)
      .maybeSingle();
    if (srcErr) {
      console.error(
        `[embed-knowledge-source] fetch error sourceIdPrefix=${prefix(source_id)} code=${srcErr.code ?? "unknown"}`,
      );
      return json({ error: "Errore lettura sorgente" }, 500);
    }
    if (!source) return json({ error: "Sorgente non trovata" }, 404);
    if (source.status === "archived" || source.archived_at) {
      return json({ error: "Sorgente archiviata", error_code: "source_archived" }, 409);
    }

    const counts = await countChunks(admin, source_id);

    // ---- DRY RUN — no provider call, no DB writes ----------------------------
    if (mode === "dry_run") {
      // Pull the chunk_index + token_count of the next batch (no content needed).
      const { data: batch, error: batchErr } = await admin
        .from("ai_knowledge_chunks")
        .select("chunk_index, token_count")
        .eq("source_id", source_id)
        .is("embedding", null)
        .order("chunk_index", { ascending: true })
        .limit(batch_size);
      if (batchErr) {
        console.error(
          `[embed-knowledge-source] dry_run read error sourceIdPrefix=${prefix(source_id)} code=${batchErr.code ?? "unknown"}`,
        );
        return json({ error: "Errore lettura chunk" }, 500);
      }

      // deno-lint-ignore no-explicit-any
      const rows = (batch ?? []) as any[];
      const estimatedInputTokens = rows.reduce(
        (acc, r) => acc + (typeof r.token_count === "number" ? r.token_count : 0),
        0,
      );

      console.log(
        `[embed-knowledge-source] dry_run pending=${counts.pending} total=${counts.total}`,
      );
      return json({
        source_id,
        mode,
        source_status: source.status,
        total_chunks: counts.total,
        pending_chunks: counts.pending,
        embedded_chunks: counts.embedded,
        batch_size,
        next_chunk_indexes: rows.map((r) => r.chunk_index),
        model,
        estimated_input_tokens: estimatedInputTokens,
        provider_call: false,
      });
    }

    // ---- EMBED MODE ---------------------------------------------------------
    const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
    if (!apiKey) {
      // Configuration error — do not mutate the source; this is recoverable.
      console.error(
        `[embed-knowledge-source] failed sourceIdPrefix=${prefix(source_id)} code=missing_openai_key`,
      );
      return json(
        { error: "OPENAI_API_KEY non configurata", error_code: "embedding_provider_failed" },
        500,
      );
    }

    // Mark processing + clear any prior error before doing work.
    await admin
      .from("ai_knowledge_sources")
      .update({ status: "processing", error_message: null })
      .eq("id", source_id);

    try {
      // Already fully embedded → just promote/confirm active (idempotent resume).
      if (counts.pending === 0) {
        const nowIso = new Date().toISOString();
        await admin
          .from("ai_knowledge_sources")
          .update({ status: "active", processed_at: nowIso, error_message: null })
          .eq("id", source_id);
        console.log(`[embed-knowledge-source] active sourceIdPrefix=${prefix(source_id)}`);
        return json({
          source_id,
          mode,
          status: "active",
          total_chunks: counts.total,
          pending_chunks: 0,
          embedded_this_batch: 0,
          source_status: "active",
          model,
          requires_another_batch: false,
        });
      }

      // Load the pending batch (content needed only here, never logged/returned).
      const { data: batch, error: batchErr } = await admin
        .from("ai_knowledge_chunks")
        .select("id, chunk_index, content, token_count")
        .eq("source_id", source_id)
        .is("embedding", null)
        .order("chunk_index", { ascending: true })
        .limit(batch_size);
      if (batchErr) throw new KbError("embedding_update_failed", 500);

      // deno-lint-ignore no-explicit-any
      const rows = (batch ?? []) as any[];
      if (rows.length === 0) {
        // Race: pending count > 0 but nothing selected — recount and report.
        const after = await countChunks(admin, source_id);
        return json({
          source_id,
          mode,
          status: "partial",
          pending_chunks: after.pending,
          embedded_this_batch: 0,
          source_status: "processing",
          model,
          requires_another_batch: after.pending > 0,
        });
      }

      const inputs = rows.map((r) => r.content as string);
      const { vectors, inputTokens } = await fetchEmbeddings(apiKey, model, inputs);

      // Provider call succeeded → record usage ledger (fail-open) BEFORE the DB
      // updates so the cost is tracked even if a later update fails.
      try {
        await admin.from("usage_ledger").insert({
          feature: "embed_knowledge_source",
          user_id: user.id,
          metadata: {
            source_id,
            provider: "openai",
            model,
            chunks_embedded: vectors.length,
            input_tokens: inputTokens,
            batch_size,
          },
        });
      } catch (ledgerErr) {
        console.warn(
          `[embed-knowledge-source] usage_ledger warn sourceIdPrefix=${prefix(source_id)} code=${
            String((ledgerErr as { code?: string })?.code ?? "unknown")
          }`,
        );
      }

      // Persist each embedding. A single failed update aborts (source → failed)
      // and leaves already-updated chunks embedded → safe to retry (resumable).
      for (let i = 0; i < rows.length; i++) {
        const { error: updErr } = await admin
          .from("ai_knowledge_chunks")
          .update({ embedding: toVectorLiteral(vectors[i]) })
          .eq("id", rows[i].id);
        if (updErr) throw new KbError("embedding_update_failed", 500);
      }

      const embeddedThisBatch = rows.length;
      const after = await countChunks(admin, source_id);

      if (after.pending > 0) {
        // More work remains — keep processing, ask the caller to continue.
        console.log(
          `[embed-knowledge-source] partial sourceIdPrefix=${prefix(source_id)} pending=${after.pending}`,
        );
        return json({
          source_id,
          mode,
          status: "partial",
          total_chunks: after.total,
          pending_chunks: after.pending,
          embedded_this_batch: embeddedThisBatch,
          source_status: "processing",
          model,
          requires_another_batch: true,
        });
      }

      // Done — promote to active.
      const nowIso = new Date().toISOString();
      await admin
        .from("ai_knowledge_sources")
        .update({ status: "active", processed_at: nowIso, error_message: null })
        .eq("id", source_id);
      console.log(
        `[embed-knowledge-source] embedded sourceIdPrefix=${prefix(source_id)} count=${embeddedThisBatch} model=${model}`,
      );
      console.log(`[embed-knowledge-source] active sourceIdPrefix=${prefix(source_id)}`);
      return json({
        source_id,
        mode,
        status: "active",
        total_chunks: after.total,
        pending_chunks: 0,
        embedded_this_batch: embeddedThisBatch,
        source_status: "active",
        model,
        requires_another_batch: false,
      });
    } catch (e) {
      const code = e instanceof KbError ? e.code : "embedding_processing_failed";
      const status = e instanceof KbError ? e.httpStatus : 500;
      await admin
        .from("ai_knowledge_sources")
        .update({ status: "failed", error_message: code })
        .eq("id", source_id);
      console.error(
        `[embed-knowledge-source] failed sourceIdPrefix=${prefix(source_id)} code=${code}`,
      );
      return json(
        { error: "Errore embedding", error_code: code, source_status: "failed" },
        status,
      );
    }
  } catch (e) {
    console.error(
      `[embed-knowledge-source] unhandled: ${String((e as Error)?.message ?? e).slice(0, 120)}`,
    );
    return json({ error: "Errore interno" }, 500);
  }
});
