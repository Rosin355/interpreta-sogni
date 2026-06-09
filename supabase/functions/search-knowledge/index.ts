// Search Knowledge — semantic retrieval over the curated Knowledge Base.
//
// Embeds a query with OpenAI and runs a top-k cosine-similarity lookup via the
// public.match_knowledge_chunks RPC (which returns ONLY active-source chunks).
//
// Provider: OpenAI embeddings ONLY (text-embedding-3-small, 1536 dims) for the
// query vector. No Anthropic / Lovable / ElevenLabs / Claude. This function does
// NOT modify interpret-dream and does NOT generate/store chunk embeddings.
//
// dry_run mode guarantees ZERO provider calls and ZERO DB writes.
//
// Auth: any authenticated user (JWT validated in code) — NOT admin-only. The
// RPC restricts results to active sources, so no admin-only data is exposed.
//
// Privacy: the query text, chunk content, embeddings, JWT, API key and raw
// provider bodies are NEVER logged.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "text-embedding-3-small";
const EXPECTED_DIM = 1536;
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

// Must mirror the ingest/edit domain whitelist.
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

const BodySchema = z.object({
  query: z.string().trim().min(3).max(2000),
  domain: z.enum(ALLOWED_DOMAINS).optional(),
  language: z.string().trim().min(2).max(8).optional(),
  match_count: z.number().int().min(1).max(10).default(5),
  match_threshold: z.number().min(0).max(1).default(0.7),
  mode: z.enum(["dry_run", "search"]).default("dry_run"),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const prefix = (id: string) => id.slice(0, 8);
const estimateTokens = (s: string) => Math.ceil(s.length / 4);

class KbError extends Error {
  constructor(public readonly code: string, public readonly httpStatus: number) {
    super(code);
    this.name = "KbError";
  }
}

/**
 * Embed a single query string with OpenAI. Returns the 1536-dim vector + the
 * reported input tokens. Throws KbError on any failure; the raw provider body is
 * never surfaced or logged.
 */
async function embedQuery(
  apiKey: string,
  model: string,
  query: string,
): Promise<{ vector: number[]; inputTokens: number | null }> {
  let resp: Response;
  try {
    resp = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: [query], encoding_format: "float" }),
    });
  } catch {
    throw new KbError("search_provider_failed", 502);
  }
  if (!resp.ok) {
    await resp.text().catch(() => undefined); // drain + discard, never log
    throw new KbError("search_provider_failed", 502);
  }

  // deno-lint-ignore no-explicit-any
  let payload: any;
  try {
    payload = await resp.json();
  } catch {
    throw new KbError("search_provider_failed", 502);
  }

  const data = Array.isArray(payload?.data) ? payload.data : null;
  if (!data || data.length !== 1) throw new KbError("search_dimension_mismatch", 502);
  const vector = data[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== EXPECTED_DIM) {
    throw new KbError("search_dimension_mismatch", 502);
  }
  for (const n of vector) {
    if (typeof n !== "number" || !Number.isFinite(n)) {
      throw new KbError("search_dimension_mismatch", 502);
    }
  }

  const usage = payload?.usage ?? {};
  const inputTokens = typeof usage.prompt_tokens === "number"
    ? usage.prompt_tokens
    : (typeof usage.total_tokens === "number" ? usage.total_tokens : null);

  return { vector: vector as number[], inputTokens };
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

    // Any authenticated user may retrieve (NOT admin-only). JWT validated here.
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Non autorizzato" }, 401);

    let raw: unknown;
    try { raw = await req.json(); } catch { return json({ error: "JSON non valido" }, 400); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "Dati non validi", details: parsed.error.flatten() }, 400);
    }
    const { query, domain, language, match_count, match_threshold, mode } = parsed.data;
    const model = (Deno.env.get("EMBEDDING_MODEL") ?? "").trim() || DEFAULT_MODEL;

    // Never log the query text — only its length.
    console.log(
      `[search-knowledge] started userIdPrefix=${prefix(user.id)} mode=${mode}`,
    );

    // ---- DRY RUN — no provider call, no DB writes ----------------------------
    if (mode === "dry_run") {
      const estimatedTokens = estimateTokens(query);
      console.log(`[search-knowledge] dry_run estimatedTokens=${estimatedTokens}`);
      return json({
        mode,
        query_length: query.length,
        estimated_query_tokens: estimatedTokens,
        model,
        match_count,
        match_threshold,
        domain: domain ?? null,
        language: language ?? null,
        provider_call: false,
      });
    }

    // ---- SEARCH MODE --------------------------------------------------------
    const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
    if (!apiKey) {
      console.error(`[search-knowledge] failed code=missing_openai_key`);
      return json(
        { error: "OPENAI_API_KEY non configurata", error_code: "search_provider_failed" },
        500,
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    try {
      // 1) Embed the query (single OpenAI call).
      const { vector, inputTokens } = await embedQuery(apiKey, model, query);

      // 2) Top-k cosine similarity over active-source chunks (RPC enforces this).
      const { data: rows, error: rpcErr } = await admin.rpc("match_knowledge_chunks", {
        query_embedding: vector,
        match_threshold,
        match_count,
        filter_domain: domain ?? null,
        filter_language: language ?? null,
      });
      if (rpcErr) {
        console.error(`[search-knowledge] failed code=rpc_error pg=${rpcErr.code ?? "unknown"}`);
        throw new KbError("search_failed", 500);
      }

      // deno-lint-ignore no-explicit-any
      const matched = (rows ?? []) as any[];
      const results = matched.map((r) => ({
        source_id: r.source_id,
        source_title: r.source_title,
        domain: r.source_domain,
        language: r.source_language,
        chunk_index: r.chunk_index,
        content: r.content,
        token_count: r.token_count,
        similarity: typeof r.similarity === "number"
          ? Math.round(r.similarity * 10000) / 10000
          : r.similarity,
      }));

      // 3) usage_ledger — only after a successful OpenAI request (fail-open).
      try {
        await admin.from("usage_ledger").insert({
          feature: "search_knowledge",
          user_id: user.id,
          metadata: {
            provider: "openai",
            model,
            query_input_tokens: inputTokens,
            result_count: results.length,
            match_count,
            match_threshold,
            domain: domain ?? null,
            language: language ?? null,
          },
        });
      } catch (ledgerErr) {
        console.warn(
          `[search-knowledge] usage_ledger warn code=${
            String((ledgerErr as { code?: string })?.code ?? "unknown")
          }`,
        );
      }

      // 4) ai_knowledge_retrieval_logs — IDs + scores only, query omitted for
      // privacy. Fail-open: a logging error must not break retrieval.
      try {
        await admin.from("ai_knowledge_retrieval_logs").insert({
          feature: "search_knowledge",
          user_id: user.id,
          query: null, // never store the raw query text
          selected_chunk_ids: matched.map((r) => r.chunk_id),
          metadata: {
            similarities: results.map((r) => r.similarity),
            result_count: results.length,
            match_count,
            match_threshold,
            domain: domain ?? null,
            language: language ?? null,
          },
        });
      } catch (logErr) {
        console.warn(
          `[search-knowledge] retrieval_log warn code=${
            String((logErr as { code?: string })?.code ?? "unknown")
          }`,
        );
      }

      console.log(
        `[search-knowledge] completed resultCount=${results.length} model=${model}`,
      );
      return json({
        results,
        result_count: results.length,
        model,
        provider_call: true,
      });
    } catch (e) {
      const code = e instanceof KbError ? e.code : "search_failed";
      const status = e instanceof KbError ? e.httpStatus : 500;
      console.error(`[search-knowledge] failed code=${code}`);
      return json({ error: "Errore ricerca", error_code: code }, status);
    }
  } catch (e) {
    console.error(
      `[search-knowledge] unhandled: ${String((e as Error)?.message ?? e).slice(0, 120)}`,
    );
    return json({ error: "Errore interno" }, 500);
  }
});
