

## Problema

Sullo screenshot l'utente vede il loader "VIAGGIO ALCHEMICO / Sto aprendo il tuo spazio interiore… 25%" — è il loader **interno** della pagina `/alchemy` (probabilmente in `useAlchemyJourney` o `Alchemy.tsx`), non il nuovo `RouteSwitchOverlay` (`MysticLoader` con testo "Cambio scenario onirico…").

Risultato: al cambio rotta vede **due loader diversi e in successione**:
1. `RouteSwitchOverlay` (mystic, 400ms minimo) — quello che abbiamo appena implementato
2. Loader interno della pagina (es. Alchemy con barra di progresso) — perché la pagina monta ma i dati non sono ancora pronti

L'utente vuole **un unico messaggio coerente** per ogni cambio pagina.

## Diagnosi da fare

Devo verificare:
1. Quali pagine hanno un loader interno che si mostra al mount (Alchemy, Astrology, Dashboard, MyDreams, AlchemistChat…)
2. Se questi loader sono "fullscreen" o inline
3. Se il `RouteSwitchOverlay` attuale viene effettivamente coperto/sostituito da questi loader interni

## Soluzione proposta

**Estendere `RouteSwitchOverlay` perché copra anche il fetch dati iniziale delle pagine**, tramite un context globale `RouteLoadingContext`:

- Le pagine con caricamento dati pesante (Alchemy, Astrology, Dashboard, ecc.) registrano `setPageLoading(true/false)` invece di renderizzare il proprio fullscreen loader.
- `RouteSwitchOverlay` resta visibile finché:
  1. il chunk lazy è montato (già implementato)
  2. il tempo minimo (400ms) è trascorso (già implementato)
  3. **NUOVO**: nessuna pagina ha dichiarato `pageLoading = true`
- I loader interni fullscreen delle pagine vengono **rimossi** (o downgradati a skeleton inline non-fullscreen) per evitare la sovrapposizione.

### File coinvolti (da confermare durante l'implementazione)
- `src/contexts/RouteLoadingContext.tsx` (nuovo)
- `src/components/loading/RouteSwitchOverlay.tsx` (consuma il context)
- `src/App.tsx` (provider attorno ad `AppRouter`)
- Pagine con loader fullscreen interno da rifattorizzare:
  - `src/pages/Alchemy.tsx` + `src/hooks/useAlchemyJourney.ts` (quello dello screenshot)
  - `src/pages/Astrology.tsx`
  - `src/pages/Dashboard.tsx`
  - `src/pages/MyDreams.tsx` (se presente)
  - eventuali altri da scoprire con grep su `MysticLoader fullScreen` / `AppLoadingOverlay`

### Comportamento finale
- **Un solo overlay** (`RouteSwitchOverlay` con `MysticLoader`) visibile da quando l'utente clicca su un link fino a quando la pagina è completamente pronta (chunk montato + dati caricati + min 400ms).
- I loader interni delle pagine non scompaiono del tutto: diventano skeleton inline o spinner discreti per refresh successivi (non più fullscreen al primo mount).
- Testo coerente: "Cambio scenario onirico…" o un testo neutro unico.

### Cosa NON cambia
- Logica dati (fetch, hook, query) intatta.
- `RouteProgressBar` resta com'è.
- Animazioni e design del `MysticLoader` invariati.

## Diagrammi di flusso

```text
PRIMA (problema)
click → [RouteSwitchOverlay 400ms] → unmount → [Loader interno Alchemy 25%→100%] → pagina

DOPO (soluzione)
click → [RouteSwitchOverlay] ───────────────────────────────────────→ pagina
                  └─ resta visibile finché pageLoading=false
```

## Note tecniche

- Il context espone `setPageLoading(key: string, loading: boolean)` con map interna, così più pagine/hook possono coesistere senza sovrascrivere lo stato.
- Cleanup automatico in `useEffect` return delle pagine.
- Hook helper `usePageLoading(loading: boolean, key?: string)` per ridurre boilerplate.
- Safety timeout di 8s per evitare overlay bloccato in caso di errori di fetch.

