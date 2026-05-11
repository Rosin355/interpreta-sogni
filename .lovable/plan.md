## Riepilogo

**Causa errore tema natale** (confermata dai log): la quota mensile dell'API esterna RapidAPI Astrologer è esaurita. Risposta HTTP 429: *"You have exceeded the MONTHLY quota for Requests on your current plan, BASIC."*

Risolvo lato app come hai chiesto: l'utente normale non vedrà mai "quota esaurita", riceverà un messaggio neutro e professionale; super admin (tu e Jessica) ricevono invece un alert dedicato.

---

## 1. Error handling unificato su tutte le edge function

Pattern unico applicato a ogni invocazione `supabase.functions.invoke(...)`:

- Estrazione errore strutturato via `await error.context?.json()` → `{ errorCode, error, details }`.
- Mappatura `errorCode` → messaggio italiano chiaro per l'utente (vocabolario condiviso, vedi sezione tecnica).
- Insert in `error_logs` con `function_name`, `error_code`, `error_message_user`, `error_message_technical` (JSON completo per debug), `metadata`.
- Toast `useToast` (variant `destructive`) con `action: buildErrorReportAction({...})` per inviare la segnalazione email — esattamente come oggi in `DreamDetail.tsx` / `EditDream.tsx`.

Componenti/pagine da allineare:

- `src/components/BirthDataForm.tsx` (calculate-natal-chart) — oggi usa `sonner`, niente log, niente segnalazione.
- `src/components/VoiceRecorder.tsx` (speech-to-text-elevenlabs).
- `src/components/AlchemistChat.tsx` (chat-with-alchemist).
- `src/components/DreamDiaryExport.tsx` (send-dream-diary).
- `src/components/TTSButton.tsx` (text-to-speech-elevenlabs).
- `src/components/ProfessionalCommentForm.tsx` / pagine pro (approve-professional).
- `src/pages/NewDream.tsx`, `src/pages/EditDream.tsx` per le invocazioni residue (`suggest-tags`, `interpret-dream`).
- `src/pages/Astrology.tsx` (errore caricamento profilo).
- `src/hooks/usePasswordReset.ts` (request-password-reset, verify-reset-token).

Verrà creato un piccolo helper riutilizzabile `src/utils/handle-edge-error.ts` con firma:

```ts
handleEdgeError({
  error, data, functionName, dreamId?, fallbackMessage,
  errorCodeMap?, // override per funzione
  toast, // istanza useToast
})
```

così ogni componente diventa una riga sola e il comportamento è identico ovunque.

## 2. Messaggi "quota esaurita" — visibili solo ai super admin

**Per l'utente normale**: messaggio neutro e professionale, identico per tutti gli errori di quota di terze parti (RapidAPI, ElevenLabs, Lovable AI, Resend):

> "Il servizio è temporaneamente non disponibile. Riprova tra qualche minuto. Se il problema persiste, invia una segnalazione."

Niente accenno a "quota", "limite", "piano BASIC", "upgrade", URL esterni.

**Per i super admin**: il toast mostra il messaggio tecnico vero (es. *"RapidAPI Astrologer: MONTHLY quota exceeded — upgrade plan"*) con badge "ADMIN" e il link diretto al provider.

Implementazione:
- Helper `useIsSuperAdmin()` (riusa `is_super_admin` RPC già presente, vedi `ModernDashboardLayout.tsx`).
- Codici di errore quota riconosciuti lato edge: `API_QUOTA_EXCEEDED`, `AI_CREDITS_EXHAUSTED`, `AI_RATE_LIMIT`, `STT_QUOTA_EXCEEDED`, `TTS_QUOTA_EXCEEDED`, `EMAIL_QUOTA_EXCEEDED`.
- L'helper `handleEdgeError` legge il flag e sceglie messaggio user vs admin.
- Nel record `error_logs`, `error_message_user` resta neutro; `error_message_technical` contiene tutto (anche per audit dashboard).

## 3. Alert quota dedicato ai super admin

Quando una edge function risponde con un errorCode di quota:

1. Lato client: toast esteso per super admin (vedi sopra).
2. Lato server (edge function `calculate-natal-chart` e le altre con quota): se rilevo quota esaurita, oltre a tornare l'errore, **invio un'email** al canale super admin tramite `send-email-notification` (Resend, già configurato — `noreply@dreamalchemist.app`):
   - Destinatari: `romesh.singhabahu@gmail.com`, `jessicaommarin@gmail.com`.
   - Oggetto: `[Dream Alchemist] Quota esaurita — <provider>`.
   - Body con tema dark esistente: provider, codice errore, function name, timestamp, link al dashboard provider per upgrade.
   - Throttling: invio max 1 email per provider ogni 6 ore (chiave in `app_settings` → `quota_alert_<provider>_last_sent`) per evitare spam.
3. Lato Admin Dashboard: nella tab Errori, gli `error_logs` con codice quota appariranno con badge rosso "QUOTA" — già coperto dal sistema `AdminErrorsList` esistente (cambiamento minimo: highlight visivo).

---

## Dettagli tecnici

### Edge functions: risposta strutturata standard

Ogni funzione restituirà:

```json
{
  "error": "Messaggio tecnico (per log)",
  "errorCode": "API_QUOTA_EXCEEDED" | "INVALID_INPUT" | "UNAUTHORIZED" | "INTERNAL_ERROR" | ...,
  "details": { /* opzionale */ }
}
```

Status HTTP: 429 quota, 400 input, 401/403 auth, 502 upstream, 500 unhandled.

Funzioni edge da aggiornare per esporre `errorCode` coerente:
- `calculate-natal-chart` (gestisce 429 RapidAPI → `API_QUOTA_EXCEEDED`)
- `speech-to-text-elevenlabs`, `text-to-speech-elevenlabs` (gestiscono 429 ElevenLabs → `STT_QUOTA_EXCEEDED` / `TTS_QUOTA_EXCEEDED`)
- `chat-with-alchemist`, `interpret-dream`, `interpret-dream-with-astrology`, `suggest-tags` (gestiscono 429/402 Lovable Gateway → `AI_RATE_LIMIT` / `AI_CREDITS_EXHAUSTED`)
- `send-email-notification`, `send-dream-diary`, `request-password-reset` (gestiscono 429 Resend → `EMAIL_QUOTA_EXCEEDED`)
- `generate-dream-image` (già conforme).

Aggiunta: nelle funzioni sopra, dopo aver rilevato quota → fire-and-forget chiamata interna a `notify-admin-quota` (nuova funzione) o invio diretto via Resend con throttling DB.

### Mappa errorCode → messaggio utente (italiano)

| errorCode | Messaggio utente | Messaggio admin |
|---|---|---|
| `API_QUOTA_EXCEEDED` | "Servizio temporaneamente non disponibile. Riprova più tardi." | "Quota mensile RapidAPI esaurita — upgrade necessario" |
| `STT_QUOTA_EXCEEDED` / `TTS_QUOTA_EXCEEDED` | idem | "ElevenLabs quota esaurita" |
| `AI_CREDITS_EXHAUSTED` | idem | "Crediti Lovable AI esauriti — ricaricare" |
| `AI_RATE_LIMIT` | "Troppe richieste in pochi secondi. Attendi un istante." | uguale all'utente (transitorio) |
| `INVALID_INPUT` | "Dati non validi. Verifica e riprova." | dettaglio campo |
| `UNAUTHORIZED` | "Sessione scaduta. Ricarica la pagina." | uguale |
| `NETWORK_ERROR` | "Problema di connessione. Verifica internet e riprova." | uguale |
| `INTERNAL_ERROR` (default) | "Si è verificato un errore. Puoi inviare una segnalazione qui sotto." | messaggio tecnico completo |

### Nuovo helper client

```
src/utils/handle-edge-error.ts
src/utils/edge-error-codes.ts (mappa)
src/hooks/useIsSuperAdmin.ts (riuso RPC is_super_admin con cache)
```

### Tabella `app_settings`

Riuso esistente per throttling alert (chiavi tipo `quota_alert_rapidapi_last_sent`). Nessuna migrazione DB richiesta.

### File modificati/creati

**Nuovi**
- `src/utils/handle-edge-error.ts`
- `src/utils/edge-error-codes.ts`
- `src/hooks/useIsSuperAdmin.ts`
- `supabase/functions/notify-admin-quota/index.ts` (invio email a super admin con throttling)

**Aggiornati (client)**
- `src/components/BirthDataForm.tsx`
- `src/components/VoiceRecorder.tsx`
- `src/components/AlchemistChat.tsx`
- `src/components/DreamDiaryExport.tsx`
- `src/components/TTSButton.tsx`
- `src/components/ShareDreamUnified.tsx` (refactor a helper)
- `src/pages/NewDream.tsx`
- `src/pages/EditDream.tsx` (refactor a helper)
- `src/pages/DreamDetail.tsx` (refactor a helper)
- `src/pages/Astrology.tsx`
- `src/hooks/usePasswordReset.ts`
- `src/components/admin/AdminErrorsList.tsx` (highlight badge "QUOTA")

**Aggiornati (edge)**
- `supabase/functions/calculate-natal-chart/index.ts`
- `supabase/functions/speech-to-text-elevenlabs/index.ts`
- `supabase/functions/text-to-speech-elevenlabs/index.ts`
- `supabase/functions/chat-with-alchemist/index.ts`
- `supabase/functions/interpret-dream/index.ts`
- `supabase/functions/interpret-dream-with-astrology/index.ts`
- `supabase/functions/suggest-tags/index.ts`
- `supabase/functions/send-email-notification/index.ts`
- `supabase/functions/send-dream-diary/index.ts`
- `supabase/functions/request-password-reset/index.ts`

Nessuna modifica DB. Nessun nuovo secret (Resend già configurato).
