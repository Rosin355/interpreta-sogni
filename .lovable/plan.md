

## Piano: Potenziamento "Parla con l'Alchimista"

### 1. CRUD messaggi individuali

Aggiungere la possibilita di modificare ed eliminare singoli messaggi utente nella chat.

**Frontend (`AlchemistChat.tsx`):**
- Aggiungere menu contestuale (long-press/hover) sui messaggi utente con opzioni "Modifica" e "Elimina"
- Per "Elimina": conferma e cancellazione dal DB + aggiornamento stato locale
- Per "Modifica": inline editing con salvataggio su DB

**Database:** La tabella `dream_conversations` non ha policy UPDATE. Serve una migrazione per aggiungere una RLS policy UPDATE per i messaggi dell'utente.

### 2. TTS sulle risposte dell'Alchimista

Aggiungere il componente `TTSButton` sotto ogni messaggio dell'Alchimista, riusando lo stesso componente gia usato per le interpretazioni.

**Frontend (`AlchemistChat.tsx`):**
- Importare `TTSButton`
- Renderizzare un `TTSButton` compatto sotto ogni messaggio con `role === "assistant"`

### 3. Contesto potenziato: sogni precedenti + knowledge base + guida personalizzata

**Edge Function (`chat-with-alchemist/index.ts`):**

- **Sogni precedenti correlati**: Caricare gli ultimi 10 sogni dell'utente (titolo, contenuto troncato, mood, tags, fase alchemica, data) per dare contesto temporale e trovare pattern ricorrenti
- **Knowledge base**: Estrarre simboli/tag dal sogno corrente, cercarli nella tabella `dream_knowledge_base` e includerli nel system prompt come riferimenti
- **Guida alchemica personalizzata**: Calcolare la distribuzione delle fasi alchemiche dell'utente dai sogni recenti e includere nel prompt il profilo alchemico dell'utente (fase dominante, progressione, consigli)
- **System prompt potenziato**: Riscrivere il prompt per configurare l'AI come guida personale del viaggio alchemico dell'utente, non solo interprete del singolo sogno

### Dettaglio tecnico

```text
System Prompt Structure:
├── Identita: L'Alchimista, guida personale
├── Sogno corrente (completo)
├── Sogni precedenti (ultimi 10, troncati)
├── Knowledge base (simboli trovati nel sogno)
├── Profilo alchemico utente (distribuzione fasi)
└── Istruzioni di comportamento
```

**Migrazione DB:** Aggiungere policy UPDATE su `dream_conversations` per `role = 'user'`

### File coinvolti

| File | Azione |
|------|--------|
| Migrazione DB | Policy UPDATE su dream_conversations |
| `src/components/AlchemistChat.tsx` | CRUD messaggi + TTS su risposte |
| `supabase/functions/chat-with-alchemist/index.ts` | Sogni precedenti, knowledge base, profilo alchemico |

