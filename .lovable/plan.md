

## Diagnosi

L'utente mostra il dashboard Resend filtrato su "Last 15 days": appaiono solo email "Confirm Your Signup" (auth Supabase). NESSUN invio di `send-email-notification` è registrato → la edge function NON sta chiamando Resend con successo. Le email a `jessicaommarin@gmail.com` e `romesh.singhabahu@gmail.com` non sono mai partite.

Cause più probabili (da verificare nei log della edge function):

1. **`RESEND_API_KEY` mancante o invalida** nei secrets di Supabase per la funzione `send-email-notification`. La funzione fallirebbe ma il client mostra comunque un toast generico (anche se ora abbiamo aggiunto il logging in `error_logs`, solo i nuovi tentativi vengono tracciati).

2. **Dominio `dreamalchemist.app` non verificato su Resend** → Resend rifiuta gli invii con `from: noreply@dreamalchemist.app`. Il dashboard mostra che il progetto Resend si chiama "dreamalchemistapp" ma nella sidebar serve controllare la sezione **Domains** per lo stato di verifica.

3. **Edge function va in errore prima di chiamare Resend** (es. `auth.getUser()` fallisce) — ma in tal caso vedremmo gli errori in `error_logs`.

Per risolvere serve:
- Leggere i log reali della edge function `send-email-notification` per vedere l'errore esatto
- Verificare lo stato del dominio su Resend
- Verificare che `RESEND_API_KEY` sia configurata

## Piano

### Step 1 — Diagnostica (lettura log)
Leggere i log recenti della edge function `send-email-notification` per identificare la causa esatta del fallimento (chiave mancante, dominio non verificato, errore di parsing, ecc).

Query la tabella `error_logs` filtrando su `function_name = 'send-email-notification'` per vedere se i nuovi tentativi (post-fix precedente) hanno generato log strutturati.

### Step 2 — In base al risultato
- **Se `RESEND_API_KEY` manca/invalida** → chiedere all'utente di aggiungerla/rigenerarla nei Supabase Edge Function Secrets (l'agente non può scrivere secrets).
- **Se dominio non verificato** → istruire l'utente a completare la verifica DNS (SPF/DKIM/DMARC) sul dashboard Resend → Domains, oppure cambiare temporaneamente `FROM_EMAIL` a `onboarding@resend.dev` per testare.
- **Se errore di codice** → patchare la edge function.

### Step 3 — Hardening della edge function `send-email-notification`
Indipendentemente dalla causa, migliorare la funzione per restituire errori PIÙ chiari al client:
- Logging esplicito quando `RESEND_API_KEY` è assente
- Catturare e ritornare l'errore reale di `resend.emails.send()` (oggi viene loggato in console ma non sempre rilanciato come 500 strutturato)
- Aggiungere `errorCode` strutturato (`RESEND_KEY_MISSING`, `RESEND_DOMAIN_UNVERIFIED`, `RESEND_API_ERROR`) così il client mostra messaggi precisi nel toast

### File toccati
- `supabase/functions/send-email-notification/index.ts` — gestione errori Resend strutturata + check `RESEND_API_KEY`

### File NON toccati
- Schema DB, RLS, altre edge function, UI

### Verifiche richieste all'utente (dopo il fix)
1. Su **Resend Dashboard → Domains**: confermare che `dreamalchemist.app` sia in stato **Verified** (verde) con SPF/DKIM ok. Screenshot.
2. Su **Lovable Cloud → Edge Functions → send-email-notification → Secrets**: confermare che `RESEND_API_KEY` sia presente.
3. Provare di nuovo a condividere un sogno e controllare la tab "Errori" in Admin Dashboard per il log strutturato `EMAIL_DELIVERY_FAILED` con il `errorCode` reale.

