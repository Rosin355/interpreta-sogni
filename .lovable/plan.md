## Problema

In `src/pages/SharedDreamsReceived.tsx` i pulsanti "Visualizza Sogno" navigano a `/dream/${share.dream_id}` (singolare), ma la rotta canonica del progetto è `/dreams/:id` (plurale, vedi memory "Canonical Dream Route"). Risultato: 404.

Lo stesso bug è presente anche in `src/pages/SharedDreams.tsx` (versione professionisti), che usa `/dream/${share.dream_id}` in 3 punti.

## Fix

1. `src/pages/SharedDreamsReceived.tsx` — cambiare i 3 `navigate(\`/dream/${share.dream_id}\`)` in `/dreams/${share.dream_id}`.
2. `src/pages/SharedDreams.tsx` — stessa correzione nei 3 punti.
3. Verifica rapida con `rg "/dream/"` per assicurarsi che non restino altre rotte sbagliate analoghe nel codice, e correggerle se trovate.

Nessuna modifica a DB, edge functions o logica.