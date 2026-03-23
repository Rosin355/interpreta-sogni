

## Piano: Messaggi di errore user-friendly per TTS e edge functions

### Problema

Gli errori mostrati all'utente contengono messaggi tecnici come "dns error", "ElevenLabs API error: 429", stack trace, ecc. L'utente vede errori incomprensibili.

### Soluzione

Migliorare la gestione errori in due punti:

**File 1: `src/utils/elevenlabsTTS.ts`**

Nel metodo `speak()` (riga 389-395 e 431-440), intercettare gli errori dalla edge function e mapparli a messaggi comprensibili:

- Errore rete/timeout → "Problema di connessione. Verifica la tua connessione internet e riprova."
- Errore 429 (rate limit) → "Hai raggiunto il limite di richieste. Riprova tra qualche minuto."
- Errore 401 → "Sessione scaduta. Effettua nuovamente l'accesso."
- Errore 500 generico → "Il servizio audio non è al momento disponibile. Riprova tra poco."
- Errore "Nessun audio ricevuto" → "Non è stato possibile generare l'audio. Riprova."
- Aggiungere retry automatico (1 tentativo) per errori temporanei su singoli chunk, con messaggio "Nuovo tentativo per il blocco X..."

**File 2: `supabase/functions/text-to-speech-elevenlabs/index.ts`**

- CORS headers aggiornati (aggiungere header Supabase mancanti)
- Messaggi di errore in italiano user-friendly nelle risposte JSON
- Rate limiter wrappato in try-catch per evitare crash quando Upstash non è raggiungibile
- `output_format` spostato nel query parameter dell'URL
- Base64 encoding con `encode()` di Deno standard library invece di `btoa()`

**File 3: `src/components/TTSButton.tsx`**

- Nel catch di `handleSpeak` (riga 75-84), mappare i messaggi di errore a descrizioni user-friendly invece di mostrare `error.message` grezzo

### Mappatura errori → messaggi utente

| Errore tecnico | Messaggio utente |
|---|---|
| DNS/network/fetch failed | "Problema di connessione. Controlla internet e riprova." |
| 429 rate limit | "Troppe richieste. Attendi qualche minuto e riprova." |
| 401 auth | "Sessione scaduta. Accedi di nuovo per continuare." |
| 500 server | "Servizio temporaneamente non disponibile. Riprova tra poco." |
| Empty audio | "Non è stato possibile generare l'audio per questo testo." |
| API key invalid | "Servizio audio non configurato. Contatta l'assistenza." |
| Chunk failure | "Errore durante la generazione. Riprova." |

