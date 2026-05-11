## Problema

Dai log Edge dell'ultima chiamata:
- `POST /api/v5/chart-data/birth-chart` → **429** (Too many requests)
- `POST /api/v5/context/birth-chart` → **422** Validation failed
  - `subject.city: Field required`
  - `subject.timezone: Input should be a valid string`

Il payload attuale invia `timezone: 1` (numero) e nessun campo `city`. L'endpoint `chart-data` lo accettava (errore 429 era solo quota), ma `context` ha schema più stretto e fallisce **sempre**, anche con quota piena. Quindi anche dopo l'upgrade RapidAPI il tema natale continuerà a fallire al secondo endpoint.

In più, il client mostra all'utente solo "INTERNAL_ERROR" / messaggio fallback: `handleEdgeError` non riesce a leggere il body strutturato (`API_QUOTA_EXCEEDED`, dettagli per admin) perché `extractErrorBody` ingoia eccezioni e perché su `FunctionsHttpError` conviene anche provare a leggere `error.context` come testo prima di fare `JSON.parse`.

## Modifiche

### 1. `supabase/functions/calculate-natal-chart/index.ts`

Costruire un `subject` valido per **entrambi** gli endpoint:

- Aggiungere `city: placeName` (stringa, derivata da `birthPlace.placeName`, fallback `"Unknown"`).
- Aggiungere `nation: "IT"` come default (o estrarlo dall'ultima parola di `placeName` quando possibile — opzionale).
- Inviare `timezone` come **stringa IANA** (es. `"Europe/Rome"`) usando `tz-lookup` dalle coordinate. Se non disponibile, fallback a stringa offset tipo `"Etc/GMT-1"` derivata dal numero (regola: `Etc/GMT` usa segno invertito).
- Mantenere `longitude`/`latitude`/`year`/`month`/`day`/`hour`/`minute` come oggi.
- Costruire due payload separati se i due endpoint hanno schemi diversi: `astrologerDataBody` (può continuare con timezone numerico se già funziona) e `astrologerContextBody` (con city + timezone stringa).
- Se il context endpoint fallisce ma data riesce: salvare comunque il tema natale e impostare `natal_context = ""` con un warning nei log, restituendo `success: true` (il context è "nice to have").
- Se entrambi falliscono per quota → continuare a restituire `API_QUOTA_EXCEEDED` (già OK).
- Se data riesce e context dà 422 → loggare e proseguire senza context, **non** restituire errore all'utente.

Per `tz-lookup` in Deno usare `npm:tz-lookup@6` (no native deps). In alternativa, mappa hardcoded delle 30 timezone più comuni + fallback `Etc/GMT±N` calcolato dall'offset.

### 2. `src/utils/handle-edge-error.ts`

Rendere `extractErrorBody` più robusto:

- Provare prima `await ctx.clone().json()`.
- Se fallisce, fare `await ctx.clone().text()` e tentare `JSON.parse`.
- Loggare a `console.warn` quando la lettura fallisce (con status, content-type) per diagnosi futura.
- Inoltre, se `data` passato in input contiene `errorCode`, usarlo direttamente (già fatto) — ok.

Nessuna modifica al contratto pubblico della funzione.

### 3. `src/components/BirthDataForm.tsx`

Verifica veloce: confermare che venga passato `isSuperAdmin: true` quando l'utente loggato è super admin (così Romesh vede `[ADMIN] ...` con dettagli reali invece del messaggio generico). Se manca, usare `useIsSuperAdmin()` e passarlo a `handleEdgeError`.

## Verifica

1. Test manuale del tema natale come Romesh: con quota RapidAPI riattivata, dovrebbe completare. Con quota esaurita, l'utente vede il messaggio neutro e l'admin riceve email + toast `[ADMIN]` con il vero motivo.
2. Controllare i log Edge: niente più 422 da `context/birth-chart`.
3. Se l'API `context` continua a dare 422 con il nuovo payload, il tema natale **viene comunque salvato** (campo `natal_context` vuoto).

## Fuori scope

Niente cambi a UI o ad altre edge function: il problema è circoscritto a `calculate-natal-chart` + estrazione errori client.