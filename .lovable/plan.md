## Obiettivo

Sostituire la ruota zodiacale attuale (renderizzata client-side con `@astrodraw/astrochart` su sfondo bianco) con la **chart SVG nativa** generata dall'API Astrologer/Kerykeion in **tema dark**, identica allo screenshot allegato (John Lennon — Dark Theme — Birth Chart): ruota zodiacale + linee di aspetto colorate al centro + colonna dati pianeti/cuspidi a destra + griglia degli aspetti in basso a destra, tutto in un'unica immagine vettoriale.

## Cosa cambia

### 1. Edge function `calculate-natal-chart`
Aggiungere una **terza chiamata** all'endpoint `POST /api/v5/birth-chart` di Astrologer (oltre a `chart-data` e `context` già usati), con body:

```
{
  subject: { ...stessi dati di nascita, zodiac_type: "Tropic" },
  theme: "dark",
  language: "IT",
  wheel_only: false
}
```

La risposta contiene `chart` come stringa SVG completa. Salvarla in `profiles.natal_chart_svg` (nuova colonna `text`).

Comportamento robusto:
- Se la chiamata SVG fallisce, **non** bloccare il salvataggio: si mantiene il fallback alla ruota client-side esistente.
- Cache: rigenerare l'SVG solo se i dati di nascita cambiano (stessa logica di cache già presente).

### 2. Database
Migrazione: aggiungere `natal_chart_svg text` a `profiles`.

### 3. Frontend — pagina Astrology
- Nuovo componente `NatalChartSVG.tsx` che riceve la stringa SVG e la renderizza con `dangerouslySetInnerHTML` dentro un container responsive (max-width, scroll orizzontale su mobile).
- In `src/pages/Astrology.tsx`: se `profile.natal_chart_svg` è presente, mostrare `<NatalChartSVG />` al posto di `<AstroChartWheel />`.
- Poiché l'SVG nativo include già la **griglia degli aspetti** in basso a destra, **rimuovere** anche `<AspectGrid />` dalla pagina quando l'SVG nativo è disponibile (per evitare duplicazione).
- Mantenere intatti gli altri blocchi (Pilastri Astrologici, Riepilogo Dati di Nascita, descrizioni pianeti/case).

### 4. Pulizia opzionale
Lasciare `AstroChartWheel.tsx` e `AspectGrid.tsx` in repo come fallback per i profili vecchi che non hanno ancora `natal_chart_svg` (verranno usati finché l'utente non ricalcola il tema).

## Dettagli tecnici

- Endpoint: `https://astrologer.p.rapidapi.com/api/v5/birth-chart` (header `X-RapidAPI-Key`, `X-RapidAPI-Host`).
- L'SVG ritornato è autocontenuto (font, colori, gradients inline) → nessun CSS aggiuntivo richiesto.
- `theme: "dark"` produce sfondo blu-notte coerente con il design "Dramatic Mystic" del progetto.
- `language: "IT"` localizza le label (Sole/Luna/Mercurio…) dove supportato dalla libreria; in caso contrario resta inglese (Sun/Moon).
- Dimensioni: l'SVG ha `viewBox` proprio; basta `width: 100%; height: auto` nel container.

## Verifica post-deploy

1. Ricalcolare il tema natale per l'utente di test → confermare che `profiles.natal_chart_svg` non è null.
2. La pagina `/astrology` mostra la chart in stile dark identica alla demo, senza la vecchia ruota bianca né la griglia aspetti separata.
3. Profili senza `natal_chart_svg` continuano a vedere la versione client-side (nessuna regressione).
