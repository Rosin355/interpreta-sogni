
## Diagnosi

Verifica su DB ed Edge Function:

- **Tabella `profiles`**: i 3 utenti più recenti (12-14 aprile 2026: `serquetsept`, `alemunari90`, `luca`) hanno il profile creato dal trigger ma `birth_date / birth_time / birth_latitude / birth_longitude / natal_chart_data` tutti `NULL`. Hanno tentato il calcolo ma non è mai andato a buon fine.
- **Edge Function `calculate-natal-chart`**: zero log recenti, zero entry in `error_logs`. Gli errori del form non vengono tracciati perché `BirthDataForm` usa solo `toast` locali e non passa per il sistema centralizzato di error reporting.

### Bug identificati

1. **Mismatch nel contratto di risposta della Edge** (`calculate-natal-chart/index.ts`)
   - Cache HIT (riga 187): `{ success: true, data: ..., fromCache: true }`
   - Calcolo nuovo (riga 684): `{ success: true, natalChartData }`
   - Due chiavi diverse per lo stesso payload. Bomba a orologeria per qualunque consumer futuro.

2. **Errori silenti nel form** (`BirthDataForm.tsx`)
   - Non si estrae il body strutturato dell'edge (`error.context?.json()`).
   - Non si invia nulla a `error_logs`.
   - L'utente vede solo un toast generico, noi non vediamo nulla.

3. **`Astrology.tsx` fragile per nuovi utenti**
   - `loadUserData` usa `.single()` con `if (error) throw error;`. Se il profilo non c'è ancora (timing trigger), pagina vuota senza messaggio.

4. **Causa più probabile del fallimento end-to-end**: Free Astrology API ha probabilmente esaurito il limite giornaliero. La Edge gestisce esplicitamente "Limit Exceeded" (righe 270-277 e 354-363) ma il messaggio non finisce in `error_logs` né viene differenziato dall'utente. Compatibile con: 3 utenti consecutivi falliti, nessun log di funzione, profili rimasti vuoti.

## Cosa farò

### 1. Osservabilità reale + uso del componente di segnalazione errori
- In `BirthDataForm.tsx`:
  - Estrarre il body errore dell'edge col pattern standard `await error.context?.json()` (memory `architecture/edge-functions-error-extraction`).
  - Loggare in `error_logs` con `function_name = 'calculate-natal-chart'` + payload completo (status, body, attempt) usando il pattern `useErrorReporting` già usato per `generate-dream-image`.
  - Sostituire il `toast.error` di sonner con il toast classico `useToast()` + **`buildErrorReportAction`** (`src/utils/error-toast-action.tsx`) — lo stesso bottone "Invia segnalazione" usato per gli altri errori.
  - Codici errore distinti: `NATAL_CHART_LIMIT_EXCEEDED`, `NATAL_CHART_INVALID_INPUT`, `NATAL_CHART_NETWORK`, `NATAL_CHART_API_ERROR`, `NATAL_CHART_AUTH`.

### 2. Edge Function: contratto unificato + log strutturato + salvataggio dati di nascita anche in caso di failure
- Cache HIT e calcolo nuovo restituiscono la stessa shape: `{ success: true, natalChartData, fromCache }`.
- In caso di "Limit Exceeded" o errore upstream, **salvare comunque** `birth_date / birth_time / birth_place_name / birth_latitude / birth_longitude / birth_timezone` nel profile (così l'utente non deve reinserirli al prossimo tentativo) e restituire `400/503` con `errorCode: 'NATAL_CHART_LIMIT_EXCEEDED'`.
- Aggiungere log strutturato a inizio richiesta e prima di ogni `throw` (request id, user id, attempt, status upstream).

### 3. Hardening `Astrology.tsx`
- `.single()` → `.maybeSingle()`.
- Stato vuoto gestito esplicitamente (mostra il form anche se `profileData` è null).

### 4. Backfill
- Non automatizzabile. I 3 utenti dovranno reinserire i dati. Dopo i fix, in caso di nuovo fallimento (a) loggheremo l'errore strutturato, (b) i dati di nascita saranno comunque salvati per il retry.

## File toccati

- `supabase/functions/calculate-natal-chart/index.ts`
- `src/components/BirthDataForm.tsx`
- `src/pages/Astrology.tsx`

## Limiti

- Non posso confermare al 100% che la causa sia "Free Astrology API Limit Exceeded" finché un nuovo utente non riprova: l'assenza totale di log lo rende lo scenario più probabile. Possibili alternative residue (timezone parsing, geocoding senza coordinate, sessione auth scaduta) saranno comunque distinguibili nella prossima occorrenza grazie al nuovo logging.

Procedo.
