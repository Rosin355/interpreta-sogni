# Admin Knowledge Ingest — v1

Edge Function: `ingest-knowledge-source`

## Scopo

Permettere a un admin autenticato di creare o aggiornare una sorgente di testo
manuale nella tabella `public.ai_knowledge_sources` (Knowledge Base AI).

**Questa funzione NON fa**:
- nessuna chiamata a OpenAI / Anthropic / Lovable AI / ElevenLabs
- nessun chunking
- nessun embedding
- nessuna modifica iOS / RevenueCat

Il chunking + embedding sarà gestito da una funzione successiva
(`process-knowledge-source`).

## Endpoint

```
POST /functions/v1/ingest-knowledge-source
Authorization: Bearer <user JWT>
Content-Type: application/json
```

## Request body

```jsonc
{
  "source_id": "uuid",        // opzionale → modalità update
  "title": "string",          // min 3
  "domain": "dreams | alchemy | astrology | symbols | mythology | psychology | rituals | voice_scripts | community_guidelines | app_content",
  "source_type": "manual_text | note | markdown | txt | pdf", // default manual_text
  "language": "it",           // default it
  "author": "string | null",
  "origin": "string | null",
  "tags": ["string"],         // normalizzati trim + lowercase + dedup
  "raw_text": "string",       // richiesto per fonti testuali (min 100, max 200000); null/omesso per pdf
  "storage_path": "string",   // richiesto per source_type='pdf'; ignorato altrimenti
  "status": "draft | active"  // default draft (forzato a draft per pdf)
}
```

### Validazione cross-field

- `source_type='pdf'` → `storage_path` obbligatorio, `raw_text` ignorato (salvato come NULL).
- altri `source_type` → `raw_text` obbligatorio (regole esistenti), `storage_path` ignorato.


## Response

```json
{
  "source_id": "uuid",
  "status": "draft | active",
  "message": "Knowledge source created | updated"
}
```

## Autorizzazione

1. Validazione JWT via `supabase.auth.getUser()`.
2. Controllo admin via RPC security-definer `public.is_admin(_user_id)`
   (stesso pattern di `approve-professional`).
3. **Fallback opzionale** non in uso di default: variabile env
   `KB_ADMIN_USER_IDS` (Supabase secret, lista UUID separati da virgola).
   Se impostata, gli ID elencati sono autorizzati anche senza ruolo `admin`.
   Da usare solo in fase di test. Per la produzione affidarsi a `user_roles`.

Se non admin → `403`.

## Modalità update

Usata anche dall'azione admin **"Modifica"** della Knowledge Base UI
(`KnowledgeSourceEditForm` → `functions.invoke('ingest-knowledge-source', { body: { source_id, … } })`).

Se `source_id` è presente:
- carica la riga esistente
- aggiorna i campi editabili
- se `raw_text` è cambiato → `processed_at = null` e `status = 'draft'`
  (forza il riprocessamento futuro)
- TODO: cancellare i chunk esistenti per quel `source_id` quando la pipeline
  di processing sarà attiva

## Sicurezza & privacy

- I **sogni privati degli utenti NON devono mai essere incollati** nella KB.
  La KB è destinata a contenuti generali (simbologia, alchimia, astrologia,
  miti, script vocali, linee guida community, contenuti app). Questo non è
  controllato a runtime ma è una regola di prodotto.
- La service role key resta solo lato edge function.
- Le tabelle `ai_knowledge_*` non hanno policy di INSERT/UPDATE/DELETE per i
  client: ogni scrittura passa da edge function admin.

## Logging

Vengono loggati solo prefissi (primi 8 char) di user id / source id e i campi
non sensibili (domain, status). **Mai** loggati: `raw_text`, JWT, secret,
contenuti privati.

## Deploy

```
npx supabase functions deploy ingest-knowledge-source
```

Secret opzionale (solo se serve fallback admin):
```
npx supabase secrets set KB_ADMIN_USER_IDS="uuid1,uuid2"
```

## Manual end-to-end test

Test manuale per verificare che la funzione sia operativa **prima** di
implementare `process-knowledge-source`. Non esegue chiamate AI, non crea
embedding, non crea chunk.

### Prerequisiti

1. **Migration KB eseguita** — le tabelle `ai_knowledge_sources`,
   `ai_knowledge_chunks`, `ai_knowledge_retrieval_logs` devono esistere in
   `public`.
2. **Utente admin** — l'utente che esegue la chiamata deve avere ruolo
   `admin` / `super_admin` (`public.is_admin(<user_id>) = true`) oppure il
   suo UUID deve essere presente nel secret `KB_ADMIN_USER_IDS`.
3. **Edge Function deployata**:

   ```
   npx supabase functions deploy ingest-knowledge-source
   ```

### Step 1 — SQL verification queries

Verifica esistenza tabelle KB:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'ai_knowledge_sources',
    'ai_knowledge_chunks',
    'ai_knowledge_retrieval_logs'
  );
```

Atteso: 3 righe.

Verifica stato admin dell'utente di test:

```sql
select public.is_admin('<USER_ID>');
```

Atteso: `true`.

Verifica fonti inserite (dopo la chiamata curl):

```sql
select id, title, domain, status, created_by, created_at
from public.ai_knowledge_sources
order by created_at desc
limit 10;
```

### Step 2 — Curl example

Sostituire `<PROJECT_REF>` con il ref del progetto Supabase e `<USER_JWT>` con
un JWT valido di un utente admin (ottenibile dalla sessione browser via
`supabase.auth.getSession()`). **Non committare mai un JWT reale** in questo
file.

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/ingest-knowledge-source" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nigredo — introduzione simbolica",
    "domain": "alchemy",
    "source_type": "manual_text",
    "language": "it",
    "author": "Dream Alchemist",
    "origin": "manual_admin_note",
    "tags": ["nigredo", "alchimia", "trasformazione"],
    "status": "draft",
    "raw_text": "La Nigredo rappresenta la fase oscura dell'opera alchemica, il momento in cui la materia e la coscienza attraversano dissoluzione, ombra, confusione e perdita di forma. Nel linguaggio simbolico dei sogni può apparire come notte, fango, stanze chiuse, acque torbide o figure inquietanti. Non indica una condanna, ma l'inizio di una trasformazione profonda."
  }'
```

### Step 2b — Curl example per PDF (metadata only)

Pre-requisito: il file PDF è stato caricato nel bucket privato
`knowledge-sources` (vedi `docs/supabase-knowledge-storage-migration.sql`).
La funzione NON estrae testo dal PDF: salva solo metadata + `storage_path`.

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/ingest-knowledge-source" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Jung — Psicologia e Alchimia (estratto)",
    "domain": "alchemy",
    "source_type": "pdf",
    "language": "it",
    "tags": ["jung", "alchimia"],
    "storage_path": "alchemy/jung-psicologia-alchimia.pdf"
  }'
```

Risposta attesa: `status='draft'`, `raw_text` resta NULL.
Il chunking + estrazione testo avverrà più avanti in
`process-knowledge-source`.

### Step 3 — Expected response

```json
{
  "source_id": "...",
  "status": "draft",
  "message": "Knowledge source created"
}
```

Subito dopo, la query SQL del passo 1 deve mostrare la nuova riga con
`status = 'draft'`, `domain = 'alchemy'` e `created_by` uguale all'UUID
dell'utente admin.

### Troubleshooting

| Codice | Causa probabile | Azione |
|--------|-----------------|--------|
| `401`  | Header `Authorization` mancante o JWT invalido/scaduto | Rigenerare JWT dalla sessione |
| `403`  | Utente non admin e non presente in `KB_ADMIN_USER_IDS` | Assegnare ruolo `admin` in `user_roles` |
| `400`  | Validazione zod fallita (es. `raw_text` < 100 char, dominio non whitelistato, tag troppo lunghi) | Controllare `details` nella risposta |
| `404`  | `source_id` passato ma riga inesistente (modalità update) | Verificare UUID |
| `500`  | Errore DB/funzione | Controllare gli Edge Function logs |

**Vincoli di validazione chiave:**
- `raw_text`: min 100, max 200000 caratteri
- `title`: min 3, max 200 caratteri
- `domain`: whitelist (`dreams`, `alchemy`, `astrology`, `symbols`,
  `mythology`, `psychology`, `rituals`, `voice_scripts`,
  `community_guidelines`, `app_content`)
- `tags`: max 50 elementi, ognuno max 64 caratteri

## Prossimo step

`process-knowledge-source`: chunking del `raw_text`, generazione embedding,
inserimento in `ai_knowledge_chunks`, aggiornamento `processed_at` e `status`.



---

_See also: [PROJECT_STATUS](./PROJECT_STATUS.md) · [WEB_TASKS](./WEB_TASKS.md) · [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md)_
