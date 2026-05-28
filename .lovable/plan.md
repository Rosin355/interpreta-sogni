## Obiettivo
Il form di contatto in `/about` deve inviare i messaggi via Resend a **info@dreamalchemist.app**, invece di aprire WhatsApp.

## Cosa cambia per chi compila il form
- Compila Nome, Email, Oggetto, Messaggio → preme "Invia".
- Il messaggio arriva direttamente a `info@dreamalchemist.app`.
- Rispondendo da quella casella, la risposta va all'email dell'utente (impostata come `Reply-To`).
- L'utente vede un messaggio di conferma in italiano; nessun reindirizzamento a WhatsApp.

## Implementazione tecnica

1. **Nuova Edge Function `send-contact-email`** (pubblica, `verify_jwt = false`)
   - Mittente: `Interpreta i tuoi Sogni <noreply@dreamalchemist.app>` (già verificato su Resend)
   - Destinatario fisso: `info@dreamalchemist.app`
   - `Reply-To`: email inserita dall'utente nel form
   - Oggetto email: `[Contatto] <oggetto utente>`
   - Validazione server-side: nome (1–100), email valida, oggetto (1–200), messaggio (10–2000); risposta 400 con errori in italiano se non valido
   - Escape HTML su tutti i campi (anti-injection)
   - Template HTML coerente con lo stile dark/oro già usato in `send-email-notification`
   - CORS aperto, gestione errori con log e codici di stato corretti (400/500/502)
   - Usa il secret `RESEND_API_KEY` già presente

2. **`supabase/config.toml`**: aggiungi blocco `[functions.send-contact-email]` con `verify_jwt = false`.

3. **`src/pages/About.tsx`**:
   - Rimuovi import e uso di `buildWhatsAppUrl`.
   - In `onSubmit` chiama `supabase.functions.invoke("send-contact-email", { body: values })`.
   - Toast successo: "Messaggio inviato! Ti risponderemo al più presto."
   - Toast errore: messaggio dell'API o fallback generico in italiano.
   - Reset del form solo in caso di successo.

4. **Nessuna modifica** a DB, RLS, altri Edge Function, auth o routing.

## Note
- Nessuna protezione anti-spam dedicata (rate-limit / captcha) — coerente con la scelta architetturale di non usare Upstash/Redis. Se in futuro arrivassero abusi, valuteremo un captcha lato client.
- La configurazione DNS di Resend per `dreamalchemist.app` è già attiva (usata da `send-email-notification`), quindi nessuna azione DNS richiesta.
