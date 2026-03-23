

## Piano: Allineare tutte le email Resend al design del sito

### Situazione attuale

- **1 email ben fatta**: `request-password-reset` — tema dark onirico con bordi dorati, perfettamente in linea col sito
- **5 email senza stile**: `send-email-notification` — HTML basico, nessun branding (approvazione professionista, sogno condiviso, nuovo commento, richiesta condivisione, invito utente)
- **1 email parziale**: `send-dream-diary` — sfondo bianco, colore primario corretto ma nessun wrapper onirico

### Obiettivo

Ricreare tutte le email con lo stesso linguaggio visivo della email OTP:
- Sfondo scuro spaziale (`#050010` / `#0a0318`)
- Bordi dorati (`#c9a84c`) con glow
- Testo dorato (`#f5e6a3`) per titoli
- Testo lavanda (`#b8a9d4`) per corpo
- Card con bordo arrotondato e sfondo `#0a0318`
- Elementi decorativi (stelle ✦ ✧, luna 🌙)
- Footer brandizzato "Dream Alchemist"

### Modifiche

**File 1: `supabase/functions/send-email-notification/index.ts`**

Riscrivere le 5 funzioni di generazione HTML:
- Creare un wrapper template condiviso (stessa struttura dell'email OTP)
- Applicare il tema dark/gold a tutte le email
- Sostituire i bottoni `#4F46E5` con bottoni dorati/viola in linea col brand
- Aggiungere header con stelle decorative e icona contestuale per ogni tipo
- Footer brandizzato coerente

Email da restyling:
1. `buildProfessionalApprovedEmail` — icona ✅ con tema onirico
2. `buildDreamSharedEmail` — icona 🌙
3. `buildNewCommentEmail` — icona 💬
4. `buildDreamSharedUserRequestEmail` — icona 🌙
5. `buildUserInvitationEmail` — icona ✨

**File 2: `supabase/functions/send-dream-diary/index.ts`**

Riscrivere il template HTML del diario:
- Wrapper dark come le altre email
- Header con stelle e titolo dorato
- Sezioni sogno con card interne scure
- Testo interpretazione e conversazione in stile coerente

### Dettaglio tecnico

Creazione di una funzione `buildEmailWrapper(content, title, icon)` condivisa in ogni file che genera la struttura HTML esterna (sfondo scuro, card con bordo dorato, header stelle, footer), e ogni email specifica fornisce solo il contenuto interno.

Palette colori dal sito:
- Background: `#050010`
- Card: `#0a0318`
- Card border: `rgba(201,168,76,0.5)`
- Gold text: `#f5e6a3`
- Lavender text: `#b8a9d4`
- Muted text: `#9b8fc4` / `#6b5f8a`
- Primary purple: `#5636cd`
- Gold accent: `#c9a84c`
- Button: gradient o solid `#5636cd` con bordo dorato

### Deploy

Re-deploy di entrambe le edge function dopo le modifiche.

