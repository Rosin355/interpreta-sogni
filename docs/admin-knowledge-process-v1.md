# Admin Knowledge Process — v1

Edge Function: `process-knowledge-source`

## Scopo

Carica una riga di `public.ai_knowledge_sources`, ricava il testo da
processare e — in modalità `process` — lo splitta in chunk deterministici e
li inserisce in `public.ai_knowledge_chunks` con `embedding = NULL`.

Il testo proviene da due vie a seconda di `source_type`:

- **testo** (`manual_text` / `note` / `markdown` / `txt`): usa `raw_text`
  (comportamento invariato; un `source_type` NULL è trattato come `manual_text`).
- **pdf** (`source_type='pdf'` + `storage_path`): scarica il file dal bucket
  privato `knowledge-sources` (service role, solo lato server) ed estrae il
  **text layer** con `unpdf` (build serverless di Mozilla PDF.js). Solo
  estrazione testo: **niente OCR**. PDF scansionati / solo-immagine senza testo
  estraibile falliscono con codice `pdf_text_extraction_failed`.

**Questa funzione NON fa**:
- nessuna chiamata a OpenAI / Anthropic / Lovable / ElevenLabs
- nessuna generazione di embedding
- nessuna attivazione automatica della sorgente

Gli embedding saranno generati da una funzione successiva
(`embed-knowledge-source`) che dovrà anche promuovere `status = 'active'`.
Finché gli embedding mancano, la sorgente resta `draft` e le RLS sui chunk
non li espongono ai client.

## Endpoint

```
POST /functions/v1/process-knowledge-source
Authorization: Bearer <user JWT (admin)>
Content-Type: application/json
```

## Request body

```jsonc
{
  "source_id": "uuid",            // required
  "mode": "dry_run" | "process",  // default dry_run
  "chunk_size": 1200,             // optional, 500..3000
  "chunk_overlap": 150            // optional, 0..500, < chunk_size
}
```

## Dry run response

```json
{
  "source_id": "...",
  "mode": "dry_run",
  "source_type": "pdf",
  "extracted_text_length": 48230,
  "chunk_count": 12,
  "estimated_token_count": 3600,
  "chunk_size": 1200,
  "chunk_overlap": 150,
  "chunks_preview": [
    { "chunk_index": 0, "length": 1180, "token_estimate": 295 }
  ],
  "embeddings": "not_generated"
}
```

Dry run NON scrive nulla nel DB e NON cambia lo `status` della sorgente.
Per un PDF il dry run scarica ed estrae comunque il testo (se entro i limiti)
per poter calcolare i chunk; `extracted_text_length` è la lunghezza del testo
estratto. I `chunks_preview` espongono solo `length` / `token_estimate`, mai il
contenuto.

## Process response (no-embedding mode)

```json
{
  "source_id": "...",
  "mode": "process",
  "source_type": "pdf",
  "extracted_text_length": 48230,
  "chunk_count": 12,
  "estimated_token_count": 3600,
  "source_status": "draft",
  "embeddings": "pending"
}
```

In modalità `process`:
1. `status` portato a `processing`, `error_message` azzerato.
2. Si ricava il testo (per i PDF: download da Storage + estrazione).
3. Tutti i chunk esistenti per `source_id` vengono cancellati (idempotenza).
4. I nuovi chunk vengono inseriti con `embedding = NULL`.
5. `status` riportato a `draft`, `error_message = NULL`.
   - testo: `processed_at = now()` (invariato).
   - **pdf**: `processed_at = NULL` (chunk fatti ma non ancora "processato"
     fino agli embedding).
6. In caso di errore: `status = 'failed'`, `error_message` = codice sicuro
   (`pdf_download_failed` · `pdf_text_extraction_failed` · `document_too_large`
   · `processing_failed`).

## Auth / admin

Stesso pattern di `ingest-knowledge-source`:
- Validazione JWT via `supabase.auth.getUser()` → `401` se assente/invalido.
- Check admin via RPC `public.is_admin(_user_id)`.
- Fallback opzionale: env `KB_ADMIN_USER_IDS` (CSV di UUID, solo test).
- Non admin → `403`.

## Chunking

Helper deterministico in-file:
- normalizza `\r\n` → `\n` e trim.
- splitta su righe vuote (paragrafi).
- pack greedy dei paragrafi fino a `chunk_size` caratteri.
- paragrafi più lunghi di `chunk_size` → slice a caratteri con `chunk_overlap`.
- aggiunge overlap finale (tail) tra chunk consecutivi quando possibile.

Stima token: `Math.ceil(length / 4)`.

## Pipeline per `source_type='pdf'` (implementata)

Quando la sorgente è un PDF (`raw_text` NULL, `storage_path` valorizzato):

1. `status = 'processing'` (solo in `process`).
2. download del file dal bucket privato `knowledge-sources` lato server
   (`admin.storage.from('knowledge-sources').download(objectPath)`, service
   role, mai client-side, nessun signed URL).
3. estrazione del **text layer** con `unpdf` (`getDocumentProxy` +
   `extractText({ mergePages: true })`), build serverless di PDF.js. **No OCR.**
4. chunking deterministico (stesso helper `chunkText` della via testuale).
5. insert in `ai_knowledge_chunks` con `embedding = NULL`.
6. `embed-knowledge-source` (futuro) genera embedding e porta `status = 'active'`.

### Libreria di estrazione

- `import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@1.6.2";`
- versione **pinnata** (mai `@latest`) per allineare `supabase functions serve`
  e deploy.
- `unpdf` include i polyfill (`Promise.withResolvers`, `FinalizationRegistry`,
  `DOMMatrix`) nel bundle: nessun polyfill manuale, nessuna chiamata
  `definePDFJSModule()` necessaria su Deno.
- niente `@napi-rs/canvas` (serve solo per il rendering immagine, non per il
  testo) e niente `pdfjs-dist` grezzo (richiede un worker separato + DOM).

### Convenzione `storage_path` e bucket

- **bucket fisso**: `knowledge-sources` (privato).
- **`storage_path`** = path dell'oggetto **dentro** il bucket, es.
  `alchemy/nigredo.pdf` (è ciò che salva l'upload UI:
  `<domain>/<timestamp>-<slug-title>.pdf`).
- un eventuale prefisso `knowledge-sources/` iniziale viene tollerato e
  rimosso, quindi sono accettati sia `alchemy/x.pdf` sia
  `knowledge-sources/alchemy/x.pdf`.

### Guardrail dimensioni / timeout

- **max file PDF**: 20 MB (`MAX_PDF_BYTES`); oltre → `document_too_large` (413).
- **max testo estratto**: 500 000 caratteri (`MAX_EXTRACTED_CHARS`); oltre →
  `document_too_large`.
- empty / whitespace-only dopo l'estrazione → `pdf_text_extraction_failed`
  (PDF scansionato / solo-immagine: niente OCR in questa pass).
- download fallito / file vuoto → `pdf_download_failed` (502).
- `try/catch` attorno a estrazione: input corrotti / cifrati → codice sicuro,
  l'isolate non crasha.

### Rischio timeout / documenti molto grandi

Gli Edge Functions hanno limiti di tempo e memoria. PDF molto grandi
(centinaia di pagine, decine di MB di testo) potrebbero:

- superare il timeout di una singola invocazione,
- generare un numero di chunk troppo elevato per un singolo insert,
- causare picchi di costo embeddings.

Mitigazioni future:
- elaborazione a batch (es. 50 chunk per chiamata, paginazione tramite
  `chunk_offset`).
- coda / background job (pg_cron + tabella `kb_processing_jobs`).
- pre-validazione delle dimensioni in fase di upload nell'admin UI.

## Policy embedding

Per questa pass: **NESSUN embedding**.
- I chunk vengono salvati con `embedding = NULL`.
- La sorgente NON viene marcata `active`.
- La RLS `authenticated_read_active_chunks` impedisce qualsiasi lettura
  client perché la sorgente resta `draft`.

Una funzione futura (`embed-knowledge-source`) dovrà:
1. leggere i chunk con `embedding IS NULL` per la sorgente.
2. chiamare il provider di embedding lato server (es. OpenAI
   `text-embedding-3-small`, 1536 dim — coerente con `vector(1536)` su
   `ai_knowledge_chunks.embedding`).
3. fare update batch dei chunk.
4. promuovere la sorgente a `active`.

## Privacy & log

- I sogni privati degli utenti NON devono mai finire nella KB.
- La service role key resta solo lato Edge Function.
- **Log consentiti** (solo prefissi id + contatori numerici):
  - `started userIdPrefix=… sourceIdPrefix=… mode=…`
  - `pdf downloaded sourceIdPrefix=… bytes=…`
  - `pdf extracted sourceIdPrefix=… textLength=…`
  - `dry_run chunkCount=…`
  - `processed sourceIdPrefix=… chunkCount=…`
- **Mai loggati**: testo del PDF, contenuto dei chunk, `raw_text`, JWT, service
  role key, signed URL di Storage, secrets, embedding.

## Deploy

```
npx supabase functions deploy process-knowledge-source
```

`supabase/config.toml`:

```toml
[functions.process-knowledge-source]
verify_jwt = false
```

JWT validato manualmente in codice (stesso pattern di tutto il progetto).

## Manual test

Dry run:

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/process-knowledge-source" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "source_id": "<UUID>", "mode": "dry_run" }'
```

Process (inserisce chunk senza embedding):

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/process-knowledge-source" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "source_id": "<UUID>", "mode": "process", "chunk_size": 1200, "chunk_overlap": 150 }'
```

Per un PDF il body è identico (stesso `source_id`): il `source_type='pdf'` e lo
`storage_path` sono già sulla riga `ai_knowledge_sources`. Prerequisito: il file
deve esistere nel bucket `knowledge-sources` al path indicato. Un PDF scansionato
(solo immagini) restituisce `pdf_text_extraction_failed`.

Verifica:

```sql
select source_id, count(*) as chunks,
       sum(case when embedding is null then 1 else 0 end) as null_embeddings
from public.ai_knowledge_chunks
where source_id = '<UUID>'
group by source_id;

select id, status, processed_at, error_message
from public.ai_knowledge_sources
where id = '<UUID>';
```

## Troubleshooting

| HTTP | `error_code` | Causa | Azione |
|------|--------------|-------|--------|
| 401 | — | JWT mancante/invalido | Rigenerare sessione |
| 403 | — | Non admin | Assegnare ruolo o `KB_ADMIN_USER_IDS` |
| 400 | — | Body invalido / overlap >= size / raw_text corto | Controllare `details` |
| 400 | `unsupported_source_type` | `source_type` non gestito | Usare un tipo valido |
| 400 | `pdf_missing_storage_path` | PDF senza `storage_path` | Reingestire con `storage_path` |
| 404 | — | source_id inesistente | Verificare UUID |
| 409 | — | Sorgente archiviata | Reattivare o usare altra fonte |
| 413 | `document_too_large` | PDF > 20 MB o testo > 500k char | Splittare il documento |
| 422 | `pdf_text_extraction_failed` | PDF scansionato / no text layer / corrotto | Caricare un PDF testuale (no OCR) |
| 502 | `pdf_download_failed` | Download da Storage fallito | Verificare `storage_path` / bucket |
| 500 | `processing_failed` | Errore DB durante insert/delete chunk | Edge logs; sorgente marcata `failed` |

## Prossimo step

✅ `embed-knowledge-source` — generazione embedding OpenAI + promozione a
`active` (implementata; vedi
[`admin-knowledge-embed-v1.md`](./admin-knowledge-embed-v1.md)).
Successivo: `search-knowledge` (pgvector similarity).

---

_See also: [PROJECT_STATUS](./PROJECT_STATUS.md) · [WEB_TASKS](./WEB_TASKS.md) · [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md) · [admin-knowledge-ingest-v1](./admin-knowledge-ingest-v1.md)_
