# interpret-dream — KB retrieval (tester-gated) v1

Wires curated Knowledge Base retrieval into `interpret-dream` as an **optional,
tester-gated, fail-open** prompt enrichment. The interpretation provider itself
is unchanged (Lovable AI / Gemini); only OpenAI **query embeddings** are used for
retrieval.

Shared helper: [`supabase/functions/_shared/knowledge-retrieval.ts`](../supabase/functions/_shared/knowledge-retrieval.ts).

## Flow

1. `interpret-dream` authenticates the user and loads the dream (unchanged).
2. If `isKbRetrievalEnabledForUser(user.id)` is true (see gating), it builds a
   query from `title + tags + content` (capped 2000 chars, **never logged**) and
   calls `retrieveKnowledgeContext(...)`.
3. The helper embeds the query with OpenAI and calls the
   `public.match_knowledge_chunks` RPC (active sources only).
4. Up to 3 chunks (threshold ≥ 0.40) are formatted into a clearly-separated
   prompt section and prepended to the existing system prompt.
5. The Lovable AI interpretation proceeds as before. Response gains additive
   metadata (`kb_context_used`, `kb_result_count`, `kb_sources`).

## Tester gating

KB retrieval is **OFF by default**. It runs only when BOTH:

- `AI_KB_RETRIEVAL_ENABLED = "true"`, AND
- the user id is listed in `AI_KB_TEST_USER_IDS` (CSV of UUIDs). If that var is
  empty/unset, the helper falls back to `AI_PROVIDER_TEST_USER_IDS`.

If the tester list is empty, retrieval stays disabled (safe default).

### Env vars

| Name | Required | Purpose |
|------|----------|---------|
| `AI_KB_RETRIEVAL_ENABLED` | to enable | master switch, `"true"`/`"false"` (default off) |
| `AI_KB_TEST_USER_IDS` | optional | CSV of tester UUIDs (preferred allowlist) |
| `AI_PROVIDER_TEST_USER_IDS` | optional | fallback allowlist if the above is unset |
| `OPENAI_API_KEY` | for retrieval | query embedding (already configured) |
| `EMBEDDING_MODEL` | optional | default `text-embedding-3-small` |

## Retrieval parameters (first rollout)

- `match_count = 3`
- `match_threshold = 0.40`
- `domain = null` (search across all active sources)
- `language = "it"`

## Prompt section

The KB context is **internal only**: it guides the interpretation but must NEVER
surface in the user-facing text as citations, brackets, source names, chunk
numbers or any Knowledge Base mechanics. Chunks are therefore labeled
"Fonte curatoriale A/B/C" (NOT `[1]`/`[2]`, which models tend to echo) and the
instruction block explicitly forbids citing.

When chunks are found, this block is inserted into the system prompt:

```
CONTESTO CURATORIALE (uso interno — NON citare)
Materiale curatoriale selezionato per affinità simbolica. Istruzioni vincolanti:
- usalo SILENZIOSAMENTE come guida simbolica/curatoriale, mai come verità assoluta;
- dai SEMPRE priorità al sogno dell'utente; se non è pertinente, ignoralo;
- NON citare la Knowledge Base né queste fonti;
- NON inserire riferimenti tra parentesi quadre come [1], [2], [Fonte A];
- NON menzionare fonti interne, numeri di chunk, ID, retrieval, embedding o
  meccanismi della Knowledge Base;
- integra eventuali spunti nel discorso in modo naturale, senza note o citazioni.

Fonte curatoriale A — dominio: <domain> (affinità ~0.84)
<chunk content>
...
```

No source IDs, embeddings or retrieval internals are exposed to the model.

### Post-processing safety net

As a belt-and-braces measure, `stripKbCitationMarkers(text)` is applied to the
interpretation (and the TTS summary) before saving/returning. It conservatively
removes only isolated bracketed citation markers — `[1]`, `[ 2 ]`, `[1, 3]` and
`[Fonte A]` / `[Riferimento …]` — then tidies leftover spacing/punctuation. It
never removes ordinary dream text. This runs regardless of whether KB retrieval
was used, so stray brackets can never reach the user.

## Output style & phase consistency

The interpretation prompt enforces an app-native voice (not generic chatbot):

- **Language**: written in the user `locale` (request body). If `locale` starts
  with `it` (default), Italian only. Emotion/mood words stay in that language —
  e.g. "gioia", never "Joy". A conservative post-process
  (`localizeItalianMoodWords`, Italian locale only) repairs stray English mood
  words; it preserves Markdown bold and never alters other text.
- **Tone**: intimate, poetic, symbolic, warm; avoids clichés ("Caro sognatore",
  "è estremamente significativo", …).
- **Bold emphasis is allowed but only for a few symbolic keywords** (e.g.
  `**Rubedo**`, `**Nigredo**`, `**Albedo**`, `**Re**`, `**Regina**`,
  `**unione degli opposti**`, `**luce dorata**`, `**Sé**`), used sparingly —
  never whole sentences, no Markdown headings, no bullet lists. **Valid bold
  markers are preserved** (iOS renders them); cleanup never strips `**…**`.
- **No citations / source markers / "Fonte curatoriale"** in user-facing text.

### alchemical_phase — single source of truth

The saved `public.dreams.alchemical_phase` is taken from the phase the AI
**declares** in the closing "✦ Alchimia" section
(`extractPhaseFromInterpretation`), so it always matches the text the user reads.
Only when the text declares no phase do we fall back to the heuristic
`calculateDreamPhase()`. This fixes the prior mismatch (text said Rubedo while the
DB saved nigredo). The column name and the iOS contract are unchanged.

## Response metadata (additive, non-breaking)

`interpret-dream` adds:

```jsonc
{
  "interpretation": "...",
  "interpretation_summary": "...",
  "alchemical_phase": "...",
  "kb_context_used": true,         // false when disabled / no results / failure
  "kb_result_count": 2,
  "kb_sources": [                   // titles + domains only, never content
    { "title": "Re e Regina Alchimia", "domain": "alchemy" }
  ]
}
```

Older iOS clients ignore unknown fields → **no breaking contract change**.

## Failure fallback (fail-open)

KB retrieval **never blocks interpretation**. On any of:

- `OPENAI_API_KEY` missing
- embedding request failure / wrong dimension
- `match_knowledge_chunks` RPC error
- no active sources / zero results

the helper returns `{ chunks: [], failedSoftly: true }`, the function continues
the normal flow, and the response carries `kb_context_used = false`. A safe
warning code is logged (`missing_openai_key` / `embed_failed` / `rpc_failed`),
never the query or chunk content.

## Usage ledger & retrieval logs

On a successful OpenAI embedding request (fail-open inserts):

- `usage_ledger`: `feature = interpret_dream_kb_retrieval`, metadata
  `{ provider:"openai", model, result_count, match_count, match_threshold,
  domains, language }`.
- `ai_knowledge_retrieval_logs`: `feature = interpret_dream_kb_retrieval`,
  `query = NULL`, `selected_chunk_ids`, metadata with `similarities` + counts.

Never stored: dream text, query text, chunk content, embeddings, JWT, API key.

## Safe logs

```
[kb-retrieval] completed userIdPrefix=… resultCount=… threshold=… domain=…
[kb-retrieval] skipped code=missing_openai_key userIdPrefix=…
[kb-retrieval] embed_failed userIdPrefix=…
[kb-retrieval] rpc_failed userIdPrefix=… pg=…
```

Never logged: dream content, chunk content, query text, embeddings, JWT, API key,
raw provider bodies.

## Deployment / test steps

1. Ensure `public.match_knowledge_chunks` exists and ≥1 source is `active`
   (e.g. "Re e Regina Alchimia").
2. Set secrets: `AI_KB_RETRIEVAL_ENABLED=true`, `AI_KB_TEST_USER_IDS=<tester uuid>`
   (`OPENAI_API_KEY` already configured).
3. Deploy: `npx supabase functions deploy interpret-dream`.
4. As a tester, interpret a dream → response should include
   `kb_context_used` and `kb_sources`. Non-testers see `kb_context_used=false`.
5. Verify ledger / logs:
   ```sql
   select feature, recorded_at, metadata from public.usage_ledger
   where feature = 'interpret_dream_kb_retrieval' order by recorded_at desc limit 5;

   select feature, created_at, selected_chunk_ids, metadata
   from public.ai_knowledge_retrieval_logs
   where feature = 'interpret_dream_kb_retrieval' order by created_at desc limit 5;
   ```

## Not changed

- iOS (no contract break; new fields are additive and optional).
- Lovable image generation, RevenueCat.
- The interpretation provider (still Lovable AI / Gemini) and the existing
  `dream_knowledge_base` symbol lookup.

---

_See also: [admin-knowledge-search-v1](./admin-knowledge-search-v1.md) · [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md) · [ai-edge-functions-contract-v1](./ai-edge-functions-contract-v1.md)_
