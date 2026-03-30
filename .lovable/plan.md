
Obiettivo: allineare la Home alla versione “main” che mostra la hero con le 5 frasi animate (quella di `HeroSection`), senza toccare rotte o logiche core.

1) Verifica mismatch reale (già emerso dal codice)
- `src/pages/Index.tsx` oggi monta `HomeHero + PillarsSection + TransformationSection + HomeCTA + IntroOverlay`.
- Le 5 frasi esistono in `src/components/HeroSection.tsx` (`HERO_PHRASES`) ma non vengono renderizzate in Home.

2) Ripristino Home alla versione con 5 frasi (modifica solo `src/pages/Index.tsx`)
- Sostituire la composizione attuale della Home con quella che usa `HeroSection`.
- Ripristinare le sezioni della homepage “main” in ordine classico (senza cambiare altre pagine):
  - `Navigation`
  - `HeroSection` (5 frasi animate)
  - sezioni home già presenti nel progetto (es. `FeaturesSection`, `ResearchSection`, `ExperienceSection`, `CTASection`)
  - `Footer`
- Rimuovere dall’Index la logica intro overlay/sessionStorage solo se non presente nella versione main da ripristinare.

3) Vincoli di sicurezza/ambito
- Nessuna modifica a:
  - routing (`App.tsx`)
  - auth
  - dashboard
  - dream CRUD
  - Supabase functions/types/client
- Nessun refactor fuori dalla Home page.

4) Verifica finale in preview
- Confermare su `/` la presenza della hero con testo animato a 5 frasi (quella di `HeroSection`).
- Confermare che navigazione e CTA portano alle stesse rotte attuali.
- Smoke check rapido: `/auth`, `/my-dreams`, `/dashboard` devono risultare invariati funzionalmente.

5) Output di consegna
- File cambiati: solo `src/pages/Index.tsx`.
- Conferma esplicita che la preview ora corrisponde alla home “main” con le 5 frasi.
