

## Fix: Dettatura vocale nella creazione sogno

### Problemi identificati

1. **`audio/webm` non supportato su Safari/iOS** — `new MediaRecorder(stream, { mimeType: 'audio/webm' })` fallisce silenziosamente su Safari. Serve un fallback a `audio/mp4`.

2. **Errori non catturati nel `FileReader`** — Il `throw` dentro `reader.onerror` e gli errori dentro `reader.onloadend` non vengono catturati dal `try/catch` esterno perché sono callback asincrone. Il risultato è che se qualcosa va storto, l'utente resta bloccato su "Trascrizione in corso..." per sempre.

3. **CORS headers incompleti nella edge function** — Mancano gli header Supabase client (`x-supabase-client-platform`, etc.) che il client JS invia automaticamente.

4. **Nessun feedback se la trascrizione torna vuota** — Se ElevenLabs restituisce testo vuoto, l'utente non riceve alcun messaggio.

### Piano di intervento

**File 1: `src/components/VoiceRecorder.tsx`**
- Aggiungere detection del mimeType supportato (`audio/webm` → fallback `audio/mp4`)
- Riscrivere `transcribeAudio` usando una Promise wrapper attorno al FileReader per gestire correttamente gli errori
- Aggiungere toast se la trascrizione torna vuota
- Assicurarsi che `isTranscribing` venga resettato in tutti i casi di errore

**File 2: `supabase/functions/speech-to-text-elevenlabs/index.ts`**
- Aggiornare i CORS headers con gli header Supabase client mancanti
- Passare il mimeType corretto al blob (non hardcodare `audio/webm`)
- Deploy automatico

### Dettaglio tecnico

```typescript
// mimeType detection
const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
  ? 'audio/webm' 
  : 'audio/mp4';

// Promise-based FileReader
const base64Audio = await new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const result = reader.result?.toString().split(',')[1];
    result ? resolve(result) : reject(new Error('Conversione audio fallita'));
  };
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(audioBlob);
});
```

