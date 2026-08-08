import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function processBase64Chunks(base64String: string, chunkSize = 32768) {
  // Ensure chunkSize is a multiple of 4 for valid base64 decoding
  chunkSize = chunkSize - (chunkSize % 4);
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticazione richiesta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Autenticazione non valida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { RateLimiter, RATE_LIMITS } = await import("../_shared/rate-limiter.ts");
    const { speechToTextSchema } = await import("../_shared/validation.ts");
    
    const rateLimiter = new RateLimiter();
    const rateLimit = await rateLimiter.checkLimit(
      user.id,
      'speech-to-text',
      RATE_LIMITS.STT
    );

    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetAt);
      return new Response(
        JSON.stringify({ 
          error: 'Limite di richieste raggiunto. Riprova più tardi.',
          resetAt: resetDate.toISOString()
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetDate.toISOString()
          } 
        }
      );
    }

    const requestBody = await req.json();
    console.log('[STT] Request received, audio data length:', requestBody.audio?.length || 0);
    
    const validation = speechToTextSchema.safeParse(requestBody);
    
    if (!validation.success) {
      console.error('[STT] Validation failed:', JSON.stringify(validation.error.issues, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Dati non validi', 
          details: validation.error.issues.map(i => i.message).join(', ')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { audio } = validation.data;
    const clientMimeType = requestBody.mimeType || 'audio/webm';
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('[STT] Processing audio, mimeType:', clientMimeType);

    const binaryAudio = processBase64Chunks(audio);
    console.log('[STT] Audio size:', binaryAudio.length, 'bytes');

    const extension = clientMimeType.includes('mp4') ? 'mp4' : clientMimeType.includes('ogg') ? 'ogg' : 'webm';

    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: clientMimeType });
    formData.append('file', blob, `audio.${extension}`);
    formData.append('model_id', 'scribe_v2');
    formData.append('language_code', 'ita');

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    console.log('[STT] Calling ElevenLabs STT API...');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    console.log('[STT] ElevenLabs response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      // Log the upstream detail server-side only. errorText never contains our
      // API key (ElevenLabs does not echo the key back); do NOT put it in the
      // client response.
      console.error('[STT] ElevenLabs STT API error:', response.status, errorText);

      // Upstream auth failure = our ElevenLabs key is invalid/misconfigured
      // (401/403, or a 400 saying the key id was used as the key, or an
      // invalid_api_key body). Surface a clean, generic message; never leak
      // the upstream payload to the client.
      const isUpstreamAuthError =
        response.status === 401 ||
        response.status === 403 ||
        (response.status === 400 &&
          (errorText.includes('api_key_id_used_as_api_key') ||
            errorText.includes('invalid_api_key')));

      if (isUpstreamAuthError) {
        return new Response(
          JSON.stringify({ errorCode: 'UPSTREAM_AUTH', error: 'Servizio vocale non disponibile. Contatta l\'assistenza.' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 429) {
        const { notifyQuotaToAdmins } = await import("../_shared/error-response.ts");
        notifyQuotaToAdmins({
          provider: 'elevenlabs',
          errorCode: 'STT_QUOTA_EXCEEDED',
          functionName: 'speech-to-text-elevenlabs',
          technicalMessage: `ElevenLabs STT 429: ${errorText}`,
        }).catch(() => {});
        return new Response(
          JSON.stringify({ errorCode: 'STT_QUOTA_EXCEEDED', error: 'Servizio vocale temporaneamente non disponibile per limite di utilizzo. Riprova più tardi.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ errorCode: 'UPSTREAM_UNAVAILABLE', error: 'Servizio vocale momentaneamente non disponibile. Riprova tra poco.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const text = result.text;

    console.log('[STT] Transcription successful, length:', text?.length || 0);

    return new Response(
      JSON.stringify({ text }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        } 
      }
    );

  } catch (error) {
    console.error('[STT] FATAL ERROR:', error);
    return new Response(
      JSON.stringify({ errorCode: 'INTERNAL_ERROR', error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
