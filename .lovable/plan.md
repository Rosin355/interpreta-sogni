Obiettivo: rendere il tap sul menu mobile deterministico: il cambio URL e la chiusura del menu devono avvenire subito, anche se Dashboard o altre pagine stanno ancora caricando dati.

Piano di intervento:

1. Separare navigazione e fetch dati
- Rimuovere l’uso del caricamento dati pagina come condizione che può influenzare overlay/transizioni globali.
- Fare in modo che i fetch lenti della Dashboard restino confinati agli skeleton interni della pagina, senza bloccare interazioni di navigazione.

2. Rendere il menu mobile “hard navigate”
- Nel menu autenticato, sostituire il click fragile con un handler unico che:
  - previene propagazioni indesiderate,
  - chiude subito il menu,
  - forza il cambio route nel frame successivo con `navigate()`.
- Gestire anche il tap sulla pagina corrente: deve chiudere il menu immediatamente.

3. Evitare race condition con overlay e animazioni
- Disaccoppiare `RouteSwitchOverlay` dal caricamento dati e renderlo puramente visivo/non interattivo.
- Ridurre/eliminare eventuali exit animation del menu mobile che possano rimanere sopra la nuova pagina quando il tap avviene durante un fetch.

4. Consolidare il prefetch senza saturare il primo caricamento
- Evitare che `startRoutePrefetch(true)` apra troppi import contemporaneamente al primo tap del menu, perché su mobile può rallentare la risposta.
- Prefetchare solo la rotta toccata su `pointerdown`, lasciando la navigazione libera di partire subito.

5. Verifica mirata
- Testare su viewport mobile 390×844:
  - caricare `/dashboard`,
  - aprire il menu mentre la dashboard è ancora in loading,
  - tappare “I Miei Sogni”,
  - confermare che URL diventi `/my-dreams`, menu si chiuda e la pagina mostri subito skeleton/contenuto.
- Ripetere su almeno un’altra voce del menu per confermare che non sia un fix specifico solo per “I Miei Sogni”.

File previsti:
- `src/components/ModernDashboardLayout.tsx`
- `src/components/ui/mini-navbar.tsx` se lo stesso pattern è utile anche nel menu pubblico
- `src/components/loading/RouteSwitchOverlay.tsx`
- eventualmente `src/utils/route-prefetch.ts` per rendere il prefetch meno aggressivo al primo tap