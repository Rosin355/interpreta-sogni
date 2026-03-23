

## Piano: Sostituire il logo 🌙 con il logo Dream Alchemist in tutto il sito e nelle email

### Approccio

Il logo caricato (gatto alchimista nella fiala) sostituira l'emoji luna 🌙 usata come icona brand in tutto il progetto.

**Per il frontend**: copiare l'immagine in `src/assets/dreamalchemist_logo.png` e importarla come modulo ES6 nei componenti. Nei punti dove c'e il div con sfondo gradient + emoji 🌙, sostituire con un `<img>` del logo.

**Per le email**: le email HTML non possono usare file locali. Il logo verra hostato nella cartella `public/` e referenziato con URL assoluto (`https://interpreta-sogni.lovable.app/dreamalchemist_logo.png`) nelle email.

### File da modificare

| File | Cosa cambia |
|------|-------------|
| `src/assets/dreamalchemist_logo.png` | Copiare il logo (per import nei componenti React) |
| `public/dreamalchemist_logo.png` | Copiare il logo (per URL assoluto nelle email) |
| `src/components/Navigation.tsx` | Sostituire il div gradient+🌙 con `<img>` del logo (32x32) |
| `src/pages/Auth.tsx` | Sostituire il div gradient+🌙 con `<img>` del logo (48x48) |
| `supabase/functions/send-email-notification/index.ts` | Nel `buildEmailWrapper`, sostituire l'emoji `${icon}` nell'header con un `<img>` del logo hosted |
| `supabase/functions/send-dream-diary/index.ts` | Stesso cambio nel `buildEmailWrapper` |
| `supabase/functions/request-password-reset/index.ts` | Sostituire il div con 🌙 (riga 58) con `<img>` del logo |

### Note
- L'emoji 🌙 in `FeaturesSection.tsx` e un'icona di feature ("Diario dei Sogni"), non il brand logo — la lascio cosi com'e
- Le emoji 🌙 nei subject delle email e nelle notifiche push restano (sono decorative nei titoli, non il logo)
- I riferimenti a `Moon` di lucide-react in `AlchemicalBadge`, `SharedDreamPublic`, `About` sono icone contestuali (fasi alchemiche, decorazione), non il brand logo — restano invariati
- Deploy delle 3 edge function dopo le modifiche

