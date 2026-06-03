// Process Knowledge Source — v2 (PDF text extraction + chunking, still no embeddings)
//
// Loads an ai_knowledge_sources row and produces deterministic text chunks:
//   * Text sources (manual_text / note / markdown / txt) use raw_text (unchanged).
//   * PDF sources (source_type='pdf' + storage_path) are downloaded from the
//     private `knowledge-sources` Storage bucket (service role, server-side only)
//     and their text layer is extracted with unpdf (a serverless PDF.js build).
//     This is text extraction only — NO OCR. Scanned / image-only PDFs that have
//     no extractable text layer fail with error code `pdf_text_extraction_failed`.
//
// In `process` mode chunks are inserted into ai_knowledge_chunks with
// embedding=null. The source stays 'draft' (NOT 'active') so chunks are NOT
// exposed via the authenticated_read_active_chunks RLS policy until a future
// pass (embed-knowledge-source) generates embeddings and activates the source.
//
// This function does NOT call OpenAI / Anthropic / Lovable / ElevenLabs and
// does NOT generate embeddings.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
// PDF text extraction. unpdf bundles a serverless build of Mozilla PDF.js with
// the worker inlined and Promise.withResolvers / FinalizationRegistry / DOMMatrix
// polyfills self-guarded inside the bundle, so no manual polyfill and no
// definePDFJSModule() call is needed on Deno. Pin the EXACT version — never
// @latest — to keep local-serve and deploy byte-identical.
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@1.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Fixed private bucket for KB documents (see supabase-knowledge-storage-migration.sql).
const KB_BUCKET = "knowledge-sources";
// Source types that chunk raw_text directly (no Storage download).
const TEXT_SOURCE_TYPES = new Set(["manual_text", "note", "markdown", "txt"]);
// Size / length guardrails (synchronous processing). Larger documents must be
// offloaded to a future batch/worker pass — see docs/admin-knowledge-process-v1.md.
const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB hard cap, well under the isolate limit
const MAX_EXTRACTED_CHARS = 500_000; // cap on extracted text fed to the chunker

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
 * Stable error carrying a safe machine code + HTTP status. The `code` is what
 * gets persisted to ai_knowledge_sources.error_message on failure and returned
 * to the client as `error_code`. It must never contain document content.
 */
class KbError extends Error {
  constructor(public readonly code: string, public readonly httpStatus: number) {
    super(code);
    this.name = "KbError";
  }
}

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

/**
 * Normalize a stored storage_path to an object path inside KB_BUCKET.
 * Canonical form is the object path WITHOUT the bucket prefix
 * (e.g. "alchemy/nigredo.pdf"). A leading "knowledge-sources/" prefix is
 * tolerated and stripped so both conventions work.
 */
function normalizeStoragePath(raw: string): string {
  let p = raw.trim().replace(/^\/+/, "");
  if (p.startsWith(KB_BUCKET + "/")) p = p.slice(KB_BUCKET.length + 1);
  return p;
}

/** Extract the text layer from PDF bytes. NO OCR. Throws KbError on failure. */
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    // unpdf's serverless PDF.js build auto-initializes; pass a Uint8Array.
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return (text ?? "").trim();
  } catch (e) {
    // PDF.js throws on corrupt / encrypted / non-PDF input. The message is a
    // library error, never document content, but keep it short anyway.
    console.error(
      `[process-knowledge-source] pdf parse error: ${
        String((e as Error)?.message ?? e).slice(0, 120)
      }`,
    );
    throw new KbError("pdf_text_extraction_failed", 422);
  }
}

/**
 * Download a PDF from the private bucket and return its extracted text.
 * Applies size + extracted-length guardrails. Throws KbError with a safe code.
 */
async function loadPdfSourceText(
  // deno-lint-ignore no-explicit-any
  admin: any,
  sourceId: string,
  storagePath: string | null | undefined,
): Promise<string> {
  if (!storagePath || !storagePath.trim()) {
    throw new KbError("pdf_missing_storage_path", 400);
  }
  const objectPath = normalizeStoragePath(storagePath);
  if (!objectPath) throw new KbError("pdf_missing_storage_path", 400);

  // Service role bypasses Storage RLS — server-side only, never client-side.
  const { data, error } = await admin.storage.from(KB_BUCKET).download(objectPath);
  if (error || !data) {
    console.error(
      `[process-knowledge-source] pdf download error sourceIdPrefix=${prefix(sourceId)}`,
    );
    throw new KbError("pdf_download_failed", 502);
  }

  const buf = await data.arrayBuffer();
  const byteLength = buf.byteLength;
  if (byteLength === 0) throw new KbError("pdf_download_failed", 502);
  if (byteLength > MAX_PDF_BYTES) throw new KbError("document_too_large", 413);
  console.log(
    `[process-knowledge-source] pdf downloaded sourceIdPrefix=${prefix(sourceId)} bytes=${byteLength}`,
  );

  const text = await extractPdfText(new Uint8Array(buf));
  if (text.length === 0) throw new KbError("pdf_text_extraction_failed", 422);
  if (text.length > MAX_EXTRACTED_CHARS) throw new KbError("document_too_large", 413);
  console.log(
    `[process-knowledge-source] pdf extracted sourceIdPrefix=${prefix(sourceId)} textLength=${text.length}`,
  );
  return text;
}

/**
 * Resolve the text to chunk for a source row. Text types return raw_text
 * (already validated by the caller); PDFs are downloaded + extracted.
 */
async function resolveSourceText(
  // deno-lint-ignore no-explicit-any
  admin: any,
  // deno-lint-ignore no-explicit-any
  source: any,
  sourceType: string,
): Promise<string> {
  if (sourceType === "pdf") {
    return await loadPdfSourceText(admin, source.id, source.storage_path);
  }
  return source.raw_text as string;
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
    const { source_id, mode, chunk_size, chunk_overlap } = parsed.data;

    console.log(
      `[process-knowledge-source] started userIdPrefix=${prefix(user.id)} sourceIdPrefix=${prefix(source_id)} mode=${mode}`,
    );

    // Load source (now also source_type + storage_path for the PDF branch)
    const { data: source, error: srcErr } = await admin
      .from("ai_knowledge_sources")
      .select("id, raw_text, status, archived_at, source_type, storage_path")
      .eq("id", source_id)
      .maybeSingle();

    if (srcErr) {
      // Log only a safe descriptor (PostgREST code), never the full error object.
      console.error(
        `[process-knowledge-source] fetch error sourceIdPrefix=${prefix(source_id)} code=${srcErr.code ?? "unknown"}`,
      );
      return json({ error: "Errore lettura sorgente" }, 500);
    }
    if (!source) return json({ error: "Sorgente non trovata" }, 404);
    if (source.archived_at) return json({ error: "Sorgente archiviata" }, 409);

    // Treat a null/legacy source_type as manual_text (backward compatible).
    const sourceType = (source.source_type ?? "manual_text") as string;
    const isPdf = sourceType === "pdf";
    const isTextType = TEXT_SOURCE_TYPES.has(sourceType);
    if (!isPdf && !isTextType) {
      return json(
        { error: "Tipo sorgente non supportato", error_code: "unsupported_source_type" },
        400,
      );
    }
    // Preserve existing text-source validation exactly.
    if (isTextType && (!source.raw_text || source.raw_text.length < 100)) {
      return json({ error: "raw_text mancante o troppo corto (min 100)" }, 400);
    }

    // DRY RUN — resolve text (downloads/extracts PDF if safe), chunk, report.
    // No DB writes, no source status change.
    if (mode === "dry_run") {
      let text: string;
      try {
        text = await resolveSourceText(admin, source, sourceType);
      } catch (e) {
        if (e instanceof KbError) {
          return json({ error: "Errore PDF", error_code: e.code }, e.httpStatus);
        }
        throw e;
      }

      const chunks = chunkText(text, chunk_size, chunk_overlap);
      const tokenEstimates = chunks.map(estimateTokens);
      const totalTokens = tokenEstimates.reduce((a, b) => a + b, 0);

      console.log(
        `[process-knowledge-source] dry_run chunkCount=${chunks.length}`,
      );
      return json({
        source_id,
        mode,
        source_type: sourceType,
        extracted_text_length: text.length,
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
    // Mark processing first (Task 6 sequence).
    await admin
      .from("ai_knowledge_sources")
      .update({ status: "processing", error_message: null })
      .eq("id", source_id);

    try {
      // Resolve text (may download/extract a PDF and throw a KbError).
      const text = await resolveSourceText(admin, source, sourceType);
      const chunks = chunkText(text, chunk_size, chunk_overlap);
      const tokenEstimates = chunks.map(estimateTokens);
      const totalTokens = tokenEstimates.reduce((a, b) => a + b, 0);

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
      // PDF: processed_at stays NULL (chunked-only, not fully processed yet).
      // Text: preserve existing behavior (processed_at = now()).
      await admin
        .from("ai_knowledge_sources")
        .update({
          status: "draft",
          processed_at: isPdf ? null : new Date().toISOString(),
          error_message: null,
        })
        .eq("id", source_id);

      console.log(
        `[process-knowledge-source] processed sourceIdPrefix=${prefix(source_id)} chunkCount=${chunks.length}`,
      );

      return json({
        source_id,
        mode,
        source_type: sourceType,
        extracted_text_length: text.length,
        chunk_count: chunks.length,
        estimated_token_count: totalTokens,
        source_status: "draft",
        embeddings: "pending",
        message:
          "Chunks created without embeddings. Run a future embedding pass to activate the source.",
      });
    } catch (e) {
      // Map KbError to its safe code; everything else is a generic failure.
      const code = e instanceof KbError ? e.code : "processing_failed";
      const status = e instanceof KbError ? e.httpStatus : 500;
      await admin
        .from("ai_knowledge_sources")
        .update({ status: "failed", error_message: code })
        .eq("id", source_id);
      console.error(
        `[process-knowledge-source] failed sourceIdPrefix=${prefix(source_id)} code=${code}`,
      );
      return json({ error: "Errore processing", error_code: code, source_status: "failed" }, status);
    }
  } catch (e) {
    // Truncated message only (consistent with the rest of the file) — never the
    // full error object / stack.
    console.error(
      `[process-knowledge-source] unhandled: ${String((e as Error)?.message ?? e).slice(0, 120)}`,
    );
    return json({ error: "Errore interno" }, 500);
  }
});
