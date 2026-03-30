

## Piano: Ripristinare la nuova homepage e intro in Index.tsx

### Problema
`src/pages/Index.tsx` importa il vecchio `HeroSection` (che usa `animated-shader-hero`) invece dei nuovi componenti creati: `HomeHero`, `IntroOverlay`, `BlurIntroText`.

### Soluzione
Riscrivere `src/pages/Index.tsx` per:

1. Importare e mostrare `IntroOverlay` con logica `sessionStorage` (flag `intro_seen`)
2. Supporto parametro `?intro=1` per forzare il replay dell'intro
3. Usare i nuovi componenti: `HomeHero`, `PillarsSection`, `TransformationSection`, `HomeCTA`
4. Mantenere `Navigation` e `Footer`

### File modificato
- `src/pages/Index.tsx` — unico file da cambiare

### Struttura risultante
```
IntroOverlay (se non visto) → dissolve → Homepage
  Navigation
  HomeHero (starfield + "Dove il cielo incontra l'inconscio")
  PillarsSection (3 pilastri)
  TransformationSection (come funziona)
  HomeCTA (CTA finale)
  Footer
```

