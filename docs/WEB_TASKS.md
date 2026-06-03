# Web / Admin Tasks & Status

> Companion to [`PROJECT_STATUS.md`](./PROJECT_STATUS.md). Keep < 300 lines.

## Current Web / Admin Status

Admin console operational (`/admin`, `/admin/knowledge-base`, audio admin,
errors, attribution, professional approvals). KB ingestion path is in
place from UI → Edge Function → DB. Chunking is built for both text and
**PDF** sources (`process-knowledge-source`, no embeddings yet). Embeddings /
retrieval are still to be built.

## Completed

- [x] AI Knowledge Base Strategy ([`ai-knowledge-base-strategy-v1.md`](./ai-knowledge-base-strategy-v1.md))
- [x] KB SQL migration (`ai_knowledge_sources`, `ai_knowledge_chunks`, `ai_knowledge_retrieval_logs` with RLS)
- [x] `ingest-knowledge-source` Edge Function ([details](./admin-knowledge-ingest-v1.md))
- [x] Admin auth via `public.is_admin(_user_id)` SECURITY DEFINER helper
- [x] Optional `KB_ADMIN_USER_IDS` env fallback for ingest
- [x] Minimal admin Knowledge Base UI ([details](./admin-knowledge-base-v1.md))
  - List of sources with status / domain / tags
  - Create / edit form (title, domain, language, tags, raw text, status)
- [x] Manual end-to-end test guide for `ingest-knowledge-source`

## Current TODOs

- [ ] Run / confirm KB migration in Supabase (verify the 3 tables + RLS)
- [ ] Deploy `ingest-knowledge-source` if not already deployed
  - `npx supabase functions deploy ingest-knowledge-source`
- [ ] Deploy `process-knowledge-source` (text + PDF chunking, no embeddings yet)
  - `npx supabase functions deploy process-knowledge-source`
  - prima deploy: verifica che `unpdf@1.6.2` si risolva nel runtime edge
- [ ] Run the manual end-to-end test from `admin-knowledge-ingest-v1.md`
- [ ] Run dry_run + process tests from `admin-knowledge-process-v1.md`
- [ ] Confirm minimal admin KB UI loads at `/admin/knowledge-base` for an admin user

## In Progress (scaffolding)

- [x] PDF / large-document ingest path:
  - [x] `ingest-knowledge-source` accetta `source_type='pdf'` + `storage_path`
  - [x] Bucket privato Storage `knowledge-sources` creato (migration)
  - [x] Policy RLS admin-only su `storage.objects` (read/insert/update/delete)
  - [x] Admin UI: form upload PDF (`KnowledgePdfUploadForm`) con tab nel dialog "Nuova fonte"
  - [x] `process-knowledge-source`: branch download da Storage + estrazione testo
        PDF (`unpdf`, no OCR, max 20 MB, dry_run + process) — embedding esclusi

## Later TODOs

- [ ] Markdown / TXT upload (stesso pattern del PDF)
- [ ] `embed-knowledge-source` Edge Function (OpenAI `text-embedding-3-small`, promotes source to `active`)
- [ ] `search-knowledge` Edge Function (pgvector similarity)
- [ ] Wire retrieval into `interpret-dream`
- [ ] Wire retrieval into `chat-with-alchemist`
- [ ] `astrology-insight` Edge Function with KB-grounded context
- [ ] Community moderation tools (report queue, soft-hide)


## Files / Areas to Inspect

- `src/pages/AdminDashboard.tsx` — admin tab layout
- `src/pages/AdminKnowledgeBase.tsx` — KB admin page
- `src/components/admin/KnowledgeSourceForm.tsx` — create / edit form (testo)
- `src/components/admin/KnowledgePdfUploadForm.tsx` — upload PDF al bucket + chiamata ingest
- `src/components/admin/KnowledgeSourcesList.tsx` — list of sources
- `supabase/functions/ingest-knowledge-source/index.ts` — server-side ingest
- `supabase/migrations/` — search for `ai_knowledge_sources` to find the KB migration
- `docs/admin-knowledge-base-v1.md` — UI details
- `docs/admin-knowledge-ingest-v1.md` — Edge Function details + manual test
- `docs/ai-knowledge-base-strategy-v1.md` — high-level strategy
