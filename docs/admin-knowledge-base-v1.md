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
  `storage_path` (PDF) modificabili, **più un selettore Stato** (vedi sotto).
  Campi read-only/aiuto mostrati nel dialog: id (prefix), `source_type`
  (+ spiegazione), `processed_at` e `error_message`. Salva via
  `ingest-knowledge-source` in **update mode** (`source_id` nel body). Se
  `raw_text`/`storage_path` cambia, il backend riporta la fonte a `draft` e
  azzera `processed_at`. Toast: *"Fonte aggiornata"* / *"Non siamo riusciti ad
  aggiornare la fonte"*. Disabilitata se archiviata.

### Gestione stato (nel dialog Modifica)

Il selettore **Stato** espone **solo** `draft` (Bozza) e `active` (Attiva).
`processing` (In elaborazione) e `failed` (Errore) sono **gestiti dal sistema**
e mostrati read-only; `archived` (Archiviata) usa le azioni dedicate
Archivia/Ripristina. Salvataggio in due passi, senza race:

1. salva metadati/contenuto via `ingest-knowledge-source` (lo status corrente
   viene **preservato**, mai attivato qui);
2. se lo stato è cambiato, chiama `manage-knowledge-source` separatamente
   (`activate` / `move_to_draft`) — **mai** un update diretto client-side;
3. refresh di dettagli/lista.

`activate` è validato **lato server**: una fonte diventa `active` solo se ha
≥1 chunk, **tutti con embedding**, non è archiviata e non ha `error_message`;
altrimenti `409 source_not_ready_for_activation` → toast *"Genera prima gli
embeddings per tutti i chunk."*. `move_to_draft` non tocca chunk/embedding.
L'opzione Attiva è disabilitata nella UI quando il client vede già embedding
pendenti (best-effort; il server resta autoritativo). Se il **contenuto
cambia**, la fonte torna a `draft` e **non** viene riattivata automaticamente:
toast *"La fonte è tornata in bozza perché il contenuto è cambiato. Processala
e rigenera gli embeddings prima di riattivarla."*. Toast stato: *"Fonte
attivata"* / *"Fonte spostata in bozza"*.
- **Processa fonte** — dialog `KnowledgeProcessDialog`: `dry_run` →
  mostra `chunk_count` / `estimated_token_count` / `extracted_text_length` /
  `embeddings: not_generated` → **Conferma processing** (`mode='process'`,
  `embedding = null`, fonte resta `draft`). Nessun embedding, nessuna AI.
- **Genera embeddings** — dialog `KnowledgeEmbedDialog`: `dry_run` → mostra
  chunk totali / pendenti / già con embedding, token stimati, modello,
  `provider_call=false` → **Conferma generazione embeddings** (`mode='embed'`,
  `batch_size=20`). Mostra embeddings generati nel batch + chunk rimanenti +
  stato fonte; se restano batch → **"Continua con il batch successivo"**.
  Genera embedding **OpenAI** (`text-embedding-3-small`, 1536) lato server e,
  quando non restano chunk pendenti, promuove la fonte ad `active`. Disabilitata
  se archiviata. Vedi [`admin-knowledge-embed-v1.md`](./admin-knowledge-embed-v1.md).
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

## Status ammessi (DB constraint)

La colonna `ai_knowledge_sources.status` accetta:
`draft`, `processing`, `active`, `archived`, `failed`.

Lo schema originale (creato via dashboard) non includeva `archived`, aggiunto
dopo per il flusso archive/restore di `manage-knowledge-source`. Per allineare
il `CHECK` constraint eseguire **manualmente** la migration idempotente
[`supabase-ai-knowledge-status-archived-migration.sql`](./supabase-ai-knowledge-status-archived-migration.sql)
(non distruttiva, nessuna AI, nessun embedding).

## Cosa NON è implementato (intenzionale)

- **Solo OpenAI per gli embedding** (nessun Anthropic / Lovable / ElevenLabs).
  Embedding generati dall'azione "Genera embeddings" (`embed-knowledge-source`),
  mai automaticamente.
- **Nessuna retrieval / search** lato client (il chunking c'è via "Processa
  fonte", gli embedding via "Genera embeddings"; `search-knowledge` è TODO).
- La **promozione ad `active`** avviene solo server-side: automaticamente in
  `embed-knowledge-source` a fine embedding, o manualmente via
  `manage-knowledge-source` (`activate`, con readiness check). Mai un update di
  status diretto dal client.
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

1. ~~`embed-knowledge-source`: embedding dei chunk + promozione ad `active`.~~
   ✅ implementato — vedi [`admin-knowledge-embed-v1.md`](./admin-knowledge-embed-v1.md).
2. `search-knowledge`: similarità pgvector per fornire contesto curato ai prompt.
3. Wiring retrieval in `interpret-dream` / `chat-with-alchemist`.

## Regola di sicurezza

> La Knowledge Base contiene **solo** materiale curatoriale (testi pubblici, riferimenti
> alchemici/astrologici/simbolici, contenuti app). Non deve mai contenere sogni privati
> degli utenti né dati personali identificabili.


---

_See also: [PROJECT_STATUS](./PROJECT_STATUS.md) · [WEB_TASKS](./WEB_TASKS.md) · [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md)_
