# Bottom bar: simmetria 2+FAB+2

Sposto **Alchimia** dalla bottom tab bar allo sheet "Altro" per ottenere una distribuzione simmetrica:

```text
  HOME    SOGNI    [+]    ASTRO    ALTRO
```

## Modifiche

### `src/components/mobile/MobileBottomNav.tsx`
- Rimuovere `Beaker` / "Alchimia" dall'array `TABS`
- Lasciare solo: Home, Sogni, Astro
- Layout: rendering manuale → `TABS[0]`, `TABS[1]`, FAB, `TABS[2]`, Altro
- Rimuovere import `Beaker` non più usato

### `src/components/mobile/MobileMoreSheet.tsx`
- Aggiungere "Alchimia" (`Beaker` → `/alchemy`) come **prima voce** della lista (sopra "Sogni Condivisi")
- Import di `Beaker` da lucide-react

## Nessun'altra modifica
- Top bar mobile, FAB, sidebar desktop, stili: invariati.
