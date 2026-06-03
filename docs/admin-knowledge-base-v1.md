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

## Azione "Processa fonte" (v1 implementata)

Ogni riga della lista fonti ha un bottone **"Processa fonte"**
(`KnowledgeProcessAction`), admin-only:

1. apre un dialog e chiama `process-knowledge-source` in `mode='dry_run'`;
2. mostra solo conteggi/lunghezze: `chunk_count`, `estimated_token_count`,
   `extracted_text_length` (se presente), `embeddings: not_generated`
   (**mai** `raw_text` o contenuto dei chunk);
3. con **"Conferma processing"** chiama `mode='process'`: inserisce i chunk con
   `embedding = null`, la fonte resta `draft`;
4. messaggio di successo *"Fonte processata. I chunk sono stati creati senza
   embeddings."* e refresh della lista.

- Usa la sessione Supabase autenticata esistente (`functions.invoke` allega il
  JWT automaticamente; nessun JWT esposto a mano).
- Errori: messaggio neutro *"Non siamo riusciti a processare la fonte. Controlla
  i log della funzione."* (+ eventuale `codice:` sicuro, es. `document_too_large`).

## Cosa NON è implementato (intenzionale)

- **Nessuna chiamata AI** (OpenAI / Anthropic / Lovable / ElevenLabs).
- **Nessun embedding**, nessuna retrieval (il chunking c'è via "Processa fonte").
- **Nessun edit / archive / activate dal client** — le RLS UPDATE/DELETE non sono aperte agli admin; richiederanno una Edge Function dedicata o nuove policy.
- **Nessuna delete permanente.**
- **Nessuna modifica iOS / Capacitor.**
- Service role key resta esclusivamente nell'Edge Function.

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
- il processing si avvia dalla lista fonti con **"Processa fonte"** (dry_run →
  conferma → process); vedi sezione dedicata sotto.
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
