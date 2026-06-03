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
| Knowledge Base embeddings | OpenAI `text-embedding-3-small` | **planned** |
| KB retrieval into interpret-dream / chat | server-side composition | **planned** |

## Supabase Edge Functions

**Existing** (`supabase/functions/`):

- `interpret-dream`
- `interpret-dream-with-astrology`
- `chat-with-alchemist`
- `suggest-tags`
- `generate-dream-image`
- `calculate-natal-chart`
- `check-astrological-transits`
- `transcribe-audio`
- `speech-to-text-elevenlabs`
- `text-to-speech-elevenlabs`
- `ingest-knowledge-source`
- `process-knowledge-source` (chunking only, embedding=null, source stays `draft`)
- `approve-professional`
- `send-email-notification` / `send-contact-email` / `send-dream-diary`
- `send-push-notifications`
- `request-password-reset` / `verify-reset-token`

**Planned**:

- `embed-knowledge-source` (OpenAI `text-embedding-3-small`, promotes source to `active`)
- `search-knowledge` (pgvector similarity)
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
- `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`
- `LOVABLE_API_KEY`
- `ELEVENLABS_API_KEY`
- `RESEND_API_KEY`
- `FREE_ASTROLOGY_API_KEY` / `RAPIDAPI_KEY`
- `WONDERPUSH_APPLICATION_ID` / `WONDERPUSH_ACCESS_TOKEN`
- `KB_ADMIN_USER_IDS` *(optional, comma-separated UUID allowlist for KB ingest)*

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
