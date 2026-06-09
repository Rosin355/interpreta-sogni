# Admin Knowledge Embed — v1

Edge Function: `embed-knowledge-source`

## Scopo

Genera gli embedding OpenAI per i chunk di una sorgente
(`public.ai_knowledge_chunks` con `embedding IS NULL`) e, quando non restano
chunk pendenti, promuove la sorgente a `status = 'active'`. Lo stato `active` è
ciò che la policy RLS `authenticated_read_active_chunks` usa per esporre i chunk
al retrieval.

Provider: **solo OpenAI embeddings**. Nessuna chiamata ad Anthropic / Lovable /
ElevenLabs / Claude. Nessun search implementato qui. `interpret-dream` NON viene
toccato.

## Endpoint

```
POST /functions/v1/embed-knowledge-source
Authorization: Bearer <user JWT (admin)>
Content-Type: application/json
```

## Request body

```jsonc
{
  "source_id": "uuid",          // required
  "mode": "dry_run" | "embed",  // default dry_run
  "batch_size": 20              // optional, 1..50, default 20
}
```

## Auth / admin

Stesso pattern di `process-knowledge-source`:
- JWT validato via `supabase.auth.getUser()` → `401` se assente/invalido.
- Check admin via RPC `public.is_admin(_user_id)`.
- Fallback opzionale: env `KB_ADMIN_USER_IDS` (CSV di UUID, solo test).
- Non admin → `403`.
- `config.toml`: `verify_jwt = false` (JWT validato in codice).

## Dry run (zero provider call)

`mode = "dry_run"` **non** chiama OpenAI e **non** scrive nel DB. Conta i chunk,
calcola i token stimati dai `token_count` già salvati (mai dal raw_text) e
restituisce gli indici del prossimo batch.

```json
{
  "source_id": "...",
  "mode": "dry_run",
  "source_status": "draft",
  "total_chunks": 10,
  "pending_chunks": 10,
  "embedded_chunks": 0,
  "batch_size": 20,
  "next_chunk_indexes": [0,1,2,3,4,5,6,7,8,9],
  "estimated_input_tokens": 2400,
  "model": "text-embedding-3-small",
  "provider_call": false
}
```

## Embed mode

`mode = "embed"`:

1. Richiede `OPENAI_API_KEY` (config error → `500`, codice
   `embedding_provider_failed`, sorgente non toccata).
2. `status = 'processing'`, `error_message = null`.
3. Se non ci sono chunk pendenti → promuove a `active` (resume idempotente).
4. Carica il batch pendente (`embedding IS NULL`, `order chunk_index asc`,
   `limit batch_size`).
5. Una sola richiesta a `POST https://api.openai.com/v1/embeddings`:
   `{ "model": <model>, "input": [contenuti chunk], "encoding_format": "float" }`.
6. Validazione risposta: un embedding per input, ogni vettore è un array di
   numeri finiti di lunghezza **esattamente 1536**. Mismatch → abort sicuro,
   sorgente **non** marcata `active`.
7. Update di ogni chunk (`embedding = <vector>`), preservando
   `chunk_index` / `content` / `token_count`.
8. Recount dei chunk pendenti.

### Batching / resume

- Solo il batch selezionato viene elaborato per chiamata.
- Se restano chunk pendenti → `status` resta `processing`, risposta con
  `status = "partial"`, `requires_another_batch = true`. Richiama la funzione
  per il batch successivo (la UI mostra "Continua con il batch successivo").
- I chunk già con embedding vengono saltati al retry (`embedding IS NULL`), quindi
  l'operazione è resumabile: un fallimento a metà non rielabora i chunk completati.
- Quando `pending_chunks = 0` → `status = 'active'`, `processed_at = now()`,
  `error_message = null`, `requires_another_batch = false`.

### Partial response

```json
{
  "source_id": "...",
  "mode": "embed",
  "status": "partial",
  "total_chunks": 60,
  "pending_chunks": 40,
  "embedded_this_batch": 20,
  "source_status": "processing",
  "model": "text-embedding-3-small",
  "requires_another_batch": true
}
```

### Active response

```json
{
  "source_id": "...",
  "mode": "embed",
  "status": "active",
  "total_chunks": 60,
  "pending_chunks": 0,
  "embedded_this_batch": 20,
  "source_status": "active",
  "model": "text-embedding-3-small",
  "requires_another_batch": false
}
```

## Status lifecycle

```
draft ──embed──▶ processing ──(batch ok, pending>0)──▶ processing (partial)
                            └─(batch ok, pending=0)──▶ active
                            └─(provider/DB error)────▶ failed
```

Codici `error_message` sicuri su `failed`:
`embedding_provider_failed` · `embedding_dimension_mismatch` ·
`embedding_update_failed` · `embedding_processing_failed`.

Le sorgenti `archived` sono rifiutate con `409` (`source_archived`).

## Provider / secrets

- **Required secret**: `OPENAI_API_KEY` (server-side, mai esposto/loggato).
- **Optional**: `EMBEDDING_MODEL` (default `text-embedding-3-small`).
- **Dimensione attesa**: 1536 (coerente con `vector(1536)` su
  `ai_knowledge_chunks.embedding`). Un modello con dimensione diversa fallisce
  con `embedding_dimension_mismatch` e non attiva la sorgente.

## Usage ledger

Una riga in `public.usage_ledger` viene scritta **solo** quando una richiesta
reale a OpenAI va a buon fine (registrata prima degli update DB così il costo è
tracciato anche se un update fallisce dopo).

- `feature = embed_knowledge_source`
- `metadata`: `source_id`, `provider = openai`, `model`, `chunks_embedded`,
  `input_tokens` (se ritornati da OpenAI), `batch_size`.

Mai salvati nel ledger: contenuto chunk, `raw_text`, embeddings, JWT, API key.
Il ledger **fail-open**: un errore di scrittura logga un warning sicuro ma non
fa fallire un embedding già riuscito.

## Safe logs

Consentiti (solo prefissi id + contatori):

```
[embed-knowledge-source] started userIdPrefix=… sourceIdPrefix=… mode=…
[embed-knowledge-source] dry_run pending=… total=…
[embed-knowledge-source] embedded sourceIdPrefix=… count=… model=…
[embed-knowledge-source] partial sourceIdPrefix=… pending=…
[embed-knowledge-source] active sourceIdPrefix=…
[embed-knowledge-source] failed sourceIdPrefix=… code=…
```

Mai loggati: contenuto chunk, `raw_text`, vettori, JWT, API key, body completo
dell'errore provider, contenuto privato utente.

## Deploy

```
npx supabase functions deploy embed-knowledge-source
```

Prerequisito: il secret `OPENAI_API_KEY` deve essere configurato nei secrets
delle Edge Functions. Opzionale: `EMBEDDING_MODEL`.

## Admin UI — flusso

Menu **"Azioni" → "Genera embeddings"** (`KnowledgeEmbedDialog`):

1. **Esegui dry run** → mostra chunk totali / pendenti / già con embedding,
   token stimati, modello, `provider_call = false`.
2. **Conferma generazione embeddings** → `mode = embed`, `batch_size = 20`.
3. Mostra embeddings generati nel batch, chunk rimanenti, stato fonte.
4. Se restano batch → **"Continua con il batch successivo"**.
5. La lista fonti viene aggiornata dopo ogni batch.

Nessun JWT/secret esposto: usa il client Supabase autenticato.

## Manual test (curl)

Dry run (nessuna chiamata OpenAI):

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/embed-knowledge-source" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "source_id": "<UUID>", "mode": "dry_run" }'
```

Embed un batch:

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/embed-knowledge-source" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "source_id": "<UUID>", "mode": "embed", "batch_size": 20 }'
```

## SQL verifica

```sql
-- chunk con/ senza embedding
select source_id, count(*) as chunks,
       sum(case when embedding is null then 1 else 0 end) as null_embeddings
from public.ai_knowledge_chunks
where source_id = '<UUID>'
group by source_id;

-- stato sorgente
select id, status, processed_at, error_message
from public.ai_knowledge_sources
where id = '<UUID>';

-- usage ledger (metadata sicura, nessun contenuto)
select feature, recorded_at, metadata
from public.usage_ledger
where feature = 'embed_knowledge_source'
order by recorded_at desc
limit 10;
```

## Troubleshooting

| HTTP | `error_code` | Causa | Azione |
|------|--------------|-------|--------|
| 401 | — | JWT mancante/invalido | Rigenerare sessione |
| 403 | — | Non admin | Assegnare ruolo o `KB_ADMIN_USER_IDS` |
| 400 | — | Body invalido / batch_size fuori 1..50 | Controllare `details` |
| 404 | — | source_id inesistente | Verificare UUID |
| 409 | `source_archived` | Sorgente archiviata | Ripristinare in bozza |
| 500 | `embedding_provider_failed` | `OPENAI_API_KEY` mancante | Configurare il secret |
| 502 | `embedding_provider_failed` | OpenAI non-200 / fetch fallita | Edge logs; retry |
| 502 | `embedding_dimension_mismatch` | Vettore ≠ 1536 / conteggio errato | Verificare `EMBEDDING_MODEL` |
| 500 | `embedding_update_failed` | Errore DB update chunk | Edge logs; retry (resumabile) |
| 500 | `embedding_processing_failed` | Errore generico | Edge logs; sorgente `failed` |

## Prossimo step

`search-knowledge` (pgvector similarity) → retrieval in `interpret-dream` /
`chat-with-alchemist`.

---

_See also: [PROJECT_STATUS](./PROJECT_STATUS.md) · [WEB_TASKS](./WEB_TASKS.md) · [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md) · [admin-knowledge-process-v1](./admin-knowledge-process-v1.md)_
