

# Piano: Collegamento Sistema Email con Dominio dreamalchemist.app

## Stato Attuale - Problemi Rilevati

Ho analizzato tutte le funzioni email del portale e trovato questi problemi:

### 1. Indirizzo mittente sbagliato (CRITICO)
La edge function `send-email-notification` invia tutte le email da `onboarding@resend.dev` invece che dal dominio verificato `dreamalchemist.app`. Resend blocca le email in produzione se non usi un dominio verificato.

### 2. Bug nel template invito (CRITICO)  
Il template "user_invitation" usa `window.location.origin` che NON esiste nelle edge functions Deno. Questo causa un crash quando si tenta di inviare un invito a un utente non registrato.

### 3. Link errati nelle email
I link nelle email puntano all'URL di Supabase invece che al sito web del portale. Gli utenti che cliccano vengono mandati alla pagina sbagliata.

### 4. Email di autenticazione Supabase (Password Reset, Conferma Email)
Le email di reset password e conferma registrazione vengono inviate da Supabase direttamente, non dalla edge function. Per usare il dominio `dreamalchemist.app` anche per queste, serve configurare un SMTP custom nella dashboard Supabase.

---

## Piano di Implementazione

### Passo 1 - Aggiornare la edge function `send-email-notification`

Modifiche:
- Cambiare il `from` da `onboarding@resend.dev` a `Interpreta i tuoi Sogni <noreply@dreamalchemist.app>`
- Definire una costante `APP_URL = "https://interpreta-sogni.lovable.app"` (o `https://dreamalchemist.app` se hai un custom domain collegato)
- Correggere il bug `window.location.origin` nel template invitation, sostituendolo con la costante `APP_URL`
- Aggiornare tutti i link nei template email per usare `APP_URL` invece dell'URL Supabase
- Aggiungere link diretti alle pagine pertinenti (es. `/shared-dreams-received` per le condivisioni, `/auth` per registrazione)

### Passo 2 - Configurare SMTP Custom su Supabase (manuale)

Per le email di autenticazione (reset password, conferma email, magic link), dovrai configurare un SMTP custom nella dashboard Supabase:

1. Vai su Supabase Dashboard > Authentication > Email Templates
2. Vai su Settings > Authentication > SMTP Settings
3. Abilita "Custom SMTP"
4. Inserisci le credenziali SMTP di Resend:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: la tua Resend API key
   - Sender email: `noreply@dreamalchemist.app`

Questo passaggio va fatto manualmente dalla dashboard Supabase.

---

## Riepilogo Email del Portale

| Funzione | Stato Attuale | Dopo le Modifiche |
|---|---|---|
| Condivisione sogno con professionista | Mittente sbagliato | Da `noreply@dreamalchemist.app` |
| Condivisione sogno tra utenti | Mittente sbagliato | Da `noreply@dreamalchemist.app` |
| Invito utente non registrato | CRASH (bug window) | Corretto con link funzionante |
| Feedback professionista | Mittente sbagliato | Da `noreply@dreamalchemist.app` |
| Approvazione professionista | Mittente sbagliato | Da `noreply@dreamalchemist.app` |
| Reset password | Email default Supabase | Tramite SMTP custom Resend |
| Conferma registrazione | Email default Supabase | Tramite SMTP custom Resend |

## Dettagli Tecnici

File da modificare:
- `supabase/functions/send-email-notification/index.ts`: aggiornare `from`, `APP_URL`, fix `window` bug, aggiornare tutti i link nei template HTML

Configurazione manuale richiesta:
- Supabase Dashboard > Settings > Auth > SMTP Settings: configurare Resend SMTP per email di autenticazione

