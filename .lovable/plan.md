

## Fix: Speech-to-Text (registrazione vocale → testo)

### Problemi identificati

1. **Endpoint API obsoleto** — La edge function usa `https://api.elevenlabs.io/v1/speech-to-text/convert` ma l'endpoint attuale di ElevenLabs è `https://api.elevenlabs.io/v1/speech-to-text` (senza `/convert`). Questo causa un errore 404 o redirect silenzioso.

2. **Modello obsoleto** — Il codice usa `scribe_v1`, ma ElevenLabs ha rilasciato `scribe_v2` (14 marzo 2026) che è più accurato e stabile. `scribe_v1` potrebbe essere stato deprecato.

3. **Corruzione base64** — La funzione `processBase64Chunks` divide la stringa base64 a posizioni arbitrarie (`chunkSize = 32768`), ma base64 deve essere decodificato in gruppi di 4 caratteri. Se il chunk non cade su un multiplo di 4, `atob()` può fallire silenziosamente o produrre bytes corrotti.

### Correzioni

**File: `supabase/functions/speech-to-text-elevenlabs/index.ts`**

1. **Aggiornare l'endpoint API** da `/v1/speech-to-text/convert` a `/v1/speech-to-text`
2. **Aggiornare il modello** da `scribe_v1` a `scribe_v2`
3. **Fixare processBase64Chunks** — assicurarsi che il chunkSize sia sempre un multiplo di 4 per evitare corruzione nella decodifica base64
4. **Aggiungere logging più dettagliato** per la risposta dell'API ElevenLabs per facilitare il debug futuro

### Dettaglio tecnico

```typescript
// Fix 1: endpoint corretto
const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { ... });

// Fix 2: modello aggiornato
formData.append('model_id', 'scribe_v2');

// Fix 3: chunkSize multiplo di 4
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  // Ensure chunkSize is a multiple of 4 for valid base64 decoding
  chunkSize = chunkSize - (chunkSize % 4);
  // ... rest unchanged
}
```

**Nessuna modifica frontend** — il componente `VoiceRecorder.tsx` è già corretto.

### Deploy
Re-deploy della edge function `speech-to-text-elevenlabs` dopo le modifiche.

