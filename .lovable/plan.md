## Goal

Abilitare l'upload PDF nella Knowledge Base admin: bucket Storage privato + policy RLS + UI admin per caricare PDF e creare la riga `ai_knowledge_sources` con `source_type='pdf'` e `storage_path`.

## Passi

### 1. Bucket Supabase Storage
Creare il bucket privato `knowledge-sources` via `supabase--storage_create_bucket` (name=`knowledge-sources`, public=false).

### 2. Policy RLS su `storage.objects`
Migration SQL (dal contenuto già documentato in `docs/supabase-knowledge-storage-migration.sql`):
- `kb_admin_read` — SELECT admin
- `kb_admin_insert` — INSERT admin
- `kb_admin_update` — UPDATE admin
- `kb_admin_delete` — DELETE admin

Tutte gated da `bucket_id = 'knowledge-sources' AND public.is_admin(auth.uid())`. Edge Functions con service role bypassano RLS.

### 3. Componente UI admin: upload PDF

Nuovo file: `src/components/admin/KnowledgePdfUploadForm.tsx`
- Input file (accept `application/pdf`, max ~50 MB lato client).
- Campi metadata (riutilizzando lo stile di `KnowledgeSourceForm`): title, domain (select whitelistato), language (default `it`), author, origin, tags (comma-separated).
- Flow al submit:
  1. validazione client (file presente, title min 3, domain whitelistato, size limit).
  2. `supabase.storage.from('knowledge-sources').upload(path, file)` dove `path = <domain>/<timestamp>-<slug-title>.pdf`. `upsert: false`.
  3. al success, `supabase.functions.invoke('ingest-knowledge-source', { body: { source_type: 'pdf', storage_path, title, domain, language, author, origin, tags } })`.
  4. su errore upload → toast + abort (no riga DB).
  5. su errore Edge Function → tentativo `storage.remove([path])` di cleanup + toast.
- Barra di progresso (Supabase JS v2 non emette progress nativo → mostrare stato `Caricamento... / Registrazione...`).
- Privacy warning in fondo, coerente con `KnowledgeSourceForm`.

### 4. Integrazione in `AdminKnowledgeBase.tsx`
Sostituire il singolo dialog "Nuova fonte" con un dialog a due tab/segmenti:
- Tab "Testo manuale" → `KnowledgeSourceForm` esistente.
- Tab "Documento PDF" → nuovo `KnowledgePdfUploadForm`.

Entrambi triggerano lo stesso `handleCreated` → chiude dialog + refresh lista.

Componente Tabs di shadcn già presente in `src/components/ui/tabs.tsx` (lo riusiamo).

### 5. Aggiornamento `KnowledgeSourcesList` (minimo)
Verificare che la lista mostri il `source_type`. Se non lo mostra già, aggiungere un piccolo badge "PDF" / "Testo" accanto al titolo. (Solo se la modifica è banale; altrimenti deferire.)

### 6. Documentazione
- `docs/admin-knowledge-base-v1.md` — spostare la sezione "Pianificato — Upload PDF" da TODO a "Implementato (v1)", con nota sui limiti (no parsing, no progress nativo).
- `docs/WEB_TASKS.md` — spuntare gli step "creazione bucket", "policy RLS", "admin UI form upload PDF". Lasciare aperti: `process-knowledge-source` PDF branch, estrazione testo, embeddings.
- `docs/PROJECT_STATUS.md` — aggiornare `Last Updated` e aggiungere riga "Admin PDF upload UI" in Completed.

Tutti i doc restano < 300 righe.

## Out of scope (esplicito)

- Nessuna estrazione testo PDF.
- Nessun chunking / embedding lato server in questa pass.
- Nessuna modifica iOS.
- Nessuna chiamata AI.
- Nessuna modifica a `ingest-knowledge-source` (già pronto per `source_type='pdf'` dalla pass precedente).

## Note tecniche

- L'upload usa l'anon key + JWT utente: le nuove policy RLS richiedono `is_admin(auth.uid())` → solo admin possono uploadare. Coerente con il pattern esistente.
- Il `storage_path` salvato in DB è il path relativo al bucket (es. `alchemy/1717420000-jung-psicologia.pdf`), non l'URL pubblico.
- Non viene generato alcun signed URL in questa pass: i file verranno letti server-side da `process-knowledge-source` con service role.

## Report finale (dopo build mode)

- bucket creato? sì/no
- migration policy applicata? sì/no
- file aggiunti / modificati
- conferma: no AI calls, no iOS, no estrazione PDF
- next step: implementare il branch PDF di `process-knowledge-source`
