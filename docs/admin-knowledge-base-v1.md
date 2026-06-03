# Admin Knowledge Base UI — v1

Pagina admin per gestire le fonti curatoriali della Knowledge Base AI.

## Route

`/admin/knowledge-base` — protetta da `is_admin` RPC (stesso pattern di `AdminDashboard`).
Accessibile dal pulsante "Knowledge Base AI" nella Dashboard Amministratore.

## Funzionalità

### Lista fonti
- Query diretta `supabase.from('ai_knowledge_sources').select(...)`, ordinata per `updated_at desc`, limite 200.
- Visibilità garantita dalla policy `Admins can view all knowledge sources` (SELECT per `is_admin`).
- Filtri client-side: dominio, status, lingua, ricerca per titolo.
- Empty state: *"Nessuna fonte nella Knowledge Base. Inizia aggiungendo un testo di riferimento."*

### Creazione fonte
- Form in dialog (campi: title, domain, source_type, status, language, author, origin, tags, raw_text).
- Submit via `supabase.functions.invoke('ingest-knowledge-source', { body })` — **mai** insert diretto client-side.
- L'Edge Function valida JWT, verifica `is_admin`, applica zod schema, inserisce con service role.
- Privacy warning visibile nel form: i sogni privati degli utenti **non** vanno copiati nella KB.

## Cosa NON è implementato (intenzionale)

- **Nessuna chiamata AI** (OpenAI / Anthropic / Lovable / ElevenLabs).
- **Nessun chunking**, nessun embedding, nessuna retrieval.
- **Nessun edit / archive / activate dal client** — le RLS UPDATE/DELETE non sono aperte agli admin; richiederanno una Edge Function dedicata o nuove policy.
- **Nessuna delete permanente.**
- **Nessuna modifica iOS / Capacitor.**
- Service role key resta esclusivamente nell'Edge Function.

## Pianificato — Upload PDF / documenti grandi

Form aggiuntivo (non ancora implementato):

- input file (drag & drop) limitato a PDF (e in futuro markdown/txt).
- metadati: title, domain, language, tags, author, origin.
- barra di progresso upload.
- upload diretto al bucket privato Supabase Storage `knowledge-sources`
  (vedi `docs/supabase-knowledge-storage-migration.sql`).
- al termine dell'upload, chiamata a `ingest-knowledge-source` con
  `source_type='pdf'` e `storage_path` (raw_text resta null).
- badge di stato della sorgente (`draft` / `processing` / `active` / `failed`).
- CTA "Processa documento" → invoca `process-knowledge-source` (placeholder
  finché la pipeline di estrazione testo non è pronta).
- "Preview testo estratto" futuro, dopo il processing.

Nota: i sogni privati degli utenti NON vanno caricati in questo bucket.

## Prossimi step previsti

1. Edge Function `process-knowledge-source` per chunking + embedding delle fonti `active`.
2. Edge Function `retrieve-knowledge` per fornire contesto curato ai prompt AI.
3. UI admin per archive / activate / edit (via nuova Edge Function).

## Regola di sicurezza

> La Knowledge Base contiene **solo** materiale curatoriale (testi pubblici, riferimenti
> alchemici/astrologici/simbolici, contenuti app). Non deve mai contenere sogni privati
> degli utenti né dati personali identificabili.


---

_See also: [PROJECT_STATUS](./PROJECT_STATUS.md) · [WEB_TASKS](./WEB_TASKS.md) · [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md)_
