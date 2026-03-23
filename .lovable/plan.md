

## Piano: Sistemare navbar e padding pagine

### Problema

Il logo 100x100px rende la navbar alta ~132px, ma molte pagine usano `pt-24` (96px) o `calc(5rem)` (80px) come offset, causando il titolo che finisce sotto la navbar.

### Soluzione

**1. Navbar (`Navigation.tsx`)**
- Ridurre padding verticale da `py-4` a `py-2` per contenere meglio il logo
- Ridurre logo da 100x100 a 64x64 per un navbar bilanciato (~80px totale)
- Mantenere il testo "Dream Alchemist" accanto al logo

**2. Standardizzare l'offset di tutte le pagine**

Usare `paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))'` come standard unico per tutte le pagine, garantendo spazio sufficiente sotto la navbar.

Pagine da aggiornare:

| Pagina | Offset attuale | Nuovo offset |
|--------|---------------|--------------|
| `Explore.tsx` | `marginTop: calc(5rem + ...)` | `paddingTop: calc(7rem + ...)` |
| `Profile.tsx` | `marginTop: calc(5rem + ...)` | `paddingTop: calc(7rem + ...)` |
| `Settings.tsx` | `marginTop: calc(5rem + ...)` | `paddingTop: calc(7rem + ...)` |
| `Timeline.tsx` | `marginTop: calc(5rem + ...)` | `paddingTop: calc(7rem + ...)` |
| `Astrology.tsx` | `pt-24` | `paddingTop: calc(7rem + ...)` |
| `Alchemy.tsx` | `pt-24` | `paddingTop: calc(7rem + ...)` |
| `SharedDreams.tsx` | `pt-24` | `paddingTop: calc(7rem + ...)` |
| `SharedDreamsReceived.tsx` | `pt-24` | `paddingTop: calc(7rem + ...)` |
| `AdminDashboard.tsx` | `pt-24` | `paddingTop: calc(7rem + ...)` |
| `ProfessionalVerification.tsx` | `pt-24` | `paddingTop: calc(7rem + ...)` |
| `Dashboard.tsx` | `calc(8rem + ...)` | `calc(7rem + ...)` (gia ok, uniformare) |
| `About.tsx` | `calc(6rem + ...)` | `calc(7rem + ...)` |
| `Auth.tsx` | `calc(6rem + ...)` | `calc(7rem + ...)` |
| `MyDreams.tsx` | `calc(6rem + ...)` | `calc(7rem + ...)` |
| `DreamDetail.tsx` | `calc(6rem + ...)` | `calc(7rem + ...)` |
| `EditDream.tsx` | `calc(6rem + ...)` | `calc(7rem + ...)` |
| `NewDream.tsx` | `calc(6rem + ...)` | `calc(7rem + ...)` |

### File coinvolti
- `src/components/Navigation.tsx` (logo 64x64, py-2)
- 17 pagine in `src/pages/` (offset standardizzato)

