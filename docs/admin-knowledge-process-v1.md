# Admin Knowledge Process — v1

Edge Function: `process-knowledge-source`

## Scopo

Carica una riga di `public.ai_knowledge_sources`, ne splitta il `raw_text`
in chunk deterministici e — in modalità `process` — li inserisce in
`public.ai_knowledge_chunks` con `embedding = NULL`.

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

Dry run NON scrive nulla nel DB.

## Process response (no-embedding mode)

```json
{
  "source_id": "...",
  "mode": "process",
  "chunk_count": 12,
  "estimated_token_count": 3600,
  "source_status": "draft",
  "embeddings": "pending"
}
```

In modalità `process`:
1. `status` portato a `processing`.
2. Tutti i chunk esistenti per `source_id` vengono cancellati (idempotenza).
3. I nuovi chunk vengono inseriti con `embedding = NULL`.
4. `status` riportato a `draft`, `processed_at = now()`.
5. In caso di errore: `status = 'failed'`, `error_message = 'processing_failed'`.

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

## Privacy

- I sogni privati degli utenti NON devono mai finire nella KB.
- La service role key resta solo lato Edge Function.
- Log consentiti: prefissi di id + counter. Mai loggati `raw_text`, contenuto
  dei chunk, JWT, secrets, embedding.

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

| Codice | Causa | Azione |
|--------|-------|--------|
| 401 | JWT mancante/invalido | Rigenerare sessione |
| 403 | Non admin | Assegnare ruolo o `KB_ADMIN_USER_IDS` |
| 400 | Body invalido / overlap >= size / raw_text corto | Controllare `details` |
| 404 | source_id inesistente | Verificare UUID |
| 409 | Sorgente archiviata | Reattivare o usare altra fonte |
| 500 | Errore DB durante insert/delete chunk | Edge logs; sorgente marcata `failed` |

## Prossimo step

`embed-knowledge-source` — generazione embedding + promozione a `active`.

---

_See also: [PROJECT_STATUS](./PROJECT_STATUS.md) · [WEB_TASKS](./WEB_TASKS.md) · [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md) · [admin-knowledge-ingest-v1](./admin-knowledge-ingest-v1.md)_
