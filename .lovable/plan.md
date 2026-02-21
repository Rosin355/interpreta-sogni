

# Piano: Sistema di Reset Password con Codice OTP e Email Onirica

## Panoramica

Attualmente il reset password usa un link magico di Supabase. Vuoi un sistema piu sicuro con un **codice numerico a 6 cifre** (OTP) che l'utente deve inserire manualmente, con un'email dal design onirico ispirata all'immagine del portale magico.

## Architettura del Flusso

Il flusso sara:
1. L'utente inserisce la sua email nella pagina "Password dimenticata"
2. Una edge function genera un codice OTP a 6 cifre, lo salva nel database con scadenza (15 minuti), e invia un'email bellissima con il codice
3. L'utente inserisce il codice OTP nell'app
4. L'app verifica il codice tramite edge function
5. Se valido, l'utente puo impostare la nuova password

## Modifiche Necessarie

### 1. Nuova tabella `password_reset_tokens`

Campi:
- `id` (uuid, primary key)
- `user_id` (uuid, riferimento all'utente)
- `email` (text)
- `token` (text, il codice a 6 cifre, hashato)
- `expires_at` (timestamptz, scadenza 15 minuti)
- `used` (boolean, default false)
- `attempts` (integer, default 0, max 5 tentativi)
- `created_at` (timestamptz)

RLS: nessun accesso diretto dal client. Solo le edge functions (con service role key) possono leggere/scrivere questa tabella.

### 2. Nuova edge function `request-password-reset`

- Riceve l'email dell'utente
- Verifica che l'utente esista (senza rivelare se esiste o no all'esterno)
- Genera un codice casuale a 6 cifre
- Salva l'hash del codice nella tabella `password_reset_tokens`
- Invalida eventuali token precedenti per lo stesso utente
- Invia l'email con il codice tramite Resend con template onirico
- Non richiede autenticazione (l'utente non e loggato)

### 3. Nuova edge function `verify-reset-token`

- Riceve email + codice OTP + nuova password
- Verifica il codice contro il database (confronto hash)
- Controlla scadenza e numero tentativi (max 5)
- Se valido, usa `supabase.auth.admin.updateUserById()` per cambiare la password
- Segna il token come usato
- Non richiede autenticazione

### 4. Email Template Onirico

Un'email HTML con design ispirato all'immagine del portale magico:
- Sfondo scuro gradient (nero/viola profondo)
- Bordi dorati e effetti luminosi
- Il codice OTP mostrato in grande al centro, dentro una "cornice mistica" con bordo dorato
- Testo elegante con font serif
- Particelle/stelle decorative via CSS
- Colori: nero profondo, viola, oro, bagliori caldi
- Footer con il branding "Interpreta i tuoi Sogni"

### 5. Aggiornamento pagina Auth.tsx

Modificare il flusso "Password dimenticata" in 3 step:

**Step 1 - Inserimento Email**: l'utente inserisce la propria email (come adesso)

**Step 2 - Inserimento Codice OTP**: 6 campi input per il codice numerico (usando il componente `input-otp` gia installato), con timer di scadenza visibile, pulsante "Reinvia codice"

**Step 3 - Nuova Password**: form per inserire e confermare la nuova password (come adesso)

Il design sara coerente con lo stile onirico del portale, con sfumature viola/oro e animazioni sottili.

## Dettagli Tecnici

### File da creare:
- `supabase/functions/request-password-reset/index.ts` - genera OTP e invia email
- `supabase/functions/verify-reset-token/index.ts` - verifica OTP e resetta password

### File da modificare:
- `src/pages/Auth.tsx` - nuovo flusso a 3 step con OTP input

### Migrazione database:
- Creare tabella `password_reset_tokens` con RLS disabilitato per accesso pubblico bloccato (solo service role)

### Sicurezza:
- Codice OTP hashato nel database (non in chiaro)
- Scadenza 15 minuti
- Max 5 tentativi per codice
- Rate limiting: max 3 richieste per email ogni 15 minuti
- Risposta generica "Se l'email esiste, riceverai un codice" per non rivelare utenti registrati

