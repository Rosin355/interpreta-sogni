# Mobile Navigation: Bottom Tab Bar

Sostituiamo l'attuale menu hamburger mobile con una **bottom tab bar fissa** in stile native iOS, mantenendo lo stile "Dramatic Mystic" (nero profondo, glow magenta, font editorial). Desktop resta invariato (sidebar attuale).

## Struttura

```text
┌─────────────────────────────┐
│  [Logo]    DREAM ALCHEMIST   [🔔][👤] │  ← Top bar slim (invariata, senza hamburger)
├─────────────────────────────┤
│                             │
│      Contenuto pagina       │
│      (con padding-bottom    │
│       per non finire        │
│       sotto la tab bar)     │
│                             │
├─────────────────────────────┤
│  🏠     📖    ➕    ✨    ⚗️    ⋯  │  ← Bottom tab bar
│ Home  Sogni  NEW  Astro Alch Altro │
└─────────────────────────────┘
        ▲          ▲
   4 tab + FAB centrale rialzato + tab "Altro"
```

### Tab visibili (5 + FAB)
1. **Dashboard** — `LayoutDashboard` → `/dashboard`
2. **Sogni** — `BookOpen` → `/my-dreams`
3. **➕ Nuovo Sogno** (FAB centrale rialzato, glow magenta) → `/dreams/new`
4. **Astrologia** — `Sparkles` → `/astrology`
5. **Alchimia** — `Beaker` → `/alchemy`
6. **Altro** — `MoreHorizontal` → apre uno **Sheet** (drawer dal basso) con:
   - Sogni Condivisi (`/shared-with-me`)
   - Percorsi Sonori (coming soon → riusa `ComingSoonDialog`)
   - Chi Siamo (`/about`)
   - Admin (solo se `isSuperAdmin`)
   - Esci (logout)

### Top bar mobile (invariata nella sostanza)
- Stessa altezza (h-16), logo + brand a sinistra
- A destra: campanella notifiche + `UserMenu` (avatar) — **rimuoviamo l'icona hamburger**

## Comportamento & UX

- **Tab attiva**: icona piena + label visibile + glow sottile magenta sotto + indicatore pill superiore (motion `layoutId` come la sidebar desktop)
- **Tab inattiva**: icona outline + label dimmed (`text-white/55`)
- **FAB centrale**: cerchio 56px rialzato (-translate-y-4), gradient magenta→viola, shadow glow, sempre `+` bianco. Tap → `/dreams/new`
- **Safe area iOS**: `pb-[env(safe-area-inset-bottom)]` sulla tab bar per non finire sotto la home indicator
- **Hide-on-scroll** (opzionale, raccomandato): la bar si nasconde scrollando in giù e riappare scrollando in su, per dare più spazio in lettura
- **Sheet "Altro"**: usa `Sheet` di shadcn dal basso, sfondo `bg-black/90 backdrop-blur-xl`, voci con stesso stile della sidebar desktop
- **Prefetch**: stesso pattern attuale (`prefetchRoute` su `onPointerDown`)
- **Coming Soon**: tap su "Percorsi Sonori" nello sheet → chiude sheet + apre `ComingSoonDialog`

## Stile (Dramatic Mystic)

- Bar: `fixed bottom-0`, `bg-black/80 backdrop-blur-2xl`, `border-t border-white/10`
- Glow superiore sottile: gradient magenta orizzontale al 5% opacità
- Label: `font-bodoni-heading text-[10px] uppercase tracking-[0.18em]`
- Active color: `hsl(var(--mystic-glow))` con drop-shadow
- FAB: `bg-gradient-to-br from-primary to-purple-600`, `shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.6)]`, ring `border border-white/20`

## Accessibilità & responsive

- `aria-label` su ogni tab, `aria-current="page"` per quella attiva
- Min touch target 48×48px (FAB 56px)
- Visibile solo `< lg` (`lg:hidden`); desktop continua con la sidebar esistente
- Reduced-motion: niente animazione `layoutId`, solo color transition

## Dettagli tecnici

**Nuovi file**
- `src/components/mobile/MobileBottomNav.tsx` — la tab bar (4 tab + FAB + "Altro")
- `src/components/mobile/MobileMoreSheet.tsx` — sheet con voci secondarie + logout

**File modificati**
- `src/components/ModernDashboardLayout.tsx`:
  - Rimuovere il blocco "Mobile Menu Overlay" (full-screen hamburger menu)
  - Rimuovere il bottone hamburger dalla TopBar mobile, sostituirlo con `UserMenu` + bell
  - Aggiungere `<MobileBottomNav />` fuori da `<main>` (fixed)
  - Aggiungere `pb-24` (o equivalente) al container scrollabile mobile per non coprire contenuto
  - Mantenere `ComingSoonDialog` esistente (controllato dallo stato condiviso o sollevato)

**Stato**
- `comingSoonOpen` resta in `ModernDashboardLayout` e viene passato giù come prop/callback
- `MobileMoreSheet` riceve `onComingSoon` e `onLogout`

**Nessuna modifica a**: routing, business logic, sidebar desktop, top header desktop, navbar pubblica (`MiniNavbar`).

## Out of scope
- Native gesture (swipe tra tab)
- Badge numerici (notifiche non lette) — facile da aggiungere in futuro
- Animazioni complesse Lottie sulle icone
