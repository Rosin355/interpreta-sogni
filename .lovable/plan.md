

## Piano: Ingrandire i testi hero su mobile e ottimizzare la 5ª frase

### Problema
- Su mobile (390px) i testi delle frasi animate sono troppo piccoli
- Nella 5ª frase (finale) c'è troppo spazio vuoto in basso — titolo e sottotitolo devono essere più grandi e proporzionati

### Modifiche — solo `src/components/ui/animated-shader-hero.tsx`

**1. Font size titolo (frasi animate) — riga 181**

Attuale:
```
text-[1.25rem] sm:text-[1.6rem] md:text-[2rem] lg:text-[2.55rem] xl:text-[3rem]
```

Nuovo (mobile più grande):
```
text-[1.55rem] sm:text-[1.6rem] md:text-[2rem] lg:text-[2.55rem] xl:text-[3rem]
```

**2. Font size sottotitolo (riga 194) — più grande su mobile**

Attuale:
```
text-sm sm:text-base md:text-lg lg:text-xl
```

Nuovo:
```
text-base sm:text-base md:text-lg lg:text-xl
```

**3. Ridurre spazio verticale nella 5ª frase (riga 169)**

Attuale: `space-y-5 sm:space-y-6`
Nuovo: `space-y-4 sm:space-y-6`

### Riepilogo
- Solo `src/components/ui/animated-shader-hero.tsx` viene modificato
- Mobile: titolo da `1.25rem` → `1.55rem`, sottotitolo da `text-sm` → `text-base`
- Desktop: invariato
- Spazio verticale finale ridotto su mobile

