

## Piano: Dialog di condivisione unificato + Condivisione tramite Link Pubblico

### Panoramica
Unificare le due icone di condivisione in un unico dialog a tabs (Professionista / Email / Link) e aggiungere la possibilita di generare un link pubblico per condividere il sogno con chiunque, anche senza account.

### Cosa cambia per l'utente
- **Un solo pulsante "Condividi"** nella pagina del sogno invece di due icone identiche
- Il dialog si apre con **3 tabs**: Professionista, Email, Link
- Nel tab **Link** si puo generare un link pubblico unico, copiarlo con un click, e revocarlo quando si vuole

---

### Dettaglio Tecnico

#### 1. Database: aggiungere colonna `share_token` alla tabella `dreams`

Nuova migrazione SQL:
- Aggiungere `share_token TEXT UNIQUE DEFAULT NULL` alla tabella `dreams`
- Aggiungere una RLS policy che permetta a chiunque (anche anonimi) di leggere un sogno se forniscono il `share_token` corretto via query
- Creare una funzione RPC `get_dream_by_share_token(token TEXT)` con `SECURITY DEFINER` che restituisce i dati del sogno (titolo, contenuto, mood, tags, immagine, data) senza esporre user_id o dati sensibili

#### 2. Nuova pagina: `src/pages/SharedDreamPublic.tsx`

- Route: `/dream/shared/:token`
- Pagina pubblica (no auth richiesta) che chiama la RPC `get_dream_by_share_token`
- Mostra il sogno in modalita read-only con design "onirico"
- Se il token non esiste o e stato revocato, mostra un messaggio "Sogno non disponibile"

#### 3. Nuovo componente: `src/components/ShareDreamUnified.tsx`

Dialog unificato con Tabs (Radix UI Tabs, gia installato):
- **Tab "Professionista"**: logica esistente da `ShareDreamDialog.tsx`
- **Tab "Email"**: logica esistente da `ShareDreamViaEmail.tsx`
- **Tab "Link"**: 
  - Se `dream.share_token` esiste: mostra il link con pulsante "Copia" e pulsante "Revoca link"
  - Se non esiste: pulsante "Genera link pubblico" che genera un UUID, salva come `share_token` nel sogno, e mostra il link

#### 4. Aggiornare `src/pages/DreamDetail.tsx`

- Rimuovere i due pulsanti separati (Share2 + Share2) e i relativi state (`shareDialogOpen`, `shareEmailDialogOpen`)
- Aggiungere un unico pulsante Share2 che apre `ShareDreamUnified`
- Passare i dati del sogno (incluso `share_token`) al nuovo componente

#### 5. Aggiornare `src/App.tsx`

- Aggiungere route `/dream/shared/:token` che punta a `SharedDreamPublic`

#### 6. Pulizia

- I file `ShareDreamDialog.tsx` e `ShareDreamViaEmail.tsx` possono essere rimossi (la logica sara integrata nel nuovo componente unificato)

### Sicurezza
- Il `share_token` e un UUID casuale, non indovinabile
- La RPC `get_dream_by_share_token` restituisce solo campi pubblici (no user_id, no dati privati)
- L'utente puo revocare il link in qualsiasi momento (imposta `share_token = NULL`)
- La pagina pubblica non richiede autenticazione

