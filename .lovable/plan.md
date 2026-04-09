

## Piano: Biblioteca Audio Rituale — "Percorsi per il Sogno"

Implementazione incrementale di una libreria audio guidata per la preparazione al sonno e ai sogni.

### Fase 1 — Database e Storage

**Migration SQL:**
- Creare tabella `audio_tracks` con: `id`, `title`, `slug`, `description`, `category`, `cover_image_url`, `audio_path`, `duration_seconds`, `access_tier` (text: 'free'/'subscriber'), `is_published`, `is_featured`, `sort_order`, `created_by` (uuid), `created_at`, `updated_at`
- Creare bucket storage `ritual-audio` (privato, per MP3) e `ritual-audio-covers` (pubblico, per cover)
- RLS su `audio_tracks`:
  - SELECT: tutti gli utenti autenticati possono vedere i track pubblicati (`is_published = true`); admin/super_admin vedono tutto
  - INSERT/UPDATE/DELETE: solo admin/super_admin (via `is_admin(auth.uid())`)
- RLS storage: admin può upload/delete; utenti autenticati possono leggere

**Categorie predefinite:** Addormentamento, Rilassamento profondo, Visualizzazione guidata, Preparazione al sogno, Risveglio consapevole, Ricordo dei sogni, Rituali del sonno

### Fase 2 — Tipi e Hook

**Nuovi file:**
- `src/types/audio-tracks.ts` — interfaccia TypeScript per AudioTrack
- `src/hooks/useAudioTracks.ts` — fetch tracks, filtro categoria, logica accesso tier
- `src/hooks/useAudioPlayer.ts` — stato player (play/pause/seek/progress), ref Audio HTML5
- `src/hooks/useAudioAdmin.ts` — CRUD admin (upload MP3, upload cover, create/update/delete track)

### Fase 3 — Componenti

**Nuovi componenti isolati in `src/components/audio/`:**
- `AudioTrackCard.tsx` — card con cover, titolo, categoria, badge Free/Premium, stato locked
- `AudioPlayer.tsx` — player elegante: play/pause, progress bar, tempo, cover, titolo
- `AudioCategoryFilter.tsx` — filtro per categoria
- `AudioFeaturedSection.tsx` — sezione tracks in evidenza
- `AudioHero.tsx` — hero area con titolo "Percorsi per il Sogno" e sottotitolo evocativo
- `AudioLockedOverlay.tsx` — overlay per contenuti premium con CTA upgrade

### Fase 4 — Pagine

**`src/pages/AudioLibrary.tsx`** — pagina utente `/audio-library`:
- Navigation esistente
- AudioHero
- AudioFeaturedSection (se ci sono track featured)
- AudioCategoryFilter + griglia AudioTrackCard
- AudioPlayer (bottom sticky o inline)
- Design: sfondo scuro, toni calm/mystical, coerente col design system esistente

**`src/pages/AudioAdmin.tsx`** — pagina admin `/admin/audio`:
- Protezione admin (pattern identico a AdminDashboard)
- Lista tracks con edit/delete
- Form upload: titolo, descrizione, categoria, tier, cover image, MP3 file
- Toggle published/featured

### Fase 5 — Routing e Navigazione

**`src/App.tsx`** — aggiungere:
- `<Route path="/audio-library" element={<AudioLibrary />} />`
- `<Route path="/admin/audio" element={<AudioAdmin />} />`

**`src/components/Navigation.tsx`** — aggiungere link "Percorsi Audio" nel menu desktop e mobile (per utenti loggati)

### Dettagli tecnici

- Audio MP3 serviti via signed URL da bucket privato `ritual-audio` (sicurezza)
- Cover images da bucket pubblico `ritual-audio-covers`
- Nessuna modifica a pagine esistenti (dream, astrology, alchemy, dashboard)
- Player usa HTML5 `<audio>` element, no librerie esterne
- Accesso tier: confronto semplice client-side (track.access_tier === 'free' || userIsSubscriber || userIsAdmin)
- Per ora nessun sistema di subscription reale — tutti vedono i track premium come "locked" a meno che non siano admin

### Raccomandazioni Fase 2 futura

- Playlist personalizzate / percorsi multi-track
- Preferiti / cronologia ascolto
- Timer sonno (auto-stop dopo N minuti)
- Statistiche ascolto per admin
- Integrazione con subscription/pagamento reale

### File coinvolti (solo nuovi)

| File | Tipo |
|------|------|
| Migration SQL | Tabella + storage + RLS |
| `src/types/audio-tracks.ts` | Tipi |
| `src/hooks/useAudioTracks.ts` | Hook |
| `src/hooks/useAudioPlayer.ts` | Hook |
| `src/hooks/useAudioAdmin.ts` | Hook |
| `src/components/audio/AudioHero.tsx` | Componente |
| `src/components/audio/AudioTrackCard.tsx` | Componente |
| `src/components/audio/AudioPlayer.tsx` | Componente |
| `src/components/audio/AudioCategoryFilter.tsx` | Componente |
| `src/components/audio/AudioFeaturedSection.tsx` | Componente |
| `src/components/audio/AudioLockedOverlay.tsx` | Componente |
| `src/pages/AudioLibrary.tsx` | Pagina |
| `src/pages/AudioAdmin.tsx` | Pagina |

**File modificati (minimali):**
- `src/App.tsx` — 2 route aggiunte
- `src/components/Navigation.tsx` — 1 link aggiunto (desktop + mobile)

