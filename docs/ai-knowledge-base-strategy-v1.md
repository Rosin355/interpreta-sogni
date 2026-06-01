# AI Knowledge Base — Strategy v1

Documento di alto livello sullo stato della Knowledge Base AI di Dream
Alchemist.

## Tabelle

- `public.ai_knowledge_sources` — sorgenti (manual_text, note, markdown, txt)
- `public.ai_knowledge_chunks` — chunk vettorializzati delle sorgenti
- `public.ai_knowledge_retrieval_logs` — log retrieval per feature/utente

RLS:
- lettura sorgenti `active` → authenticated
- lettura chunk legati a sorgenti `active` → authenticated
- nessuna policy di INSERT/UPDATE/DELETE lato client: scritture solo via edge
  function admin.

## Fase 1 — Schema (DONE)

Migration: `docs/supabase-ai-knowledge-base-migration.sql`.

## Fase 2 — RLS conservativa (DONE)

Solo SELECT lato client, su contenuti attivi.

## Fase 3 — Admin ingest (DONE, manuale)

Edge function: `supabase/functions/ingest-knowledge-source/index.ts`
- Auth: JWT + `is_admin` RPC (fallback env `KB_ADMIN_USER_IDS`)
- Insert / update di sorgenti manuali
- Nessun AI call, nessun embedding, nessun chunk
- Vedi `docs/admin-knowledge-ingest-v1.md`

## Fase 4 — Processing (TODO)

Edge function `process-knowledge-source` (non ancora implementata):
- chunk del `raw_text` (token-based, overlap controllato)
- embedding via provider scelto
- insert in `ai_knowledge_chunks`
- aggiornamento `processed_at` e `status = 'active'`
- gestione reprocessing: cancellazione chunk vecchi

## Fase 5 — Retrieval (TODO)

Edge function `retrieve-knowledge` con embedding query + top-k cosine,
log in `ai_knowledge_retrieval_logs`.

## Note di sicurezza

- Mai usare service role lato client.
- Mai incollare nella KB sogni privati di utenti.
- Mai loggare `raw_text` o JWT.
