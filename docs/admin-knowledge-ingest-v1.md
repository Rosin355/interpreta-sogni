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
  "source_type": "manual_text | note | markdown | txt", // default manual_text
  "language": "it",           // default it
  "author": "string | null",
  "origin": "string | null",
  "tags": ["string"],         // normalizzati trim + lowercase + dedup
  "raw_text": "string",       // min 100, max 200000
  "status": "draft | active"  // default draft
}
```

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

## Prossimo step

`process-knowledge-source`: chunking del `raw_text`, generazione embedding,
inserimento in `ai_knowledge_chunks`, aggiornamento `processed_at` e `status`.
