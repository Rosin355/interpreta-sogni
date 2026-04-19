

## Piano: RouteProgressBar con soglia di apparizione (~250ms)

### Problema
La barra parte ad ogni cambio di route ma, grazie al prefetch idle, i chunk sono quasi sempre già in cache → `Suspense` non scatta → `loadingTick` non cambia → la barra resta a ~90% finché non cambia di nuovo route. Risultato: linea gradiente fastidiosa quasi sempre visibile.

### Soluzione
Aggiungere una **soglia di 250ms** prima di rendere la barra visibile. Se il nuovo content monta entro quella soglia (chunk già in cache), la barra non appare mai. Se invece il caricamento è più lento (chunk non prefetchato, rete lenta), la barra appare normalmente con feedback utile.

### Modifiche

**1. `src/components/loading/RouteProgressBar.tsx`** (unico file da modificare)

Logica:
- Al cambio `pathname`: avviare un **timer di 250ms** prima di settare `visible = true` e iniziare la progression.
- Se nel frattempo arriva il `loadingTick` (= mount completato), **cancellare il timer** e non mostrare nulla.
- Se invece il timer scatta prima del mount → comportamento attuale (barra appare, cresce asintoticamente, completa al 100% quando arriva loadingTick).
- Pulizia corretta dei timer in cleanup per evitare leak.

Pseudocodice:
```
useEffect on pathname:
  clear all timers
  hide bar (visible=false, progress=0)
  appearTimer = setTimeout(() => {
    visible = true
    progress = 10
    intervalRef = setInterval(asymptotic growth)
  }, 250)
  return cleanup

useEffect on loadingTick:
  if loadingTick changed:
    clear appearTimer  // <- chiave: se ancora pendente, niente barra
    if visible:
      complete to 100% then hide
    else:
      reset silently
```

### Cosa NON cambia
- `App.tsx`, `RouteFadeTransition`, `route-prefetch.ts`, marker Suspense → invariati.
- Comportamento sui chunk lenti / non prefetchati → identico a prima.
- Design e colori → identici.

### Tradeoff
- Su connessioni molto veloci la barra non apparirà quasi mai (è l'obiettivo).
- 250ms è una soglia standard (NProgress usa 200-300ms): sotto è percepito come "istantaneo", sopra l'utente inizia a percepire attesa e il feedback diventa utile.

