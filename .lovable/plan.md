# Piano QA Visivo Finale

Solo modifiche presentazionali (className, wrapper, spaziature). Nessuna modifica a logica, Auth, Supabase, RLS, Edge Functions, routing o data fetching.

## Issue trovate

### 1. MyDreams — header e filtri non responsive (320px)
File: `src/pages/MyDreams.tsx`
- Riga 86: `flex items-center justify-between` con titolo `text-4xl` + due bottoni → overflow orizzontale a 320px.
- Righe 122–165: barra filtri con due `Select` a larghezza fissa (`w-[200px]`, `w-[180px]`) affiancati al campo cerca → overflow su mobile.

Fix:
- Header → `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`, titolo `text-2xl sm:text-4xl`, container bottoni `flex flex-wrap`.
- Riga filtri → su mobile i due `Select` diventano `flex-1` su una riga con `flex-wrap`, larghezza fissa solo da `sm:` in su.

### 2. NewDream — doppia top-bar mobile
File: `src/pages/NewDream.tsx`
- La pagina è renderizzata dentro `ModernDashboardLayout` (che ha già top-bar mobile + sidebar desktop) ma include anche `<Navigation />` + un proprio `min-h-screen` con `paddingTop: 'calc(7rem + safe-area)'`. Risultato: doppia barra in alto su mobile e padding eccessivo.

Fix visivi:
- Rimuovere `<Navigation />` dalla pagina (componente puramente presentazionale).
- Sostituire `min-h-screen bg-gradient...` con un semplice wrapper (`<div className="pb-12">`) e contenitore `container mx-auto px-4 sm:px-6 max-w-3xl`.
- Rimuovere `paddingTop` inline ridondante (la layout già gestisce safe-area).
- Header della Card: il blocco "Nuovo Sogno" + indicatore salvataggio → `flex-col sm:flex-row sm:items-start sm:justify-between gap-2`.

### 3. Profile — doppia top-bar mobile
File: `src/pages/Profile.tsx`
- Stesso problema di NewDream: include `<Navigation />` + `min-h-screen bg-background` + padding-top calcolato.

Fix:
- Rimuovere `<Navigation />`.
- Sostituire `min-h-screen bg-background` con wrapper neutro.
- Rimuovere `paddingTop` inline.
- Le card interne (`grid sm:grid-cols-2`) sono già responsive, ok.

### 4. Settings — doppia top-bar mobile
File: `src/pages/Settings.tsx`
- Stesso problema di Profile.

Fix: stessi tre interventi.

### 5. DreamDetail — già hardenato nel turno precedente
Verifica visiva: `px-4 sm:px-6`, `flex-col sm:flex-row` su header narrazione/visione, `flex-wrap` su bottoni, `min-w-0`/`break-words`. Nessuna ulteriore modifica prevista salvo che la verifica build/preview riveli problemi.

### 6. Dashboard
Già sistemato nei turni precedenti (header `flex-col sm:flex-row`, titolo responsive, bottoni `flex-wrap`). Verificare solo che la modifica a MyDreams non rompa nulla.

### 7. Mobile bottom nav spacing
`MobileBottomNav` usa già `env(safe-area-inset-bottom)`. `ModernDashboardLayout` aggiunge `pb-[calc(6rem+env(safe-area-inset-bottom))]` al contenuto. Ok.

## File da modificare

1. `src/pages/MyDreams.tsx` — header + filtri responsive
2. `src/pages/NewDream.tsx` — rimozione doppia nav + header Card responsive
3. `src/pages/Profile.tsx` — rimozione doppia nav
4. `src/pages/Settings.tsx` — rimozione doppia nav

Nessun file di logica, hook, edge function, route o schema viene toccato.

## Verifica finale
- `npm run build`
- Output atteso: 0 errori TypeScript/build.

## Output finale al termine
- Elenco file modificati
- Issue risolte (bullet list)
- Risultato build
