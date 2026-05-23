# Email Deliverability Checklist — Dream Alchemist

Linee guida per garantire che le email di conferma account (e in generale tutte le email transazionali) arrivino correttamente in inbox e non in Spam/Promozioni.

## SMTP & Provider

- Supabase Auth deve essere configurato con un provider SMTP di produzione (Resend consigliato).
- Configurare in Supabase Dashboard: **Authentication → Email → SMTP Settings**.
- Verificare il dominio mittente in Resend (`dreamalchemist.app`).
- Sender ufficiale: `Dream Alchemist <noreply@dreamalchemist.app>`.

## DNS

Sul dominio `dreamalchemist.app` devono essere presenti:

- **SPF** (TXT): autorizza Resend a spedire per il dominio.
  Esempio: `v=spf1 include:_spf.resend.com ~all`
- **DKIM** (CNAME/TXT): record forniti da Resend (di solito 2-3 CNAME).
- **DMARC** (TXT su `_dmarc.dreamalchemist.app`):
  Esempio iniziale: `v=DMARC1; p=none; rua=mailto:dmarc@dreamalchemist.app`
  Passare a `p=quarantine` o `p=reject` dopo aver verificato i report.

## Template email Supabase Auth

- I template (Confirm signup, Magic link, Reset password, Invite, Change email) devono usare lo stesso dominio mittente verificato.
- Mantenere il tema scuro oniric con accenti dorati (vedi memoria `email/oniric-dark-theme`).
- Includere sempre testo chiaro che spieghi perché l'utente ha ricevuto l'email.

## Contenuto

- Evitare subject line spammose ("CLICCA SUBITO!", troppe emoji, MAIUSCOLO).
- Bilanciare testo e immagini: niente email solo immagine.
- Includere link "annulla iscrizione" / "non sei tu?" dove sensato.
- Mantenere link assoluti con HTTPS e dominio verificato.

## Test

- Inviare email di test a:
  - Gmail
  - Outlook / Hotmail
  - iCloud
  - Yahoo
- Verificare che arrivino in Inbox e non in Promozioni/Spam.
- Controllare l'header `Authentication-Results` per `spf=pass`, `dkim=pass`, `dmarc=pass`.

## Monitoraggio

- Controllare regolarmente i log Resend (bounces, complaints, opens).
- Controllare i log Supabase Auth per errori di invio.
- Tenere d'occhio la reputazione mittente con strumenti come [mail-tester.com](https://www.mail-tester.com/).

## Rinvio conferma account

L'app espone un flusso dedicato `Auth?mode=resend-confirmation` che chiama:

```ts
supabase.auth.resend({
  type: "signup",
  email,
  options: { emailRedirectTo: `${baseUrl}/auth?confirmed=1` },
});
```

- Cooldown lato client: 60 secondi.
- Messaggio di risposta generico per evitare account enumeration.
- Nessuna API key o secret viene mai esposto nel frontend.
