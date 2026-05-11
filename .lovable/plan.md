## Diagnosi

Hai due problemi distinti, entrambi confermati.

### 1. Doppio input data → confusione

In `src/components/BirthDataForm.tsx` (campo `birthDate`) sono renderizzati **due controlli**:
- un `Button` con `Popover` + `Calendar` (con dropdown anno)
- un `<Input type="date">` nativo HTML5

Entrambi modificano lo stesso `field.value`, ma all'utente sembrano due campi diversi → blocca/confonde la compilazione (e se ne lascia uno vuoto → submit fallisce).

### 2. Pagina vuota dopo il salvataggio

Verificato sul DB: il profilo dell'utente `decatilinae` ha:
- `planets: {}` (vuoto)
- `aspects: []` (vuoto)
- `houses`: 12 case generate dal **fallback** (non dall'API)
- `ascendant`: Ariete 0° (default)

L'API RapidAPI ha risposto 200 OK (niente errore), ma il parser in `calculate-natal-chart` non ha trovato nulla. La causa è la **struttura della risposta** dell'endpoint Astrologer v5 `/chart-data/birth-chart`: i dati sono annidati sotto una chiave `data` (es. `{ status, data: { planets: [...], houses: [...], aspects: [...] } }`), mentre il codice legge direttamente `chartData.planets`, `chartData.houses`, `chartData.aspects`, `chartData.ascendant`, `chartData.midheaven`. Risultato: array vuoti → la UI mostra le tab "Pianeti / Case / Aspetti" senza contenuto, come nello screenshot.

(Nota: il profilo di Romesh ha ancora 22 pianeti perché era stato calcolato con una versione precedente del codice/API, prima del nuovo payload.)

## Modifiche

### 1. `src/components/BirthDataForm.tsx` — un solo selettore data

Rimuovere il `<Input type="date">` nativo e lasciare **solo** il `Popover` con `Calendar` + dropdown anno (più coerente con il design "Editorial Mystic" e con il resto del form, e già supporta navigazione veloce per anno dal 1900). Aggiornare il `FormDescription` da "Seleziona dal calendario o inserisci manualmente" a qualcosa come "Seleziona dal calendario".

Se preferisci tenere il nativo (più rapido su mobile/iOS) invece del popover, fammelo sapere prima dell'implementazione — vedi la domanda finale.

### 2. `supabase/functions/calculate-natal-chart/index.ts` — parser risposta

Dopo il `chartData = await dataRes.json()`, normalizzare la struttura:

```ts
// Astrologer v5 può restituire i dati sotto chartData.data
const payload = chartData?.data ?? chartData;
const apiPlanets = payload.planets || [];
const apiHouses = payload.houses || [];
const apiAspects = payload.aspects || [];
const apiAscendant = payload.ascendant;
const apiMidheaven = payload.midheaven;
```

E usare queste variabili al posto di `chartData.planets`, `chartData.houses`, `chartData.aspects`, `chartData.ascendant`, `chartData.midheaven`.

In più, aggiungere un check di sanità: se `apiPlanets.length === 0` **e** `apiHouses.length === 0`, restituire `UPSTREAM_UNAVAILABLE` con dettaglio admin (`response shape unexpected: <keys>`) invece di salvare un tema vuoto. Loggare anche `Object.keys(payload)` per diagnosi.

### 3. Recovery dato già corrotto

Una volta deployata la fix, l'utente `decatilinae` può ricalcolare il tema natale dal pulsante "Modifica Dati" e i dati verranno sovrascritti correttamente. Nessuna migrazione DB necessaria.

## Fuori scope

- Nessuna modifica a UI della pagina `/astrology` (le tab funzioneranno automaticamente quando i dati saranno popolati).
- Nessuna modifica all'error-handling system, già unificato.
- Nessuna modifica a `birthTime` o `birthPlace`.

## Verifica

1. Aprire `/astrology` come `decatilinae`, cliccare "Modifica Dati", confermare dati di nascita.
2. Edge logs devono mostrare `[chart-data] ✅ OK — planets=10+, houses=12`.
3. Tornare alla pagina: pilastri (Sole/Luna/Ascendente), griglia aspetti e tab "Pianeti / Case / Aspetti" devono essere popolati.
4. Verificare che il form mostri **un solo** selettore data.

## Domanda

Per il selettore data, quale preferisci?
- (A) Solo il **Popover Calendar** (con dropdown anno 1900→oggi) — più coerente con il design.
- (B) Solo l'input **nativo `<input type="date">`** — più veloce su mobile/iOS (in linea con la strategia native iOS del progetto).

Nel piano sopra ho assunto (A); confermami o cambia.