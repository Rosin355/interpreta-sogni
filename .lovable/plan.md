
# Annuncio Lancio + Raccolta Email Pre-Lancio

Implementazione di un pop-up mistico/editoriale che informa gli utenti che l'app è gratuita fino al **19 luglio 2026**, con checkbox di presa visione obbligatoria e campo email opzionale per essere avvisati del lancio + sconto.

## 1. Verifica super admin (preliminare)

Eseguo una query di sola lettura su `user_roles` per confermare la presenza di almeno un `super_admin` (la memoria indica `b54f9e25-381c-4029-a096-8cb1c44c94b7`). Se mancante, lo segnalo prima di procedere.

## 2. Database (migrazione, non distruttiva)

Nuova tabella `launch_announcement_acknowledgments`:

```
id              uuid pk
user_id         uuid not null  -- riferimento logico ad auth.users
acknowledged_at timestamptz not null default now()
email           text null      -- opzionale, per newsletter pre-lancio
wants_updates   boolean not null default false
created_at      timestamptz not null default now()
unique (user_id)
```

RLS:
- **INSERT**: utente autenticato, solo per `auth.uid() = user_id`.
- **SELECT (own)**: utente vede la propria riga (serve al client per sapere se ha già accettato → niente popup ripetuto).
- **SELECT (super admin)**: `is_super_admin(auth.uid())` vede tutto incluso `email`.
- **UPDATE/DELETE**: negati lato client.

Nessuna modifica a tabelle esistenti. Nessun trigger su schemi riservati.

## 3. Componente pop-up (frontend)

Nuovo file `src/components/LaunchAnnouncementDialog.tsx`:
- Basato su `Dialog` shadcn, stile "Dramatic/Editorial Mystic" (sfondo nero/magenta, bordo glow, font `font-editorial` uppercase tracking ampio, divider sottile dorato).
- Contenuto in italiano:
  - Titolo: "Un dono per l'inizio del viaggio"
  - Sottotitolo data: "Dream Alchemist è gratuita fino al 19 luglio 2026"
  - Breve testo poetico sul lancio definitivo + futuro piano a pagamento.
- Checkbox obbligatoria: "Ho letto e compreso l'avviso" (bottone CTA disabilitato finché non spuntata).
- Campo email **opzionale** + checkbox "Voglio ricevere in anteprima novità e sconto esclusivo del lancio".
- Validazione email con `zod` (`.email().max(255)`), trim.
- CTA: "Entra nell'Alchimia". Cancel non previsto (pop-up bloccante leggero, ma chiudibile solo dopo aver spuntato l'avviso).

## 4. Integrazione globale

In `src/components/AppLayout.tsx` (solo ramo loggato, dentro `ModernDashboardLayout`):
- Hook `useLaunchAcknowledgment()` che, post-auth, fa `select` su `launch_announcement_acknowledgments` per `auth.uid()`.
- Se nessuna riga → monta `<LaunchAnnouncementDialog />`.
- Salvato il record, lo stato locale evita re-render del dialog.
- Non viene mostrato in `/auth`, `/`, `/dream/shared/:token` (già esclusi dal layout).
- Nessuna modifica al menu mobile o al routing per non toccare i fix recenti.

## 5. Vista admin

In `src/pages/AdminDashboard.tsx` aggiungo una nuova tab "Pre-Lancio" che usa un nuovo componente `src/components/admin/LaunchEmailsList.tsx`:
- Lista paginata di iscritti con `email`, `wants_updates`, `acknowledged_at`, `user_id`.
- Solo super admin (gate via `is_super_admin`); per non-super admin la tab non compare.
- Pulsante "Esporta CSV" lato client.
- Logging via `logSuperAdminAccess('audit_logs', 'view_launch_emails')`.

## 6. Cosa NON cambia

- Nessuna modifica a `App.tsx`, `ModernDashboardLayout.tsx` (menu mobile), `mini-navbar.tsx`, route prefetch, overlay di transizione.
- Nessuna modifica alle edge functions esistenti.
- Nessun nuovo secret richiesto.

## 7. Verifica finale

- Login con utente normale → pop-up appare, checkbox obbligatoria, email opzionale, salvataggio ok, al refresh non riappare.
- Login con super admin → pop-up appare una sola volta + tab admin mostra le email.
- Mobile 390×844 → layout dialog leggibile, tap su CTA risponde, navigazione menu invariata.

---

## Dettagli tecnici (riferimento)

- File nuovi: `src/components/LaunchAnnouncementDialog.tsx`, `src/hooks/useLaunchAcknowledgment.ts`, `src/components/admin/LaunchEmailsList.tsx`.
- File modificati: `src/components/AppLayout.tsx` (montaggio dialog), `src/pages/AdminDashboard.tsx` (nuova tab).
- Migrazione: tabella + RLS sopra.
- Validazione: `zod` schema email + trim, lunghezza max 255.
- Data limite hardcoded come costante `LAUNCH_DATE = '2026-07-19'` in `src/config/publicConfig.ts`.
