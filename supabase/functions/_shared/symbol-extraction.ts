// Shared symbol extraction for the dream-interpretation edge functions.
//
// Runs ONE dedicated AI call AFTER a successful interpretation and writes the
// result to public.dreams.ai_symbols (jsonb). Best-effort and NON-blocking:
// it never throws, and any failure simply writes no symbols — the interpretation
// text the user reads is never affected. interpret-dream and
// interpret-dream-with-astrology use this identically.

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_SYMBOLS = 8;

export interface DreamSymbol {
  name: string; // 1-2 words naming a SINGLE symbol
  meaning: string; // the explanation
}

const prefix = (id: string) => (id ?? "").slice(0, 8);

/**
 * Parse the model output tolerantly: strip ```json fences and any surrounding
 * prose, then JSON.parse. Returns the parsed value or null.
 */
export function parseSymbolsJson(raw: string): unknown {
  let text = (raw ?? "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  }
  // If wrapped in prose, grab the first [...] span.
  if (!text.startsWith("[")) {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// A "name" must name a single symbol in 1-2 words. Reject descriptive phrases
// like "incidente stradale e famiglia ferita" (the explanation belongs in
// `meaning`): >2 words, or sentence punctuation, is a phrase, not a name.
const isPhraseLikeName = (name: string): boolean => {
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 2 || /[.,;:!?]/.test(name);
};

export interface SymbolValidationStats {
  total: number; // items in the parsed array
  empty: number; // non-object item, or missing/blank name or meaning
  phrase: number; // name rejected as a descriptive phrase (>2 words / punctuation)
  duplicate: number; // duplicate name
}

/**
 * Validate + normalise the parsed model output into at most MAX_SYMBOLS clean
 * {name, meaning}, AND report why items were dropped (for diagnostics). Drops
 * anything missing a name or meaning, phrase-like names, and duplicates. Never
 * throws. The symbol output is identical to validateSymbols().
 */
export function validateSymbolsWithStats(
  parsed: unknown,
): { symbols: DreamSymbol[]; stats: SymbolValidationStats } {
  const stats: SymbolValidationStats = { total: 0, empty: 0, phrase: 0, duplicate: 0 };
  if (!Array.isArray(parsed)) return { symbols: [], stats };
  stats.total = parsed.length;
  const out: DreamSymbol[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (!item || typeof item !== "object") { stats.empty++; continue; }
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const meaning = typeof rec.meaning === "string" ? rec.meaning.trim() : "";
    if (!name || !meaning) { stats.empty++; continue; } // both required
    if (isPhraseLikeName(name)) { stats.phrase++; continue; } // descriptive phrase
    const key = name.toLowerCase();
    if (seen.has(key)) { stats.duplicate++; continue; } // dedupe by name
    seen.add(key);
    out.push({ name, meaning });
    if (out.length >= MAX_SYMBOLS) break;
  }
  return { symbols: out, stats };
}

/** Same as validateSymbolsWithStats but returns only the symbols (unchanged API). */
export function validateSymbols(parsed: unknown): DreamSymbol[] {
  return validateSymbolsWithStats(parsed).symbols;
}

// A short, single-line, truncated sample of MODEL OUTPUT for diagnostics.
// This is the model's JSON reply, never the dream content that was the input.
const sampleOutput = (s: string, n = 140): string =>
  (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/**
 * Extract symbols from the interpretation via one dedicated AI call.
 * Returns a validated, capped list (possibly empty). Never throws.
 */
export async function extractDreamSymbols(opts: {
  lovableApiKey: string;
  dreamContent: string;
  interpretation: string;
  functionName: string;
}): Promise<DreamSymbol[]> {
  const { lovableApiKey, dreamContent, interpretation, functionName } = opts;
  try {
    const systemPrompt =
      "Estrai i simboli onirici principali dal sogno e dalla sua interpretazione. " +
      "Rispondi SOLO con un array JSON valido, senza testo attorno e senza code fence. " +
      'Formato esatto: [{"name":"...","meaning":"..."}]. ' +
      'REGOLE per "name": deve nominare UN SINGOLO simbolo in 1-2 parole ' +
      '(es. "corvo", "acqua nera", "casa"), MAI una frase descrittiva o un evento ' +
      '(NO "incidente stradale e famiglia ferita"). La spiegazione va in "meaning" ' +
      "(1-2 frasi in italiano). Massimo " + MAX_SYMBOLS + " simboli, i più salienti. " +
      "Se non ci sono simboli chiari, rispondi con [].";
    const userPrompt = `SOGNO:\n${dreamContent}\n\nINTERPRETAZIONE:\n${interpretation}`;

    const res = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      await res.text().catch(() => undefined); // drain, never log body
      console.warn(`SYMBOLS_EXTRACT_FAILED function=${functionName} code=${res.status}`);
      return [];
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";

    // Diagnostics: distinguish WHY we may end up with zero symbols.
    const parsed = parseSymbolsJson(raw);
    if (parsed === null) {
      console.warn(`SYMBOLS_PARSE_FAILED function=${functionName} sample=${sampleOutput(raw)}`);
      return [];
    }
    if (!Array.isArray(parsed)) {
      console.warn(`SYMBOLS_NOT_ARRAY function=${functionName} type=${typeof parsed}`);
      return [];
    }
    if (parsed.length === 0) {
      console.warn(`SYMBOLS_EMPTY_FROM_MODEL function=${functionName}`);
      return [];
    }
    const { symbols, stats } = validateSymbolsWithStats(parsed);
    if (symbols.length === 0) {
      console.warn(
        `SYMBOLS_ALL_REJECTED function=${functionName} total=${stats.total} ` +
          `rejEmpty=${stats.empty} rejPhrase=${stats.phrase} rejDuplicate=${stats.duplicate} ` +
          `sample=${sampleOutput(raw)}`,
      );
    }
    return symbols;
  } catch (e) {
    console.warn(
      `SYMBOLS_EXTRACT_ERROR function=${functionName} name=${(e as Error)?.name ?? "Error"}`,
    );
    return [];
  }
}

/**
 * Extract symbols and write them to dreams.ai_symbols. Best-effort and
 * non-throwing: on any failure it logs a greppable marker and leaves ai_symbols
 * untouched. Intended to run in the background (EdgeRuntime.waitUntil) ONLY after
 * a successful interpretation.
 */
export async function captureDreamSymbols(opts: {
  // deno-lint-ignore no-explicit-any
  supabase: any; // service-role or RLS-scoped client with .from().update().eq()
  lovableApiKey: string;
  dreamId: string;
  dreamContent: string;
  interpretation: string;
  functionName: string;
}): Promise<void> {
  try {
    const symbols = await extractDreamSymbols({
      lovableApiKey: opts.lovableApiKey,
      dreamContent: opts.dreamContent,
      interpretation: opts.interpretation,
      functionName: opts.functionName,
    });
    if (symbols.length === 0) {
      console.warn(
        `SYMBOLS_NONE function=${opts.functionName} dreamIdPrefix=${prefix(opts.dreamId)}`,
      );
      return;
    }
    const { error } = await opts.supabase
      .from("dreams")
      .update({ ai_symbols: symbols })
      .eq("id", opts.dreamId);
    if (error) {
      console.warn(
        `SYMBOLS_WRITE_FAILED function=${opts.functionName} pg=${error.code ?? "unknown"}`,
      );
      return;
    }
    console.log(`SYMBOLS_WRITTEN function=${opts.functionName} count=${symbols.length}`);
  } catch (e) {
    console.warn(
      `SYMBOLS_CAPTURE_ERROR function=${opts.functionName} name=${(e as Error)?.name ?? "Error"}`,
    );
  }
}
