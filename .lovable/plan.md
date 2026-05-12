## Obiettivo
Ripristinare la voce "Percorsi Sonori" nei menu (Footer + Sidebar Dashboard), ma invece di navigare a `/audio-library`, mostrare un piccolo pannello/dialog di anticipazione nel tono editoriale-mistico del sito.

## Cambiamenti

### 1. Nuovo componente `ComingSoonDialog`
File: `src/components/ComingSoonDialog.tsx`
- Wrapper su `Dialog` di shadcn (già presente in `src/components/ui/dialog.tsx`).
- Props: `open`, `onOpenChange`.
- Contenuto:
  - Titolo: **"Percorsi Sonori"** (font editorial, uppercase, tracking ampio)
  - Asterismo decorativo `※` con linee (stile `ed-asterism` già usato nel Footer)
  - Testo: *"I Percorsi Sonori stanno prendendo forma nel laboratorio onirico. Arriveranno presto."* (italic, font editorial)
  - Meta line: `MMXXVI · In cantiere` (stile `ed-meta`)
  - Bottone secondario "Chiudi"
- Tema scuro coerente: bordi `mystic-violet/15`, glow leggero magenta.

### 2. Footer (`src/components/Footer.tsx`)
- Re-aggiungere nella colonna "Esplora" (o "L'opera") la voce **"Percorsi Sonori"**.
- Sostituire `<Link to="/audio-library">` con un `<button>` che apre il dialog.
- Aggiungere stato locale `comingSoonOpen` e renderizzare `<ComingSoonDialog />`.
- Stesso styling degli altri link (italic, hover mystic-pink) + piccola icona `Sparkles` o ellipsis `…` opzionale per suggerire "in arrivo".

### 3. Sidebar Dashboard (`src/components/ModernDashboardLayout.tsx`)
- Re-aggiungere voce **"Percorsi Sonori"** (`icon: Headphones`) nell'array `navItems`.
- Estendere `NavItem` o gestire un caso speciale: se `item.href === "__coming_soon__"` (sentinella) o se item ha flag `comingSoon`, renderizzare `<button>` invece di `<Link>` che apre il dialog.
- Aggiungere stato `comingSoonOpen` nel layout.
- Stesso trattamento per la versione mobile menu (button → apre dialog, non naviga).
- Mostrare un piccolo badge testuale "Presto" accanto alla label (uppercase, tracking, colore `mystic-glow`).

### 4. Rotta e admin
- Lasciare attiva la rotta `/audio-library` in `App.tsx` (accesso diretto/QA).
- Lasciare invariata la pagina admin `/admin/audio` (con i nuovi campi subtitle/preface già implementati).

## Note
- Nessuna modifica a database, edge functions, hooks audio.
- Quando si vorrà rendere live la sezione, basterà rimuovere il dialog e ripristinare la navigazione normale a `/audio-library`.
- Tono di voce coerente con la memoria "Editorial Mystic Design Language" e "Standard Homepage".
