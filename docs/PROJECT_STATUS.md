# DreamAlchemist — Project Status

> **Last Updated:** 2026-06-09 (KB embeddings + safe draft/active status controls in edit dialog)
> Update this file after every significant implementation pass.

## Current Milestone

**Pre-RevenueCat AI + Knowledge Base foundation.**
Building the curated KB and admin ingestion before enabling RAG-powered
interpretations and the subscription/entitlement layer.

## Architecture Summary

- **iOS app** — dream journal + user-facing mobile experience (SwiftData local-first, Supabase sync).
- **Web / admin** — admin console, content management, Knowledge Base, future public web flows (React + Vite + shadcn).
- **Supabase** — Auth, Postgres + RLS, Storage, Edge Functions, cost control.
- **AI providers** — server-side only, behind Edge Functions (Anthropic / OpenAI / Lovable AI Gateway / ElevenLabs).
- **RevenueCat** — future subscription / entitlement layer (not yet wired).

## Completed Major Milestones

- [x] Supabase Auth in iOS
- [x] Local-first dream save (SwiftData)
- [x] Cloud sync (dreams ⇄ Supabase)
- [x] Retry / pending sync queue
- [x] `client_local_id` idempotency
- [x] Remote cache for already-synced dreams
- [x] Unified dream card UI
- [x] AI `interpret-dream` Edge Function
- [x] Anthropic tester override (`AI_PROVIDER_TEST_OVERRIDE` + `AI_PROVIDER_TEST_USER_IDS`)
- [x] Persisted AI result fields on `dreams` (interpretation, symbols, reflection questions, summary)
- [x] `usage_ledger` table for AI usage tracking
- [x] Edit / delete with soft delete (`dreams.deleted_at`)
- [x] AI Provider Strategy (doc)
- [x] Knowledge Base Strategy (`docs/ai-knowledge-base-strategy-v1.md`)
- [x] KB schema migration (`ai_knowledge_sources`, `ai_knowledge_chunks`, `ai_knowledge_retrieval_logs`)
- [x] `ingest-knowledge-source` Edge Function (admin-only, JWT + `public.is_admin` check, optional `KB_ADMIN_USER_IDS` fallback)
- [x] Minimal admin Knowledge Base UI (list + create form) at `/admin/knowledge-base`
- [x] Bucket Storage privato `knowledge-sources` + policy RLS admin-only
- [x] Admin PDF upload UI (`KnowledgePdfUploadForm`, registra source come `pdf` draft)
- [x] `process-knowledge-source`: chunking testo **e PDF** (download Storage + `unpdf`, no OCR, ≤20MB), chunk con `embedding=NULL`, sorgente resta `draft`
- [x] Admin UI "Processa fonte" (dry_run → conferma → process, nessun embedding)
- [x] Admin KB CRUD per riga (`KnowledgeSourceActions`): dettagli, modifica (ingest update), archivia/ripristina, elimina protetta; nuova Edge Function `manage-knowledge-source`
- [x] `embed-knowledge-source`: embedding OpenAI (`text-embedding-3-small`, 1536) dei chunk `embedding IS NULL` a batch, promozione `active`; dry_run a zero chiamate provider; usage_ledger `embed_knowledge_source`; admin UI "Genera embeddings" (`KnowledgeEmbedDialog`)
- [x] Controlli stato sicuri nel dialog Modifica: selettore `draft`/`active`, transizioni via `manage-knowledge-source` (`activate` con readiness check server-side / `move_to_draft`); content change → ritorno a `draft` senza reattivazione

## Active Workstream

- Knowledge Base / RAG foundation
- Admin ingestion e end-to-end manual testing (incl. PDF: dry_run + process)
- Prossimo: `search-knowledge` (pgvector similarity) → retrieval wired into `interpret-dream` e `chat-with-alchemist`

## Golden Rules

1. **No API keys in iOS.** iOS only ever talks to Supabase.
2. **No raw dream content in logs** (client or Edge Functions). Use prefixes / IDs only.
3. **No automatic AI calls after edits.** The user must manually trigger interpretation.
4. **Every AI call must be tracked in `usage_ledger`.**
5. **Server-side AI only.** All providers are called from Edge Functions.
6. **Keep status docs under 300 lines.** Move detail to specialized docs.

## Read Next

- [`docs/CLAUDE_CONTEXT_GUIDE.md`](./CLAUDE_CONTEXT_GUIDE.md) — read-this-first guide for new Claude Code sessions
- [`docs/IOS_TASKS.md`](./IOS_TASKS.md) — iOS app status and TODOs
- [`docs/WEB_TASKS.md`](./WEB_TASKS.md) — web / admin status and TODOs
- [`docs/AI_BACKEND_STATUS.md`](./AI_BACKEND_STATUS.md) — AI providers, Edge Functions, secrets, safety
