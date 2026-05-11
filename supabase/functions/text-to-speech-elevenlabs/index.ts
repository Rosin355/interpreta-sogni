import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Sessione scaduta. Accedi di nuovo per continuare.' }),
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
        JSON.stringify({ error: 'Sessione scaduta. Accedi di nuovo per continuare.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Rate Limiting (wrapped in try-catch for resilience)
    let rateLimit = { allowed: true, remaining: 50, resetAt: Date.now() + 3600000 };
    try {
      const { RateLimiter, RATE_LIMITS } = await import("../_shared/rate-limiter.ts");
      const rateLimiter = new RateLimiter();
      rateLimit = await rateLimiter.checkLimit(user.id, 'text-to-speech', RATE_LIMITS.TTS);
    } catch (rateLimitError) {
      console.warn('[TTS] Rate limiter unavailable, allowing request:', rateLimitError.message);
    }

    const { textToSpeechSchema } = await import("../_shared/validation.ts");

    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetAt);
      return new Response(
        JSON.stringify({ 
          error: 'Troppe richieste. Attendi qualche minuto e riprova.',
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
    console.log('[TTS] Request received:', { 
      textLength: requestBody.text?.length || 0, 
      voiceId: requestBody.voiceId,
      textPreview: requestBody.text?.substring(0, 50) 
    });
    
    const validation = textToSpeechSchema.safeParse(requestBody);
    
    if (!validation.success) {
      console.error('[TTS] Validation failed:', JSON.stringify(validation.error.issues, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Il testo inserito non è valido. Verifica e riprova.',
          details: validation.error.issues.map(i => i.message).join(', ')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, voiceId = 'cnDF6tD6CWVBeLKYlCXW' } = validation.data;

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('[TTS] ELEVENLABS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Servizio audio non configurato. Contatta l\'assistenza.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TTS] Calling ElevenLabs API: ${text.length} chars, voice: ${voiceId}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] ElevenLabs API error:', response.status, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ errorCode: 'INTERNAL_ERROR', error: `ElevenLabs auth failed: ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (response.status === 429) {
        const { notifyQuotaToAdmins } = await import("../_shared/error-response.ts");
        notifyQuotaToAdmins({
          provider: 'elevenlabs',
          errorCode: 'TTS_QUOTA_EXCEEDED',
          functionName: 'text-to-speech-elevenlabs',
          technicalMessage: `ElevenLabs TTS 429: ${errorText}`,
        }).catch(() => {});
        return new Response(
          JSON.stringify({ errorCode: 'TTS_QUOTA_EXCEEDED', error: `ElevenLabs TTS quota: ${errorText}` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ errorCode: 'UPSTREAM_UNAVAILABLE', error: `ElevenLabs TTS ${response.status}: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('[TTS] Audio received, size:', audioBuffer.byteLength, 'bytes');
    
    // Use Deno standard library for stable base64 encoding
    const base64Audio = base64Encode(audioBuffer);

    console.log('[TTS] Audio converted to base64, length:', base64Audio.length);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        },
      }
    );

  } catch (error) {
    console.error('[TTS] FATAL ERROR:', error);
    console.error('[TTS] Error stack:', error.stack);
    
    // Map technical errors to user-friendly messages
    const errorMsg = error.message || '';
    let userMessage = 'Servizio audio temporaneamente non disponibile. Riprova tra poco.';
    
    if (errorMsg.includes('dns') || errorMsg.includes('network') || errorMsg.includes('fetch')) {
      userMessage = 'Problema di connessione al servizio audio. Riprova tra poco.';
    }
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
