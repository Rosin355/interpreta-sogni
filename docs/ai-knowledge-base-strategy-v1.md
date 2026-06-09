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
- Insert / update di sorgenti (manuali e PDF metadata-only)
- Nessun AI call, nessun embedding, nessun chunk
- Vedi `docs/admin-knowledge-ingest-v1.md`

## Large Document / PDF Ingestion

Due percorsi di ingest coesistono nella KB:

| Path | `source_type` | `raw_text` | `storage_path` |
|------|---------------|-----------|----------------|
| Testo manuale | `manual_text` / `note` / `markdown` / `txt` | richiesto (100–200k char) | null |
| File upload | `pdf` | null | richiesto |

Flow PDF:
1. Admin carica il file nel bucket privato Supabase Storage `knowledge-sources`
   (vedi `docs/supabase-knowledge-storage-migration.sql`).
2. Admin chiama `ingest-knowledge-source` con `source_type='pdf'` e
   `storage_path`. La riga viene creata con `raw_text = NULL`,
   `status = 'draft'`.
3. Più avanti `process-knowledge-source` scarica il file lato server,
   estrae testo, fa cleanup + chunking, ed eventualmente genera embedding.

Ciclo di vita PDF: `draft` → `processing` → `active` / `failed`.

**Regola**: i PDF grandi NON vanno incollati nel form manuale. Il limite
del form è 200k caratteri ed è pensato per note curate brevi.


## Fase 4 — Processing + Embedding (DONE)

- `process-knowledge-source`: chunk del testo/PDF in `ai_knowledge_chunks` con
  `embedding = NULL` (nessun embedding, fonte resta `draft`). Vedi
  [`admin-knowledge-process-v1.md`](./admin-knowledge-process-v1.md).
- `embed-knowledge-source`: embedding OpenAI (`text-embedding-3-small`, 1536)
  dei chunk pendenti a batch + promozione `status = 'active'`. Vedi
  [`admin-knowledge-embed-v1.md`](./admin-knowledge-embed-v1.md).

## Fase 5 — Retrieval (TODO)

Edge function `retrieve-knowledge` con embedding query + top-k cosine,
log in `ai_knowledge_retrieval_logs`.

## Note di sicurezza

- Mai usare service role lato client.
- Mai incollare nella KB sogni privati di utenti.
- Mai loggare `raw_text` o JWT.


---

_See also: [PROJECT_STATUS](./PROJECT_STATUS.md) · [WEB_TASKS](./WEB_TASKS.md) · [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md)_
