# Piano in due step

## STEP 1 — Fix UI paywall (subito)

**File:** `src/components/marketing/PaywallBlur.tsx`

Problema: l'overlay CTA è in `absolute inset-0` e si sovrappone al testo sfocato (collisione visibile nello screenshot: "LA VOCE DELL'ALCHIMISTA CONTINUA" finisce sopra al teaser).

Soluzione: rimuovere il posizionamento absolute e impilare i due blocchi nel flusso normale.

```text
┌──────────────────────────────┐
│  Teaser sfocato (h-32)       │  ← blur + mask fade-out in basso
│  ░░░░░░░░░░░░░░░░░░          │
└──────────────────────────────┘
        ↓ gradient bridge (h-12, da transparent a background)
┌──────────────────────────────┐
│  ✦ LA VOCE DELL'ALCHIMISTA ✦│
│  Sblocca l'interpretazione…  │
│  [ CTA Button ]              │
│  Hai già un account? Accedi  │
│  🔒 Contenuto riservato      │
└──────────────────────────────┘
```

Dettagli tecnici:
- Teaser: `max-h-32` (più corto), `overflow-hidden`, blur 6px, mask fade verso il basso
- Bridge: div separato `h-12 -mt-8` con `bg-gradient-to-b from-transparent to-background`
- CTA block: nel flusso normale (no `absolute`), `text-center max-w-md mx-auto pt-2`
- Nessun cambio all'API del componente (props identiche)

Niente altri file toccati.

---

## STEP 2 — Tracking attribuzioni (dopo aver visto la UI fixata)

**Obiettivo:** sapere quanti utenti si registrano arrivando da un sogno pubblico, e quali sogni convertono di più.

### 2a. Database (1 migrazione)

Nuova tabella `signup_attributions`:

| Campo | Tipo | Note |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | utente registrato (auth.uid) |
| source | text | `visione`, `direct`, `share_email`, `share_link`, `other` |
| dream_id | uuid nullable | sogno che ha innescato la registrazione |
| referrer | text nullable | document.referrer al momento del signup |
| created_at | timestamptz | |

RLS:
- INSERT: solo per il proprio `user_id` (autenticato)
- SELECT: solo admin (`is_admin(auth.uid())`)
- Nessun UPDATE/DELETE lato client

GRANT: `INSERT` + `SELECT` a `authenticated`, `ALL` a `service_role`.

### 2b. Frontend (~50 righe)

`src/pages/Auth.tsx`:
- Dopo `signUp` riuscito (sia normale che professional), leggere `searchParams`: `from`, `dream`
- Insert su `signup_attributions` con `source = from || 'direct'`, `dream_id = dream || null`, `referrer = document.referrer`
- Best-effort: fallisce silenziosamente (non blocca registrazione)

Nessun tracking esterno, nessuna PII oltre a quella già in `auth.users`.

### 2c. Admin dashboard (componente nuovo)

`src/components/admin/AdminAttributionStats.tsx` integrato in `AdminDashboard.tsx`:
- Card "Iscrizioni da Visioni Condivise" (ultimi 30gg) con conteggio + delta vs periodo precedente
- Top 5 "Sogni magnetici" (sogni con più signup attribuiti): titolo + n. conversioni + link a `/visione/:id`
- Distribuzione per `source` (pie/bar semplice in HTML, no Recharts)

### 2d. (Opzionale, dopo aver visto i numeri)

Counter "sognatori attivi" su `/visione/:id` come social proof — solo se il numero reale è ≥100, altrimenti omettere per non sembrare vuoti. Useremo una semplice query cached client-side (5min) su `count` di `profiles`, niente edge function dedicata.

---

## Esecuzione

Procediamo **solo con STEP 1** ora. Quando vedrai la UI sistemata, conferma se ti piace e passiamo a STEP 2.
