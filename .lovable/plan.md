# Piano: Mobile UX + Resend Conferma Email

Lavoro diviso in 3 blocchi indipendenti, tutti additivi. Nessuna modifica a RLS, schema DB, Edge Functions, flusso OTP password reset, o identità visiva.

## PARTE 1 — Audit & fix mobile

**File toccati (solo CSS/layout):**

- `src/components/ModernDashboardLayout.tsx`
  - `h-screen` → `min-h-[100dvh] h-[100dvh]` con fallback.
  - Top bar mobile: aggiungere `pt-[env(safe-area-inset-top)]` e altezza dinamica.
  - Scrollable wrapper: `p-8` → `px-4 py-4 lg:p-8`, mantenendo `pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8`.
  - Main `pt-16` → `pt-[calc(4rem+env(safe-area-inset-top))] lg:pt-0`.

- `src/components/mobile/MobileBottomNav.tsx`
  - Verificare safe-area inset bottom già presente; altrimenti aggiungere.

- `src/index.css`
  - Aggiungere utility `.no-x-overflow { overflow-x: hidden; }` su `html, body, #root` e `max-width: 100vw`.

- `src/pages/Dashboard.tsx` (audit mirato)
  - Header actions: `flex-wrap gap-2` su mobile.
  - Chart cards: `h-[220px] sm:h-[300px]`, `ResponsiveContainer` con `minWidth=0`.
  - Titoli lunghi: `truncate` / `break-words`.
  - Griglie: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

- `src/pages/MyDreams.tsx`, `NewDream.tsx`, `DreamDetail.tsx`, `Profile.tsx`, `Settings.tsx`, `Astrology.tsx`, `Alchemy.tsx`
  - Solo pass mirato: rimuovere width fissi, aggiungere `min-w-0`, `flex-wrap`, padding mobile responsive. Nessuna ristrutturazione.

- `src/pages/Auth.tsx`
  - Card `max-w-md` → ok; aggiungere `mx-4` e `p-4 sm:p-6`.
  - `TabsList grid-cols-3`: ridurre font + `text-xs sm:text-sm`, label "Pro" su mobile per la terza tab.
  - `paddingTop` valore corrente sostituito con classe responsive.

**Verifica:** `npm run build` + check visuale a 320/360/390/414/430px.

## PARTE 2 — Resend conferma email

### Nuovo componente
`src/components/auth/ResendConfirmationForm.tsx`
- Input email + zod validation.
- `supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${base}/auth?confirmed=1` } })`
- Messaggio generico anti-enumeration.
- Cooldown 60s (state + setInterval).
- Stile coerente con LoginForm.
- Nota anti-spam ("Controlla Spam/Promozioni...").

### `src/pages/Auth.tsx`
- Nuovo mode `resend-confirmation` via query param.
- Link sotto "Password dimenticata?" nel LoginForm: "Non hai ricevuto la conferma? Reinvia email".
- Render condizionale: se `mode === 'resend-confirmation'` mostra `ResendConfirmationForm` con bottone back.
- Se `searchParams.get('confirmed') === '1'`: toast "Email confermata! Ora puoi accedere."
- Stato condiviso `pendingEmail` per prefill resend dopo signup.

### `src/components/auth/LoginForm.tsx`
- Aggiungere link "Reinvia email di conferma" (props `onResendConfirmation`).

### `src/components/auth/SignupForm.tsx`
- Aggiungere pannello inline success (props `signupSuccess`, `onGoToLogin`, `onResend`).
- Titolo "Controlla la tua email" + testo + 2 azioni + nota scadenza link.
- Auth.tsx: dopo signup OK → `setSignupSuccess(true)`, preservare email, clear solo password.

### `src/components/auth/ProfessionalSignupForm.tsx`
- Stesso pannello success con testo: "Conferma la tua email, poi il profilo professionale resterà in attesa di approvazione."
- L'insert in `professional_profiles` resta invariato.

## PARTE 3 — Documentazione

Nuovo file `docs/email-deliverability-checklist.md` con la checklist SMTP/SPF/DKIM/DMARC/Resend come da specifica.

## Note tecniche

- Nessun secret nel frontend.
- Nessuna modifica a Edge Functions o tabelle.
- `emailRedirectTo` usa `import.meta.env.VITE_SITE_URL || window.location.origin` (stesso pattern del signup esistente).
- i18n: tutte le stringhe in italiano (memory rule).
- Build finale `npm run build` per validare TS.

## Out of scope

- Push notifications, PWA, ridisegni, nuove rotte protette, modifiche schema.
