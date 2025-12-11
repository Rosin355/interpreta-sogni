import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { textToSpeechSchema, sanitizeText } = await import("../_shared/validation.ts");
    
    const rateLimiter = new RateLimiter();
    const rateLimit = await rateLimiter.checkLimit(
      user.id,
      'text-to-speech',
      RATE_LIMITS.TTS
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
          error: 'Dati non validi', 
          details: validation.error.issues.map(i => i.message).join(', ')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, voiceId = 'cnDF6tD6CWVBeLKYlCXW' } = validation.data;
    
    console.log('TTS request received:', { 
      textLength: text.length, 
      voiceId,
      userId: user.id,
      textPreview: text.substring(0, 50) 
    });

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    console.log(`TTS request: ${text.length} characters, voice: ${voiceId}`);

    console.log('[TTS] Calling ElevenLabs API...');
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
        output_format: 'mp3_44100_128',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] ElevenLabs API error:', response.status, errorText);
      console.error('[TTS] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      
      if (response.status === 401) {
        throw new Error('API key non valida');
      } else if (response.status === 429) {
        throw new Error('Limite mensile raggiunto (10,000 caratteri). Riprova il prossimo mese.');
      }
      
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('[TTS] Audio received, size:', audioBuffer.byteLength, 'bytes');
    
    const base64Audio = btoa(
      Array.from(new Uint8Array(audioBuffer))
        .map(b => String.fromCharCode(b))
        .join('')
    );

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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
