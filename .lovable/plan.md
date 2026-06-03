## Piano — Guida test manuale end-to-end per ingest-knowledge-source

### Obiettivo
Aggiornare `docs/admin-knowledge-ingest-v1.md` con una sezione completa "Manual end-to-end test" per verificare che l'Edge Function `ingest-knowledge-source` funzioni correttamente prima di passare a `process-knowledge-source`.

### Task 1 — Aggiungere sezione "Manual end-to-end test" al documento esistente

Contenuti da inserire in `docs/admin-knowledge-ingest-v1.md` dopo la sezione "Deploy":

**Prerequisiti:**
- KB migration eseguita (tabelle `ai_knowledge_sources`, `ai_knowledge_chunks`, `ai_knowledge_retrieval_logs` presenti)
- Utente corrente è admin (`public.is_admin` = true) oppure inserito in `KB_ADMIN_USER_IDS`
- Edge Function deployata: `npx supabase functions deploy ingest-knowledge-source`

**SQL verification queries:**
- Verifica esistenza tabelle KB
- Verifica stato admin utente (`select public.is_admin('<USER_ID>')`)
- Verifica fonti create (`select ... from ai_knowledge_sources order by created_at desc limit 10`)

**Curl example:**
- Comando curl con placeholder `<PROJECT_REF>` e `<USER_JWT>`
- Body JSON di esempio (title, domain=alchemy, tags, raw_text >= 100 char)
- Nessun JWT reale nel documento

**Expected response:**
- JSON atteso con `source_id`, `status: "draft"`, `message: "Knowledge source created"`

**Troubleshooting:**
- 401/403 → JWT mancante o utente non admin
- 400 → validazione fallita (raw_text < 100 char, dominio non whitelistato, ecc.)
- 500 → errore DB/function, controllare Edge Function logs

### Task 2 — Conferme finali

Nel report finale confermare:
- Nessuna chiamata AI effettuata
- Nessun embedding creato
- Nessun chunk creato
- Nessuna modifica al runtime
- Nessun service role key esposto

### File da modificare
- `docs/admin-knowledge-ingest-v1.md` (unico file)