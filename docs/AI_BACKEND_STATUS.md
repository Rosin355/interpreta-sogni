# AI Backend Status

> Companion to [`PROJECT_STATUS.md`](./PROJECT_STATUS.md). Keep < 300 lines.
> Server-side AI only — no API keys ever ship to iOS or the browser.

## Provider Strategy

| Feature | Provider | Status |
|---|---|---|
| `interpret-dream` (text) | Anthropic / OpenAI primary, Lovable AI Gateway fallback | **working** |
| `suggest-tags` | Claude / OpenAI / Lovable fallback | **working** |
| `generate-dream-image` | Lovable AI Gateway (Gemini 2.5 Flash) | **working** (web) |
| `chat-with-alchemist` | Claude / OpenAI | **working** (basic) |
| `audio-reflection` (TTS) | ElevenLabs (Jessica voice clone) | working for `text-to-speech-elevenlabs`; iOS UI **planned** |
| Knowledge Base embeddings | OpenAI `text-embedding-3-small` | **working** (admin-triggered, not deployed) |
| `search-knowledge` (KB semantic retrieval) | OpenAI query embedding + pgvector RPC | **working** (deployed) |
| KB retrieval into `interpret-dream` | OpenAI query embedding + RPC, tester-gated | **working** (not deployed) |
| KB retrieval into `chat-with-alchemist` | server-side composition | **planned** |

## Supabase Edge Functions

**Existing** (`supabase/functions/`):

- `interpret-dream` (Lovable AI / Gemini; accepts both `dream_id` (iOS snake_case) and `dreamId` (web camelCase), normalized internally → `400 missing_dream_id` if neither; **tester-gated** KB retrieval — OpenAI query embedding + `match_knowledge_chunks`, fail-open, additive `kb_*` response metadata — via `_shared/knowledge-retrieval.ts`; see [details](./interpret-dream-kb-retrieval-v1.md))
- `interpret-dream-with-astrology`
- `chat-with-alchemist`
- `suggest-tags`
- `generate-dream-image`
- `calculate-natal-chart`
- `check-astrological-transits`
- `transcribe-audio`
- `speech-to-text-elevenlabs`
- `text-to-speech-elevenlabs`
- `ingest-knowledge-source` (manual text **and** `source_type='pdf'` + `storage_path` metadata; no PDF parsing here)
- `process-knowledge-source` (text **and** PDF chunking → `embedding=null`, source stays `draft`; PDF via `unpdf` text-layer extraction, no OCR, ≤20MB; embeddings still in a later pass; triggerable from admin UI "Processa fonte" — dry_run + process)
- `manage-knowledge-source` (admin status transitions + protected delete: `activate` / `move_to_draft` / `archive` / `restore_draft` / `delete_permanently`; `activate` enforces server-side readiness — ≥1 chunk, all embeddings present, not archived, no error — else `409 source_not_ready_for_activation`; deletes chunks then source row on delete; no embeddings, no AI)
- `embed-knowledge-source` (OpenAI `text-embedding-3-small`, 1536 dims; batches pending chunks, promotes source to `active`; dry_run = zero provider calls; usage_ledger `embed_knowledge_source`; admin-triggered — see [details](./admin-knowledge-embed-v1.md))
- `search-knowledge` (OpenAI query embedding + `public.match_knowledge_chunks` pgvector RPC over active-source chunks; dry_run = zero provider calls; usage_ledger `search_knowledge` + retrieval log; any authenticated user; does NOT touch interpret-dream — see [details](./admin-knowledge-search-v1.md))
- `approve-professional`
- `send-email-notification` / `send-contact-email` / `send-dream-diary`
- `send-push-notifications`
- `request-password-reset` / `verify-reset-token`

**Planned**:
- `astrology-insight` (KB-grounded astrology readings)
- `get-user-entitlements` (RevenueCat-backed)
- `revenuecat-webhook` (subscription state sync)

## Supabase Tables (AI / KB-relevant)

- `dreams` — owns persisted AI fields (`interpretation`, `interpretation_summary`, `ai_symbols`, `ai_reflection_questions`, `alchemical_phase`)
- `usage_ledger` — one row per AI call (`feature`, `user_id`, `metadata`, `rolled_back`)
- `ai_knowledge_sources` — curated sources (admin-managed)
- `ai_knowledge_chunks` — chunked text + embeddings (populated by `process-knowledge-source` once built)
- `ai_knowledge_retrieval_logs` — per-query retrieval audit
- `error_logs` — mapped Edge Function errors
- *(planned)* `user_entitlements`, `entitlement_events` — RevenueCat layer

## Secrets / Env Vars (names only)

Configured in Supabase Edge Functions secrets:

- `AI_PROVIDER`
- `AI_PROVIDER_TEST_OVERRIDE`
- `AI_PROVIDER_TEST_USER_IDS`
- `OPENAI_API_KEY` / `OPENAI_MODEL`
- `EMBEDDING_MODEL` *(optional, KB embeddings; default `text-embedding-3-small`, 1536 dims)*
- `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`
- `LOVABLE_API_KEY`
- `ELEVENLABS_API_KEY`
- `RESEND_API_KEY`
- `FREE_ASTROLOGY_API_KEY` / `RAPIDAPI_KEY`
- `WONDERPUSH_APPLICATION_ID` / `WONDERPUSH_ACCESS_TOKEN`
- `KB_ADMIN_USER_IDS` *(optional, comma-separated UUID allowlist for KB ingest)*
- `AI_KB_RETRIEVAL_ENABLED` *(optional, `"true"`/`"false"`; master switch for KB retrieval in `interpret-dream`, default off)*
- `AI_KB_TEST_USER_IDS` *(optional, CSV UUID allowlist for KB retrieval; falls back to `AI_PROVIDER_TEST_USER_IDS`)*

**Later**:

- RevenueCat secrets (webhook signing + API key)
- Additional ElevenLabs voice IDs if expanded

## Current AI Safety Rules

1. **No keys in iOS or browser.** All providers called server-side from Edge Functions.
2. **No raw prompts or dream content in logs.** Use ID prefixes only (e.g. `userIdPrefix=abcd1234`).
3. **`auth.uid()` ownership** enforced via RLS for every per-user table.
4. **`usage_ledger` tracking** for every AI call; `rolled_back=true` if the call failed post-charge.
5. **Manual AI trigger only.** No automatic re-interpretation after edits — surface a stale-AI prompt instead.
6. **JWT validation in code** for every Edge Function (`verify_jwt = false` in toml + `supabase.auth.getUser()` in handler).
7. **Admin-only writes** to KB tables go through `public.is_admin(auth.uid())` plus optional `KB_ADMIN_USER_IDS` allowlist.
