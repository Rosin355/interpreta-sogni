

## Fix: Generazione immagine con prompt personalizzato

### Problema
Dai log, l'API restituisce **status 200** ma il body contiene un errore 429 embedded:
```
choices[0].error: {code: 429, message: "rate_limit_exceeded"}
```
Il codice attuale controlla solo `imageResponse.status`, quindi non rileva questo errore e fallisce con "NO_IMAGE".

Secondo problema: il prompt è troppo lungo (~2488 chars) con il contenuto del sogno completo + custom prompt, il che aumenta il consumo di token e la probabilità di rate limit.

### Correzioni

**File: `supabase/functions/generate-dream-image/index.ts`**

1. **Rilevare errori embedded nella risposta 200** — Dopo il parsing JSON (riga 314), controllare `choices[0].error` prima di cercare l'immagine. Se c'è un errore 429 embedded, restituire il messaggio di rate limit all'utente.

2. **Troncare il contenuto del sogno** — Limitare `content` a ~800 caratteri nel prompt per ridurre la lunghezza totale.

3. **Riscrivere il prompt in inglese** — I modelli di generazione immagini funzionano meglio con prompt in inglese. Tradurre la struttura del prompt mantenendo le descrizioni di stile e mood.

4. **Aggiungere retry con backoff** — Se l'errore è 429 embedded, tentare una seconda volta dopo 3 secondi prima di restituire l'errore all'utente.

### Dettaglio tecnico

```typescript
// Dopo riga 314: parsing della risposta
const imageData = await imageResponse.json();

// CHECK embedded errors (NEW)
const embeddedError = imageData.choices?.[0]?.error;
if (embeddedError) {
  console.error(`Embedded error:`, embeddedError);
  if (embeddedError.code === 429) {
    return new Response(
      JSON.stringify({ error: 'Limite richieste raggiunto. Riprova tra qualche minuto.', errorCode: 'AI_RATE_LIMIT' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  return new Response(
    JSON.stringify({ error: 'Errore AI', errorCode: 'AI_ERROR' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Truncate content in prompt
const truncatedContent = content.length > 800 
  ? content.substring(0, 800) + '...' 
  : content;
```

### Nessuna modifica frontend necessaria
Il client gestisce già correttamente gli errori 429 e 500.

