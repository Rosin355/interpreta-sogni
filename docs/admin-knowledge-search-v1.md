# Admin Knowledge Search — v1

Edge Function: `search-knowledge` · RPC: `public.match_knowledge_chunks`

## Scopo

Retrieval semantico sulla Knowledge Base curata. Genera un embedding della query
con **OpenAI** e fa una ricerca top-k per **cosine similarity** sui chunk delle
sole fonti `active`, via la RPC pgvector `match_knowledge_chunks`.

Provider: **solo OpenAI** per l'embedding della query. Nessun Anthropic / Lovable
/ ElevenLabs / Claude. Questa funzione **non** modifica `interpret-dream` e
**non** genera/scrive embedding dei chunk.

## RPC: match_knowledge_chunks

Migration (idempotente, **da eseguire manualmente**):
[`supabase-match-knowledge-chunks-migration.sql`](./supabase-match-knowledge-chunks-migration.sql).

```
match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_domain text default null,
  filter_language text default null
)
```

Ritorna: `chunk_id`, `source_id`, `chunk_index`, `content`, `token_count`,
`similarity`, `source_title`, `source_domain`, `source_language`.

Regole (lato DB, autoritative):
- solo chunk la cui sorgente è `status = 'active'`;
- solo chunk con `embedding IS NOT NULL`;
- filtro opzionale per dominio e lingua;
- `similarity = 1 - (embedding <=> query_embedding)` (cosine);
- ordina per distanza coseno asc (similarity desc), `limit match_count` (clamp 1..50);
- `SECURITY DEFINER` + `search_path = public`; execute a `service_role` +
  `authenticated` (la funzione espone solo contenuti `active`, già leggibili).

## Endpoint

```
POST /functions/v1/search-knowledge
Authorization: Bearer <user JWT>
Content-Type: application/json
```

## Request body

```jsonc
{
  "query": "string",            // required, 3..2000 char
  "domain": "alchemy",          // optional, whitelist domini
  "language": "it",             // optional, 2..8 char
  "match_count": 5,             // optional, 1..10, default 5
  "match_threshold": 0.70,      // optional, 0..1, default 0.70
  "mode": "dry_run" | "search"  // default dry_run
}
```

## Auth

- `Authorization` richiesto → `supabase.auth.getUser()` (401 se assente/invalido).
- **Qualsiasi utente autenticato** (NON admin-only): il retrieval è una lettura
  di contenuti curati `active`. La RPC limita i risultati alle fonti `active`,
  quindi nessun metadato admin o contenuto draft/archiviato viene esposto.
- `config.toml`: `verify_jwt = false` (JWT validato in codice).
- La UI di test è admin-only (vive nella pagina `/admin/knowledge-base`), ma la
  funzione in sé è pensata per essere richiamata in futuro da `interpret-dream`.

## Dry run (zero provider call)

`mode = "dry_run"` non chiama OpenAI e non scrive nel DB:

```json
{
  "mode": "dry_run",
  "query_length": 42,
  "estimated_query_tokens": 11,
  "model": "text-embedding-3-small",
  "match_count": 5,
  "match_threshold": 0.7,
  "domain": "alchemy",
  "language": "it",
  "provider_call": false
}
```

La query non viene mai loggata (solo la lunghezza).

## Search mode

1. Richiede `OPENAI_API_KEY` (mancante → `500` `search_provider_failed`).
2. `EMBEDDING_MODEL` se presente, altrimenti `text-embedding-3-small`.
3. Una sola richiesta a `POST /v1/embeddings` con `input: [query]`.
4. Validazione: un embedding, vettore di numeri finiti, lunghezza **esattamente 1536**.
5. Chiama la RPC `match_knowledge_chunks`.
6. Risposta sicura:

```json
{
  "results": [
    {
      "source_id": "...",
      "source_title": "Nigredo e dissoluzione",
      "domain": "alchemy",
      "language": "it",
      "chunk_index": 0,
      "content": "...",
      "token_count": 221,
      "similarity": 0.84
    }
  ],
  "result_count": 1,
  "model": "text-embedding-3-small",
  "provider_call": true
}
```

Mai restituiti: embedding, valori dei secret, errori DB interni, contenuti
archiviati/draft.

## Usage ledger

Una riga in `usage_ledger` **solo** dopo una richiesta OpenAI riuscita (fail-open):
- `feature = search_knowledge`
- `metadata`: `provider = openai`, `model`, `query_input_tokens`, `result_count`,
  `match_count`, `match_threshold`, `domain`, `language`.

Mai salvati: testo query, contenuto chunk, embedding, JWT, API key.

## Retrieval log

Una riga in `ai_knowledge_retrieval_logs` per ricerca (fail-open):
- `feature = search_knowledge`, `user_id`,
- `query = NULL` (il testo della query **non** viene salvato, per privacy),
- `selected_chunk_ids = [chunk_id…]`,
- `metadata`: `similarities`, `result_count`, `match_count`, `match_threshold`,
  `domain`, `language`.

Nessun testo privato di sogni viene mai salvato.

## Safe logs

```
[search-knowledge] started userIdPrefix=… mode=…
[search-knowledge] dry_run estimatedTokens=…
[search-knowledge] completed resultCount=… model=…
[search-knowledge] failed code=…
```

Mai loggati: query, contenuto chunk, embedding, JWT, API key, body provider grezzo.

## Deployment order

1. Eseguire **manualmente** la migration
   [`supabase-match-knowledge-chunks-migration.sql`](./supabase-match-knowledge-chunks-migration.sql)
   (crea la RPC). Senza RPC, `mode=search` ritorna `search_failed`.
2. Deploy della funzione:
   ```
   npx supabase functions deploy search-knowledge
   ```
   Prerequisito: secret `OPENAI_API_KEY` (opz. `EMBEDDING_MODEL`).

## Admin test UI

Pagina `/admin/knowledge-base` → pulsante **"Test ricerca"**
(`KnowledgeSearchTestDialog`):
1. Campi: query, dominio (opzionale), lingua (opzionale), `match_count`,
   `match_threshold`.
2. **Esegui dry run** → token stimati, modello, `provider_call = false`.
3. **Conferma ricerca** → genera l'embedding e mostra i top risultati: titolo
   fonte, dominio, similarity e una breve anteprima del contenuto.
4. Gli embedding non vengono mai mostrati. Solo pannello di test/debug.

## Manual test (curl)

Dry run (nessuna chiamata OpenAI):

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/search-knowledge" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "query": "simbolismo del serpente", "mode": "dry_run" }'
```

Search:

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/search-knowledge" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "query": "simbolismo del serpente", "mode": "search", "match_count": 5, "match_threshold": 0.7 }'
```

## SQL verifica

```sql
-- RPC esiste ed è SECURITY DEFINER
select proname, prosecdef, proconfig
from pg_proc where proname = 'match_knowledge_chunks';

-- chunk attivi/embeddati disponibili al retrieval
select count(*) from public.ai_knowledge_chunks c
join public.ai_knowledge_sources s on s.id = c.source_id
where s.status = 'active' and c.embedding is not null;

-- usage ledger ricerche (metadata sicura)
select feature, recorded_at, metadata
from public.usage_ledger
where feature = 'search_knowledge'
order by recorded_at desc limit 10;

-- retrieval logs (id + score, nessun testo query)
select feature, created_at, selected_chunk_ids, metadata
from public.ai_knowledge_retrieval_logs
where feature = 'search_knowledge'
order by created_at desc limit 10;
```

## Troubleshooting

| HTTP | `error_code` | Causa | Azione |
|------|--------------|-------|--------|
| 401 | — | JWT mancante/invalido | Rigenerare sessione |
| 400 | — | Body invalido (query/threshold/count/dominio) | Controllare `details` |
| 500 | `search_provider_failed` | `OPENAI_API_KEY` mancante | Configurare il secret |
| 502 | `search_provider_failed` | OpenAI non-200 / fetch fallita | Edge logs; retry |
| 502 | `search_dimension_mismatch` | Vettore query ≠ 1536 | Verificare `EMBEDDING_MODEL` |
| 500 | `search_failed` | RPC mancante / errore DB | Eseguire la migration RPC |

## Prossimo step

Wiring del retrieval in `interpret-dream` / `chat-with-alchemist`
(in un task separato — qui `interpret-dream` NON è toccato).

---

_See also: [PROJECT_STATUS](./PROJECT_STATUS.md) · [WEB_TASKS](./WEB_TASKS.md) · [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md) · [admin-knowledge-embed-v1](./admin-knowledge-embed-v1.md)_
