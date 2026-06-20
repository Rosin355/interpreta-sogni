// Shared Knowledge Base retrieval helper for server-side functions
// (e.g. interpret-dream). Embeds a query with OpenAI and looks up the top-k most
// similar chunks via the public.match_knowledge_chunks RPC (active sources only).
//
// Designed to FAIL OPEN: any failure returns { chunks: [], failedSoftly: true }
// and NEVER throws, so the caller's primary flow (dream interpretation) is never
// blocked by retrieval problems.
//
// Privacy: the query text (built from dream content) and chunk content are NEVER
// logged. Retrieval logs store query = NULL. Embeddings / JWT / API key are never
// logged. Safe logs only: resultCount, domain, threshold, userIdPrefix.

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const EXPECTED_DIM = 1536;
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

export interface KbChunk {
  sourceTitle: string;
  domain: string;
  language: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export interface KbRetrievalResult {
  chunks: KbChunk[];
  resultCount: number;
  failedSoftly: boolean;
}

export interface RetrieveKnowledgeParams {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any; // service-role Supabase client
  userId: string;
  queryText: string; // built from dream content; NEVER logged
  domain?: string | null; // optional single-domain filter (null = all active)
  language?: string | null; // optional language filter (null = any)
  matchCount?: number; // default 3
  matchThreshold?: number; // default 0.40
}

const prefix = (id: string) => (id ?? "").slice(0, 8);

/**
 * Tester gating. KB retrieval is OFF unless BOTH:
 *   1. AI_KB_RETRIEVAL_ENABLED === "true"
 *   2. the user id is in AI_KB_TEST_USER_IDS (fallback AI_PROVIDER_TEST_USER_IDS)
 * If the tester list is empty/unset, retrieval stays disabled (safe default).
 */
export function isKbRetrievalEnabledForUser(userId: string): boolean {
  const enabled = (Deno.env.get("AI_KB_RETRIEVAL_ENABLED") ?? "")
    .trim().toLowerCase() === "true";
  if (!enabled) return false;

  const raw = ((Deno.env.get("AI_KB_TEST_USER_IDS") ?? "").trim())
    || ((Deno.env.get("AI_PROVIDER_TEST_USER_IDS") ?? "").trim());
  const testers = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return testers.includes(userId);
}

/** Embed a single query with OpenAI. Returns the 1536-dim vector, or null on any
 * failure (never throws, never logs the query or the raw provider body). */
async function embedQuery(
  apiKey: string,
  model: string,
  query: string,
): Promise<number[] | null> {
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
    return null;
  }
  if (!resp.ok) {
    await resp.text().catch(() => undefined); // drain + discard, never log
    return null;
  }
  // deno-lint-ignore no-explicit-any
  let payload: any;
  try {
    payload = await resp.json();
  } catch {
    return null;
  }
  const data = Array.isArray(payload?.data) ? payload.data : null;
  if (!data || data.length !== 1) return null;
  const vec = data[0]?.embedding;
  if (!Array.isArray(vec) || vec.length !== EXPECTED_DIM) return null;
  for (const n of vec) {
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
  }
  return vec as number[];
}

/**
 * Retrieve curated KB context for a query. ALWAYS resolves (never throws).
 * On any failure returns { chunks: [], failedSoftly: true } so the caller can
 * proceed without KB context.
 */
export async function retrieveKnowledgeContext(
  params: RetrieveKnowledgeParams,
): Promise<KbRetrievalResult> {
  const {
    supabaseAdmin,
    userId,
    queryText,
    domain = null,
    language = null,
    matchCount = 3,
    matchThreshold = 0.40,
  } = params;

  try {
    const q = (queryText ?? "").trim();
    if (q.length < 3) {
      // Nothing meaningful to search — not a failure.
      return { chunks: [], resultCount: 0, failedSoftly: false };
    }

    const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
    if (!apiKey) {
      console.warn(
        `[kb-retrieval] skipped code=missing_openai_key userIdPrefix=${prefix(userId)}`,
      );
      return { chunks: [], resultCount: 0, failedSoftly: true };
    }
    const model = (Deno.env.get("EMBEDDING_MODEL") ?? "").trim() ||
      DEFAULT_EMBEDDING_MODEL;

    const vector = await embedQuery(apiKey, model, q);
    if (!vector) {
      console.warn(`[kb-retrieval] embed_failed userIdPrefix=${prefix(userId)}`);
      return { chunks: [], resultCount: 0, failedSoftly: true };
    }

    const { data: rows, error: rpcErr } = await supabaseAdmin.rpc(
      "match_knowledge_chunks",
      {
        query_embedding: vector,
        match_threshold: matchThreshold,
        match_count: matchCount,
        filter_domain: domain,
        filter_language: language,
      },
    );
    if (rpcErr) {
      console.warn(
        `[kb-retrieval] rpc_failed userIdPrefix=${prefix(userId)} pg=${rpcErr.code ?? "unknown"}`,
      );
      return { chunks: [], resultCount: 0, failedSoftly: true };
    }

    // deno-lint-ignore no-explicit-any
    const matched = (rows ?? []) as any[];
    const chunks: KbChunk[] = matched.map((r) => ({
      sourceTitle: r.source_title,
      domain: r.source_domain,
      language: r.source_language,
      chunkIndex: r.chunk_index,
      content: r.content,
      similarity: typeof r.similarity === "number"
        ? Math.round(r.similarity * 10000) / 10000
        : r.similarity,
    }));

    // usage_ledger — only after a successful OpenAI embedding request (fail-open).
    try {
      await supabaseAdmin.from("usage_ledger").insert({
        feature: "interpret_dream_kb_retrieval",
        user_id: userId,
        metadata: {
          provider: "openai",
          model,
          result_count: chunks.length,
          match_count: matchCount,
          match_threshold: matchThreshold,
          domains: domain ? [domain] : [],
          language,
        },
      });
    } catch (e) {
      console.warn(
        `[kb-retrieval] usage_ledger warn code=${String((e as { code?: string })?.code ?? "unknown")}`,
      );
    }

    // retrieval log — IDs + scores only; query text is NEVER stored (fail-open).
    try {
      await supabaseAdmin.from("ai_knowledge_retrieval_logs").insert({
        feature: "interpret_dream_kb_retrieval",
        user_id: userId,
        query: null,
        selected_chunk_ids: matched.map((r) => r.chunk_id),
        metadata: {
          similarities: chunks.map((c) => c.similarity),
          result_count: chunks.length,
          match_count: matchCount,
          match_threshold: matchThreshold,
          domains: domain ? [domain] : [],
          language,
        },
      });
    } catch (e) {
      console.warn(
        `[kb-retrieval] retrieval_log warn code=${String((e as { code?: string })?.code ?? "unknown")}`,
      );
    }

    console.log(
      `[kb-retrieval] completed userIdPrefix=${prefix(userId)} resultCount=${chunks.length} threshold=${matchThreshold} domain=${domain ?? "any"}`,
    );
    return { chunks, resultCount: chunks.length, failedSoftly: false };
  } catch (e) {
    // Absolutely never let retrieval block interpretation.
    console.warn(
      `[kb-retrieval] unexpected code=${String((e as Error)?.message ?? "unknown").slice(0, 60)}`,
    );
    return { chunks: [], resultCount: 0, failedSoftly: true };
  }
}

// Non-citation labels for chunks (avoid [1]/[2] markers the model would echo).
const KB_LABELS = ["A", "B", "C", "D", "E"];

/**
 * Build a clearly-separated prompt section from retrieved chunks (max 3 shown).
 * Returns "" when there are no chunks. Never includes source IDs or embeddings.
 *
 * Chunks are labeled "Fonte curatoriale A/B/C" (NOT [1]/[2]) so the model does
 * not reproduce citation-style brackets in the user-facing interpretation. The
 * instruction block explicitly forbids citing the KB. See stripKbCitationMarkers
 * for the defensive post-processing safety net.
 */
export function buildKbPromptSection(chunks: KbChunk[]): string {
  if (!chunks.length) return "";
  const items = chunks.slice(0, 3).map((c, i) => {
    const sim = typeof c.similarity === "number" ? c.similarity.toFixed(2) : "—";
    const label = `Fonte curatoriale ${KB_LABELS[i] ?? String(i + 1)}`;
    return `${label} — dominio: ${c.domain} (affinità ~${sim})\n${c.content}`;
  }).join("\n\n");

  return [
    "CONTESTO CURATORIALE (uso interno — NON citare)",
    "Materiale curatoriale selezionato per affinità simbolica. Istruzioni vincolanti:",
    "- usalo SILENZIOSAMENTE come guida simbolica/curatoriale, mai come verità assoluta;",
    "- dai SEMPRE priorità al sogno dell'utente; se non è pertinente, ignoralo;",
    "- NON citare la Knowledge Base né queste fonti;",
    "- NON inserire riferimenti tra parentesi quadre come [1], [2], [Fonte A];",
    "- NON menzionare fonti interne, numeri di chunk, ID, retrieval, embedding o",
    "  meccanismi della Knowledge Base;",
    "- integra eventuali spunti nel discorso in modo naturale, senza note o citazioni.",
    "",
    items,
  ].join("\n");
}

/**
 * Conservative safety net: strip isolated KB citation markers a model might echo
 * despite the prompt — bracketed numeric citations ("[1]", "[ 2 ]", "[1, 3]")
 * and bracketed "Fonte"/"Riferimento" labels ("[Fonte A]"). It ONLY removes
 * those bracketed markers, never ordinary dream text, then tidies the leftover
 * whitespace/punctuation.
 */
export function stripKbCitationMarkers(text: string): string {
  if (!text) return text;
  const cleaned = text
    // [1]  [ 2 ]  [1, 2]  [1,2 , 3]
    .replace(/\[\s*\d+(\s*,\s*\d+)*\s*\]/g, "")
    // [Fonte ...]  [Fonte curatoriale A]  [Riferimento curatoriale]
    .replace(/\[\s*(?:fonte|riferiment\w*)[^\]]*\]/gi, "")
    .replace(/[ \t]{2,}/g, " ") // collapse doubled spaces left behind
    .replace(/[ \t]+([,.;:!?…])/g, "$1") // drop space before punctuation
    .replace(/[ \t]+\n/g, "\n"); // drop trailing spaces before newlines
  return cleaned.trim();
}
