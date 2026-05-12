## Obiettivo
Nascondere la voce "Percorsi Audio" dal menu utente (Footer + Dashboard sidebar), mantenendo:
- la rotta `/i` funzionante (per accesso diretto/QA)
- la pagina admin `/admin/audio` pienamente operativa
- aggiungere ai brani i campi **sottotitolo** e **prefazione** caricabili dall'admin

## Cambiamenti

### 1. Nascondere la voce dal menu
- `src/components/Footer.tsx` — rimuovere l'item `{ label: "Percorsi audio", to: "/i" }`.
- `src/components/ModernDashboardLayout.tsx` — rimuovere l'item `{ icon: Headphones, label: "Percorsi Audio", href: "/i" }`.
- La rotta `/i` in `App.tsx` resta attiva (accessibile solo via URL diretto). Nessuna rimozione di file/pagina.

### 2. Database — nuovi campi su `audio_tracks`
Migration:
- `subtitle text NULL`
- `preface text NULL` (testo libero, prefazione/intro al brano)

Nessun cambio RLS.

### 3. Tipi e Admin
- `src/types/audio-tracks.ts` — aggiungere `subtitle: string | null` e `preface: string | null` a `AudioTrack` e a `TrackFormData`.
- `src/hooks/useAudioAdmin.ts` — includere `subtitle` e `preface` in `createTrack`/`updateTrack`.
- `src/pages/AudioAdmin.tsx` — aggiungere due campi nel form:
  - `Input` per **Sottotitolo** (sotto al Titolo)
  - `Textarea` per **Prefazione** (sotto alla Descrizione)
  - Stato `subtitle`/`preface`, reset in `resetForm`, prefill in `handleEdit`.

### 4. Frontend pubblico
Nessuna modifica visiva alla pagina `/i` in questa iterazione (è oscurata dal menu). I nuovi campi saranno mostrati quando rimetteremo online la sezione.

## Note
- Nessuna modifica a Storage, edge functions, o componenti `audio/*`.
- Quando vorrai rimettere online la sezione basterà ripristinare i due item di menu.
