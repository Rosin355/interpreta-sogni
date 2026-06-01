## Obiettivo

Creare la prima Edge Function di scrittura per la Knowledge Base (`ingest-knowledge-source`) che permette agli admin autenticati di inserire (e opzionalmente aggiornare) sorgenti di testo manuale in `public.ai_knowledge_sources`. Nessuna chiamata AI, nessun chunk, nessun embedding in questa fase.

## Strategia di autorizzazione admin

Il progetto ha già un pattern consolidato (usato in `approve-professional`):

1. `authClient.auth.getUser()` per validare il JWT
2. RPC `is_admin(_user_id)` (oppure `is_super_admin`) per il controllo di ruolo via `user_roles`

Riuso lo stesso pattern. **NON** serve introdurre `KB_ADMIN_USER_IDS`: l'helper esiste già ed è sicuro. Lo menziono nei docs solo come fallback non implementato.

Risposte:
- Admin auth → `supabase.rpc('is_admin', { _user_id: user.id })`
- Service role usata solo lato server per scrivere bypassando RLS (le tabelle KB non hanno policy di write).

## File da creare

### 1. `supabase/functions/ingest-knowledge-source/index.ts`

Struttura:
- CORS + OPTIONS handler (riuso `corsHeaders` da `_shared/error-response.ts`)
- Parse + validazione body con Zod inline:
  - `title` string min 3 max 200
  - `domain` enum: `dreams | alchemy | astrology | symbols | mythology | psychology | rituals | voice_scripts | community_guidelines | app_content`
  - `source_type` enum `manual_text | note | markdown | txt`, default `manual_text`
  - `language` string default `it`
  - `author` string nullable
  - `origin` string nullable
  - `tags` array string, normalizzati (trim + lowercase, dedup)
  - `raw_text` min 100 max 200_000
  - `status` `draft | active`, default `draft`
  - `source_id` opzionale (modalità update)
- Auth:
  - Estrai Authorization header → `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization } } })`
  - `authClient.auth.getUser()` → 401 se mancante
  - `authClient.rpc('is_admin', { _user_id: user.id })` → 403 se false
- DB write con client service role:
  - Insert (no `source_id`) con `created_by = user.id`, `metadata: { ingest_method: 'manual_text', version: 1 }`
  - Update (con `source_id`): verifica row exists e `created_by = user.id` OR admin; aggiorna campi editabili; se `raw_text` cambiato → set `processed_at = null` e `status = 'draft'` (forza riprocessamento futuro)
- Logging sicuro:
  - `[ingest-knowledge-source] started userIdPrefix=<first8>`
  - `[ingest-knowledge-source] created sourceIdPrefix=<first8> domain=... status=...`
  - Mai loggare `raw_text`, JWT, secret
- Errori → `errorResponse(code, message)` da `_shared/error-response.ts`
- Response success:
  ```json
  { "source_id": "...", "status": "draft|active", "message": "Knowledge source created|updated" }
  ```

### 2. `supabase/config.toml` (edit)

Aggiungere:
```
[functions.ingest-knowledge-source]
verify_jwt = false
```
(verifica in-code come da memoria `Edge Gateway Bypass`)

### 3. `docs/admin-knowledge-ingest-v1.md` (nuovo)

Contenuti:
- Scopo della funzione
- Endpoint + request/response schema
- Autorizzazione: JWT + `is_admin` RPC
- Note `KB_ADMIN_USER_IDS`: non implementato, fallback futuro
- Limiti: niente embeddings, niente chunk, nessuna chiamata AI in questa fase
- **Warning di sicurezza**: i sogni privati degli utenti NON vanno mai incollati nella KB
- Prossimo step: `process-knowledge-source` (chunking + embeddings)

### 4. `docs/ai-knowledge-base-strategy-v1.md` (edit, se esiste; altrimenti TODO no-op)

Aggiungere sezione Fase 3 con path della nuova edge function e stato.

## Cosa NON viene fatto

- Nessuna chiamata a OpenAI / Anthropic / Lovable AI / ElevenLabs
- Nessun chunking o embedding
- Nessuna modifica iOS / RevenueCat
- Nessuna esposizione del service role al client
- Nessuna policy RLS aggiunta su `ai_knowledge_sources` (continua write solo da edge)
- Nessun deploy automatico

## Comandi finali (manuali, da eseguire dall'utente se vuole)

```
npx supabase functions deploy ingest-knowledge-source
```

Nessun secret nuovo richiesto.

## Conferme finali nel report dopo build

- File aggiunti / modificati
- Strategia admin = RPC `is_admin` (riuso pattern esistente)
- `KB_ADMIN_USER_IDS` non richiesto
- Funzione non deployata automaticamente
- Nessuna chiamata AI eseguita
