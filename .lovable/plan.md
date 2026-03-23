

## Piano: "Parla con l'Alchimista" + Diario dei Sogni PDF

### Parte 1: Sostituire Note Vocali con "Parla con l'Alchimista"

Sostituire il componente `VoiceNoteRecorder` con una chat conversazionale AI legata al sogno e alla sua interpretazione. L'utente può scrivere o usare speech-to-text per continuare a dialogare con l'Alchimista sul significato del sogno.

**Database: Nuova tabella `dream_conversations`**
- `id`, `dream_id`, `user_id`, `role` (user/assistant), `content`, `created_at`
- RLS: solo il proprietario può leggere/scrivere/eliminare i propri messaggi

**Nuova Edge Function: `chat-with-alchemist`**
- Riceve `dreamId` e `message` dall'utente
- Carica dal DB: contenuto del sogno, interpretazione, e cronologia conversazione precedente
- Invia tutto come contesto a OpenAI con un system prompt che lo configura come "L'Alchimista" - esperto di sogni che continua l'analisi
- Salva sia il messaggio utente che la risposta AI nella tabella `dream_conversations`
- Restituisce la risposta

**Nuovo componente: `AlchemistChat.tsx`**
- Sostituisce `VoiceNoteRecorder` in `DreamDetail.tsx`
- UI chat con messaggi scrollabili (user a destra, alchimista a sinistra)
- Input testuale + bottone microfono (riusa la logica STT di `VoiceRecorder.tsx`)
- Bottone "Elimina conversazione" per reset
- Mostra "L'Alchimista sta riflettendo..." durante il caricamento

### Parte 2: Diario dei Sogni PDF (sostituisce il report attuale)

Sostituire `exportDashboardToPDF` con un vero diario dei sogni che trascrive i contenuti.

**Riscrivere `pdf-export.ts` con due funzioni:**

1. `exportSingleDreamPDF(dream)` — PDF del sogno corrente con:
   - Titolo, data, mood, tags, fase alchemica
   - Contenuto completo del sogno
   - Interpretazione AI completa
   - Conversazione con l'Alchimista (se presente)

2. `exportAllDreamsPDF(dreams)` — Diario completo con:
   - Copertina "Il Mio Diario dei Sogni" con data
   - Indice dei sogni
   - Ogni sogno come "pagina di diario" con contenuto, interpretazione, conversazione
   - Impaginazione automatica multi-pagina

**Opzione invio via email:**
- Dialog con scelta: "Scarica PDF" o "Invia via Email"
- Per l'email: nuova edge function `send-dream-diary` che genera il PDF server-side e lo invia tramite Resend all'email dell'utente

**UI in DreamDetail.tsx:**
- Bottone "Scarica Diario" nel dettaglio sogno (sogno singolo)

**UI in Dashboard.tsx / MyDreams.tsx:**
- Bottone "Esporta Diario" che apre dialog con opzioni:
  - Sogno corrente / Tutti i sogni
  - Scarica PDF / Invia via email

### File coinvolti

| File | Azione |
|------|--------|
| Migrazione DB | Creare tabella `dream_conversations` |
| `supabase/functions/chat-with-alchemist/index.ts` | Nuova edge function |
| `supabase/functions/send-dream-diary/index.ts` | Nuova edge function per email |
| `src/components/AlchemistChat.tsx` | Nuovo componente chat |
| `src/components/DreamDiaryExport.tsx` | Nuovo dialog esportazione diario |
| `src/utils/pdf-export.ts` | Riscrivere con funzioni diario |
| `src/pages/DreamDetail.tsx` | Sostituire VoiceNoteRecorder con AlchemistChat + aggiungere bottone diario |
| `src/pages/Dashboard.tsx` | Aggiornare bottone export |
| `src/components/VoiceNoteRecorder.tsx` | Rimuovere (non più usato) |

