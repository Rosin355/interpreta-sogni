# Web / Admin Tasks & Status

> Companion to [`PROJECT_STATUS.md`](./PROJECT_STATUS.md). Keep < 300 lines.

## Current Web / Admin Status

Admin console operational (`/admin`, `/admin/knowledge-base`, audio admin,
errors, attribution, professional approvals). KB ingestion path is in
place from UI → Edge Function → DB. Chunking is built for both text and
**PDF** sources (`process-knowledge-source`, no embeddings yet) and can be
triggered per-source from the admin UI ("Processa fonte"). Embeddings /
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
- [x] Dream draft autosave resilience — local + cloud, restore dialog,
      mobile close handlers ([`dream-draft-autosave-v1.md`](./dream-draft-autosave-v1.md))

## Current TODOs

- [ ] Run / confirm KB migration in Supabase (verify the 3 tables + RLS)
- [ ] Run `docs/supabase-ai-knowledge-status-archived-migration.sql` in Supabase
      (widens `ai_knowledge_sources.status` CHECK to allow `archived`; idempotent,
      non-destructive). Needed for the archive/restore flow to persist.
- [ ] Deploy `ingest-knowledge-source` if not already deployed
  - `npx supabase functions deploy ingest-knowledge-source`
- [ ] Deploy `process-knowledge-source` (text + PDF chunking, no embeddings yet)
  - `npx supabase functions deploy process-knowledge-source`
  - prima deploy: verifica che `unpdf@1.6.2` si risolva nel runtime edge
- [ ] Deploy `embed-knowledge-source` (OpenAI embeddings, promotes `active`)
  - `npx supabase functions deploy embed-knowledge-source`
  - prerequisito: secret `OPENAI_API_KEY` configurato (opz. `EMBEDDING_MODEL`)
- [ ] Run `docs/supabase-match-knowledge-chunks-migration.sql` in Supabase
      (crea la RPC pgvector `match_knowledge_chunks`; idempotente, non-distruttiva)
- [ ] Deploy `search-knowledge` (KB semantic retrieval) — DOPO la RPC sopra
  - `npx supabase functions deploy search-knowledge`
  - prerequisito: secret `OPENAI_API_KEY` (opz. `EMBEDDING_MODEL`)
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
  - [x] Admin UI: menu "Azioni" per riga (`KnowledgeSourceActions`) — dettagli,
        modifica, processa, archivia/ripristina, elimina (protetta) — admin-only,
        nessun JWT esposto, tabella responsive (overflow-x-auto)
  - [x] `manage-knowledge-source` Edge Function: archive / restore_draft /
        delete_permanently (chunk cancellati esplicitamente; nessun embedding)
  - [x] `embed-knowledge-source` Edge Function: embedding OpenAI
        (`text-embedding-3-small`, 1536) dei chunk `embedding IS NULL` a batch,
        promozione `active`; dry_run = zero chiamate provider; usage_ledger
        `embed_knowledge_source` — vedi [`admin-knowledge-embed-v1.md`](./admin-knowledge-embed-v1.md)
  - [x] Admin UI: azione "Genera embeddings" (`KnowledgeEmbedDialog`,
        dry_run → conferma → batch successivo)
  - [x] Gestione stato sicura nel dialog Modifica: selettore `draft`/`active`
        (processing/failed read-only, archived via azioni dedicate); transizione
        via `manage-knowledge-source` (`activate` / `move_to_draft`) con readiness
        check server-side (`activate` → `409 source_not_ready_for_activation` se
        embedding mancanti); content change → ritorno a `draft`, niente reattivazione
  - [x] `search-knowledge` Edge Function: retrieval semantico (embedding query
        OpenAI + RPC pgvector `match_knowledge_chunks` su fonti `active`); dry_run
        = zero chiamate provider; usage_ledger `search_knowledge` + retrieval log;
        admin UI "Test ricerca" (`KnowledgeSearchTestDialog`) — vedi
        [`admin-knowledge-search-v1.md`](./admin-knowledge-search-v1.md).
        **interpret-dream NON toccato**.

## Later TODOs

- [ ] Markdown / TXT upload (stesso pattern del PDF)
- [x] Wire retrieval into `interpret-dream` — tester-gated, fail-open
      (`_shared/knowledge-retrieval.ts`; env `AI_KB_RETRIEVAL_ENABLED` +
      `AI_KB_TEST_USER_IDS`; match_count 3 / threshold 0.40; additive `kb_*`
      response metadata, no iOS break) — vedi
      [`interpret-dream-kb-retrieval-v1.md`](./interpret-dream-kb-retrieval-v1.md).
      **Da deployare**: `npx supabase functions deploy interpret-dream`.
- [ ] Wire retrieval into `chat-with-alchemist`
- [~] Celeste astrology backend per [`astrologer-api-integration-plan-v1.md`](./astrologer-api-integration-plan-v1.md)
      — preserves current Celeste UI; builds on existing Astrologer/RapidAPI; no API keys in iOS:
  - [x] Phase 1: read-only `get-astrology-profile` over `profiles` (Big Three / Planets /
        profile completion; no provider call) — vedi [`astrology-profile-endpoint-v1.md`](./astrology-profile-endpoint-v1.md). **Da deployare.**
  - [ ] Phase 2: `refresh-astrology-profile` (Astrologer call + usage_ledger + cache)
  - [ ] Phase 3: `get-current-transits` ("Cielo del momento")
- [ ] `astrology-insight` Edge Function with KB-grounded context
- [ ] Community moderation tools (report queue, soft-hide)


## Files / Areas to Inspect

- `src/pages/AdminDashboard.tsx` — admin tab layout
- `src/pages/AdminKnowledgeBase.tsx` — KB admin page
- `src/components/admin/KnowledgeSourceForm.tsx` — create / edit form (testo)
- `src/components/admin/KnowledgePdfUploadForm.tsx` — upload PDF al bucket + chiamata ingest
- `src/components/admin/KnowledgeSourcesList.tsx` — list of sources (responsive, colonna Azioni)
- `src/components/admin/KnowledgeSourceActions.tsx` — menu Azioni per riga (CRUD) + dialog
- `src/components/admin/KnowledgeSourceEditForm.tsx` — form Modifica (ingest update mode)
- `src/components/admin/KnowledgeProcessDialog.tsx` — dialog "Processa fonte" (dry_run + process)
- `src/components/admin/KnowledgeEmbedDialog.tsx` — dialog "Genera embeddings" (dry_run + batch)
- `src/components/admin/KnowledgeSearchTestDialog.tsx` — dialog "Test ricerca" (dry_run + search)
- `supabase/functions/embed-knowledge-source/index.ts` — OpenAI embeddings + promozione `active`
- `supabase/functions/search-knowledge/index.ts` — retrieval semantico (embedding query + RPC)
- `docs/supabase-match-knowledge-chunks-migration.sql` — RPC pgvector (da eseguire manualmente)
- `supabase/functions/manage-knowledge-source/index.ts` — archive / restore / delete
- `supabase/functions/ingest-knowledge-source/index.ts` — server-side ingest
- `supabase/migrations/` — search for `ai_knowledge_sources` to find the KB migration
- `docs/admin-knowledge-base-v1.md` — UI details
- `docs/admin-knowledge-ingest-v1.md` — Edge Function details + manual test
- `docs/ai-knowledge-base-strategy-v1.md` — high-level strategy
