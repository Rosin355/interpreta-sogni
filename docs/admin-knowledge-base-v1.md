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

## Azioni per fonte (CRUD, v1 implementato)

Ogni riga ha un menu **"Azioni"** (tre puntini, `KnowledgeSourceActions`),
admin-only. La tabella è in un contenitore `overflow-x-auto` (min-width) così
tutte le colonne — Tag, Aggiornato, Azioni — restano visibili e usabili.

Voci del menu:

- **Apri dettagli** — dialog read-only: id (prefix), status, `source_type`,
  `processed_at`, `storage_path` (PDF), conteggio chunk *visibili* (best-effort,
  l'RLS può nascondere i chunk delle fonti non `active`) ed `error_message` se
  la fonte è `failed`. **Mai** `raw_text`/contenuto chunk.
- **Modifica** — dialog con `KnowledgeSourceEditForm` (precompilato): title,
  domain, language, author, origin, tags e `raw_text` (testo) **oppure**
  `storage_path` (PDF) modificabili. Campi read-only/aiuto mostrati nel dialog:
  id (prefix), `status`, `source_type` (+ spiegazione), `processed_at` e
  `error_message`. Salva via `ingest-knowledge-source` in **update mode**
  (`source_id` nel body). Se `raw_text`/`storage_path` cambia, il backend
  riporta la fonte a `draft` e azzera `processed_at`. Toast: *"Fonte aggiornata"*
  / *"Non siamo riusciti ad aggiornare la fonte"*. Disabilitata se archiviata.
- **Processa fonte** — dialog `KnowledgeProcessDialog`: `dry_run` →
  mostra `chunk_count` / `estimated_token_count` / `extracted_text_length` /
  `embeddings: not_generated` → **Conferma processing** (`mode='process'`,
  `embedding = null`, fonte resta `draft`). Nessun embedding, nessuna AI.
- **Archivia** / **Ripristina in bozza** — entrambe con dialog di conferma, via
  `manage-knowledge-source` (`archive` / `restore_draft`). Archivia:
  *"Vuoi archiviare questa fonte? Non sarà usata nei futuri processi finché non
  verrà ripristinata."* → toast *"Fonte archiviata"*. Ripristina:
  *"Ripristinare questa fonte in bozza?"* → toast *"Fonte ripristinata in bozza"*.
  L'archiviazione è **preferita** alla cancellazione; i chunk NON vengono
  eliminati. Le fonti archiviate restano visibili e filtrabili (filtro
  status = `archived`).
- **Elimina definitivamente** — azione protetta (AlertDialog): copy
  *"Questa azione eliminerà definitivamente la fonte e tutti i chunk collegati.
  Non può essere annullata."* e richiede di digitare **ELIMINA**. Chiama
  `manage-knowledge-source` (`delete_permanently`): elimina i chunk e poi la
  riga sorgente. Il file PDF in Storage **non** viene rimosso in questa pass
  (TODO).

Tutte le azioni usano la sessione Supabase autenticata (`functions.invoke`
allega il JWT; nessun JWT esposto a mano) e fanno refresh della lista.

## Cosa NON è implementato (intenzionale)

- **Nessuna chiamata AI** (OpenAI / Anthropic / Lovable / ElevenLabs).
- **Nessun embedding**, nessuna retrieval (il chunking c'è via "Processa fonte").
- **Nessuna promozione ad `active`** dal client (resterà a `embed-knowledge-source`).
- **Nessuna rimozione del file PDF da Storage** alla delete (TODO).
- Scritture KB (incl. archive/restore/delete) passano **solo** da Edge Function
  admin con service role — nessuna policy RLS UPDATE/DELETE aperta ai client.
- **Nessuna modifica iOS / Capacitor.**

## Upload PDF (v1 implementato)

Tab dedicato nel dialog "Nuova fonte" — componente `KnowledgePdfUploadForm`:

- input file `accept="application/pdf"`, limite client 50 MB.
- metadati: title (auto-suggerito dal nome file), domain, language, author, origin, tags.
- step 1: `supabase.storage.from('knowledge-sources').upload(path, file)` con
  `path = <domain>/<timestamp>-<slug-title>.pdf`, `upsert: false`.
- step 2: `supabase.functions.invoke('ingest-knowledge-source', { body: { source_type: 'pdf', storage_path, ... } })`.
- in caso di errore Edge Function, il file appena caricato viene rimosso
  (`storage.remove`) per evitare orfani.
- stato pulsante: `Caricamento… → Registrazione… → Carica PDF`.
- la sorgente viene creata in `status='draft'`. L'estrazione testo + chunking è
  ora gestita da `process-knowledge-source` (branch PDF implementato: download
  da Storage + `unpdf`, **no OCR**, max 20 MB — vedi
  [`admin-knowledge-process-v1.md`](./admin-knowledge-process-v1.md)). Gli
  embedding e la promozione ad `active` restano per `embed-knowledge-source`.

Limiti noti:

- nessuna barra di progresso reale (Supabase JS v2 non emette `onUploadProgress`).
- nessun preview del PDF caricato.
- il processing si avvia dal menu **"Azioni" → "Processa fonte"** (dry_run →
  conferma → process); vedi sezione "Azioni per fonte" sopra.
- solo PDF con text layer: gli scansionati / solo-immagine danno
  `pdf_text_extraction_failed`.

Nota: i sogni privati degli utenti NON vanno caricati in questo bucket.

## Prossimi step previsti

1. `embed-knowledge-source`: embedding dei chunk (`embedding IS NULL`) +
   promozione della sorgente ad `active`.
2. `search-knowledge`: similarità pgvector per fornire contesto curato ai prompt.
3. UI admin: CTA "Processa documento" + archive / activate / edit (via Edge Function).

## Regola di sicurezza

> La Knowledge Base contiene **solo** materiale curatoriale (testi pubblici, riferimenti
> alchemici/astrologici/simbolici, contenuti app). Non deve mai contenere sogni privati
> degli utenti né dati personali identificabili.


---

_See also: [PROJECT_STATUS](./PROJECT_STATUS.md) · [WEB_TASKS](./WEB_TASKS.md) · [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md)_
