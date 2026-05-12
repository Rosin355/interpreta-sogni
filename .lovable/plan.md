## Obiettivo

Rimuovere completamente dal codice sia la **Griglia degli Aspetti** sia la **Ruota Zodiacale** (fallback client-side). Resta solo l'SVG nativo dark dell'API Astrologer come visualizzazione grafica del tema natale.

## Modifiche

### 1. `src/pages/Astrology.tsx`
- Rimuovere import `AstroChartWheel` e `AspectGrid`.
- Sostituire il blocco condizionale (righe 287–297) con il solo render di `<NatalChartSVG svg={profile.natal_chart_svg} />`, mostrato solo se l'SVG esiste. Se manca, mostrare un piccolo messaggio/CTA che invita a (ri)calcolare il tema natale tramite "Modifica Dati".

### 2. File eliminati
- `src/components/AstroChartWheel.tsx`
- `src/components/AspectGrid.tsx`

### 3. Dipendenza
- Rimuovere il pacchetto `@astrodraw/astrochart` da `package.json` (non più usato).

## Cosa resta invariato

- Tab "Pianeti / Case / Aspetti" con dati testuali (sotto il grafico) → restano, includono già la lista testuale degli aspetti.
- `AstrologicalPillars`, `BirthDataSummary`, `BirthDataForm`, edge function `calculate-natal-chart` → invariati.
- Profili senza `natal_chart_svg`: vedranno il messaggio di ricalcolo (niente più ruota bianca di fallback).
