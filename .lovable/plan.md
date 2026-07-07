## Root cause

Il dominio produzione `https://dreamalchemist.app` mostra schermo blu/vuoto perché:

1. **Origine reale**: `POST https://…supabase.co/auth/v1/token?grant_type=refresh_token` risponde **522 (Cloudflare origin timeout)**. Una risposta 522 non contiene gli header `Access-Control-Allow-Origin`, quindi il browser la segnala come errore CORS. Il CORS è un sintomo, non la causa: è un problema temporaneo/di config dell'endpoint Auth di Supabase, non del nostro codice.
2. **Perché diventa schermo blu**: in `src/hooks/useAuth.ts` il refresh fallito lancia un `TypeError: Failed to fetch`. La `Promise` di `supabase.auth.getSession()` va in `.catch(handleAuthError)`. `handleAuthError` fa `signOut()` (che tenta di nuovo il network e può rilanciare) e imposta `globalLoading = false` SOLO se il messaggio contiene "Refresh Token" o status 400/401. Un `TypeError` di rete non matcha → `globalLoading` resta `true` per sempre → `AppLayout` fa `if (loading) return null` → **schermo vuoto**.

Quindi la fix frontend giusta è: **rendere `useAuth` a prova di errore di rete**, in modo che qualunque fallimento del boot auth porti comunque `loading=false` e utente `null`, così l'app renderizza la landing/login pubblica invece di rimanere in bianco.

## Piano di intervento

### 1. Fix frontend resilienza (`src/hooks/useAuth.ts`)

- Riscrivere `handleAuthError` per **sempre** impostare `globalLoading = false` e `globalUser = null`, indipendentemente dal tipo di errore. Log conciso senza token/sessione.
- `signOut()` racchiuso in try/catch: se offline o Supabase down, non deve rilanciare.
- Chiamare `localStorage.removeItem` sulla chiave `sb-<ref>-auth-token` solo se lo status è 400/401 (refresh token invalido). In caso di errore di rete puro (522, TypeError) **non** cancellare la sessione: il token potrebbe essere ancora valido e verrà riprovato al prossimo evento auto-refresh.
- Aggiungere un **timeout di sicurezza** (es. 4s) sul boot: se dopo 4s né la promise di `getSession()` né `onAuthStateChange` hanno risolto `globalLoading`, forzare `globalLoading = false` (utente resta `null`) così la UI mostra almeno la landing pubblica.
- Nessun loop infinito: il retry lo gestisce già il client Supabase internamente; noi non aggiungiamo retry manuali.

### 2. Nessuna modifica al client (`src/integrations/supabase/client.ts`)

`autoRefreshToken: true` va bene. Nessun override di `fetch`, nessun cambio di storage.

### 3. Nessuna modifica a: Edge Functions, migrazioni, iOS, provider AI, Astrologer, secrets.

### 4. Verifica locale

- `npm run build` per confermare compilazione.
- Typecheck (`tsgo` se disponibile) sui file toccati.
- Test manuale: simulare boot con `localStorage` "sporco" per confermare che la landing renderizza invece dello schermo bianco (facoltativo, coperto dalla logica).

### 5. Config Supabase Dashboard (report, nessuna modifica automatica)

L'errore 522 **non** dipende da Site URL/Redirect URLs (quelli darebbero errori 400/403, non 522). Tuttavia, per igiene, verificare in dashboard che siano presenti:

- **Site URL**: `https://dreamalchemist.app`
- **Redirect URLs** (Additional):
  - `https://dreamalchemist.app/**`
  - `https://www.dreamalchemist.app/**`
  - `https://interpreta-sogni.lovable.app/**`
  - `https://id-preview--579b4e62-1239-4277-a4c7-d1bec80def7d.lovable.app/**`

Se il 522 persiste dopo il fix frontend (l'app non è più bianca ma il login continua a fallire), va aperto un ticket a Supabase: 522 = origin timeout lato loro, non risolvibile da codice cliente. Nessuna impostazione CORS lato Supabase Auth è esposta in dashboard (gestita automaticamente).

### 6. Commit

Solo `src/hooks/useAuth.ts`. Messaggio: `fix: handle Supabase auth refresh failures gracefully`. Nessun push/deploy.

## Dettagli tecnici (per revisione)

```text
useAuth boot flow (nuovo):

  getSession() ──ok──▶ set user, loading=false
        │
        ├─err(network/522/TypeError)──▶ log warn, loading=false, user=null (KEEP local session)
        │
        └─err(400/401 refresh invalid)─▶ signOut()(try/catch), clear, loading=false

  Safety timeout 4s:
        loading===true dopo 4s ──▶ force loading=false (user=null)

  onAuthStateChange: invariato, continua a aggiornare stato.
```

## Deliverables finali del report post-implementazione

- Root cause (già sopra)
- File modificati: `src/hooks/useAuth.ts`
- Frontend fixato: sì
- Config dashboard da aggiornare: verificare Site/Redirect URLs (probabilmente già ok; 522 non è config)
- Build/typecheck: risultati
- Commit hash
- Nessuna modifica iOS / migrazioni / secrets stampati / Edge Functions / AI providers