import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function processBase64Chunks(base64String: string, chunkSize = 32768) {
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
    // Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
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
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Autenticazione non valida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Rate Limiting
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

    // Input Validation
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
    
    if (!audio) {
      console.error('[STT] No audio data provided');
      throw new Error('No audio data provided');
    }

    console.log('[STT] Processing audio for transcription...');

    const binaryAudio = processBase64Chunks(audio);
    console.log('[STT] Audio size:', binaryAudio.length, 'bytes');

    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model_id', 'scribe_v1');
    formData.append('language_code', 'it');

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    console.log('[STT] Calling ElevenLabs STT API...');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text/convert', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[STT] ElevenLabs STT API error:', response.status, errorText);
      console.error('[STT] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      throw new Error(`ElevenLabs STT API error: ${errorText}`);
    }

    const result = await response.json();
    const text = result.text;

    console.log('[STT] Transcription successful, length:', text?.length || 0);
    console.log('[STT] Preview:', text?.substring(0, 100));

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
    console.error('[STT] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
