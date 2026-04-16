import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { RateLimiter, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { generateDreamImageSchema } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] === START generate-dream-image ===`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. JWT Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log(`[${requestId}] ERROR: Missing authorization header`);
      return new Response(
        JSON.stringify({ error: 'Autenticazione richiesta', errorCode: 'AUTH_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error(`[${requestId}] ERROR: LOVABLE_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: 'Configurazione server mancante', errorCode: 'CONFIG_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Authenticating user...`);

    // Create client with auth header for automatic JWT signing key support
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error(`[${requestId}] Auth error:`, authError.message);
      return new Response(
        JSON.stringify({ error: 'Autenticazione non valida', errorCode: 'AUTH_INVALID', details: authError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error(`[${requestId}] No user returned from auth`);
      return new Response(
        JSON.stringify({ error: 'Utente non trovato', errorCode: 'USER_NOT_FOUND' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Authenticated user: ${user.id}`);

    // 2. Rate Limiting
    console.log(`[${requestId}] Checking rate limit...`);
    const rateLimiter = new RateLimiter();
    const rateLimit = await rateLimiter.checkLimit(
      user.id,
      'generate-dream-image',
      RATE_LIMITS.DREAM_OPERATIONS
    );

    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetAt);
      console.log(`[${requestId}] Rate limit exceeded. Reset at: ${resetDate.toISOString()}`);
      return new Response(
        JSON.stringify({ 
          error: 'Limite di richieste raggiunto. Riprova più tardi.',
          errorCode: 'RATE_LIMIT',
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

    console.log(`[${requestId}] Rate limit OK. Remaining: ${rateLimit.remaining}`);

    // 3. Input Validation
    let requestBody;
    try {
      requestBody = await req.json();
      console.log(`[${requestId}] Request body received:`, JSON.stringify({
        dreamId: requestBody.dreamId,
        contentLength: requestBody.content?.length || 0,
        mood: requestBody.mood,
        imageStyle: requestBody.imageStyle,
        autoStyle: requestBody.autoStyle,
        hasCustomPrompt: !!requestBody.customPrompt
      }));
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse error:`, parseError);
      return new Response(
        JSON.stringify({ error: 'Richiesta non valida', errorCode: 'INVALID_JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = generateDreamImageSchema.safeParse(requestBody);
    
    if (!validation.success) {
      console.error(`[${requestId}] Validation failed:`, JSON.stringify(validation.error.issues, null, 2));
      console.error(`[${requestId}] Request body was:`, JSON.stringify(requestBody, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Dati non validi', 
          errorCode: 'VALIDATION_ERROR',
          details: validation.error.issues.map(i => i.message).join(', ')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { dreamId, content, mood, imageStyle, autoStyle, customPrompt } = validation.data;

    console.log(`[${requestId}] Validated data - dreamId: ${dreamId}, contentLength: ${content.length}, mood: ${mood}, style: ${imageStyle}, autoStyle: ${autoStyle}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Verify dream ownership
    console.log(`[${requestId}] Verifying dream ownership...`);
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('user_id')
      .eq('id', dreamId)
      .single();

    if (dreamError || !dream) {
      console.error(`[${requestId}] Dream not found:`, dreamError?.message);
      return new Response(
        JSON.stringify({ error: 'Sogno non trovato', errorCode: 'DREAM_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (dream.user_id !== user.id) {
      console.error(`[${requestId}] Ownership verification failed. Dream owner: ${dream.user_id}, Request user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Non sei autorizzato a generare immagini per questo sogno', errorCode: 'FORBIDDEN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Dream ownership verified`);

    // Determina lo stile da usare
    let finalStyle = imageStyle;
    
    if (autoStyle) {
      console.log(`[${requestId}] Auto-determining style...`);
      
      const styleRequestBody = {
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Sei un esperto di interpretazione dei sogni. Analizza il sogno e scegli lo stile visivo più adatto tra: realistico, onirico, artistico, minimalista, fantastico. Rispondi SOLO con una di queste parole, senza spiegazioni.'
          },
          {
            role: 'user',
            content: `Sogno: ${content}\nUmore: ${mood || 'neutro'}`
          }
        ],
      };
      
      console.log(`[${requestId}] Calling Lovable AI for style determination...`);
      
      const styleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(styleRequestBody),
      });

      console.log(`[${requestId}] Style API response status: ${styleResponse.status}`);

      if (!styleResponse.ok) {
        const errorText = await styleResponse.text();
        console.error(`[${requestId}] Style API error - Status: ${styleResponse.status}, Body: ${errorText}`);
        
        if (styleResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Limite richieste API raggiunto. Riprova tra qualche minuto.', errorCode: 'AI_RATE_LIMIT' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (styleResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Crediti AI insufficienti. Contatta il supporto.', errorCode: 'AI_CREDITS_EXHAUSTED' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Fallback to default style instead of failing
        console.log(`[${requestId}] Falling back to default style 'onirico'`);
        finalStyle = 'onirico';
      } else {
        const styleData = await styleResponse.json();
        finalStyle = styleData.choices[0].message.content.trim().toLowerCase();
        console.log(`[${requestId}] Auto-determined style: ${finalStyle}`);
      }
    }

    // Style descriptions in English for better model performance
    const styleDescriptions: Record<string, string> = {
      'realistico': 'photorealistic, detailed, cinematic lighting, natural tones',
      'onirico': 'surreal, ethereal, dreamlike atmosphere, soft pastel colors, floating elements',
      'artistico': 'oil painting style, painterly, visible brushstrokes, impressionist',
      'minimalista': 'minimalist, clean design, simple geometric shapes, limited palette',
      'fantastico': 'fantasy art, magical, vivid colors, brilliant lights, enchanted'
    };

    const moodColors: Record<string, string> = {
      'felicita': 'warm golden and bright yellow tones',
      'tristezza': 'cool blue and grey tones',
      'rabbia': 'intense red and fiery orange tones',
      'paura': 'dark tones and deep shadows',
      'sorpresa': 'bright contrasting colors',
      'disgusto': 'murky greens and browns',
      'ansia': 'foggy greys and tense purples',
      'calma': 'serene blues and aquatic greens',
      'eccitazione': 'vivid saturated colors',
      'confusione': 'blurred mixed colors',
      'noia': 'neutral desaturated tones',
      'vergogna': 'pale pinks and faded reds',
      'orgoglio': 'regal golds and purples'
    };

    const styleDesc = styleDescriptions[finalStyle || 'onirico'] || styleDescriptions['onirico'];
    const colorDesc = mood ? moodColors[mood.toLowerCase()] || 'natural colors' : 'natural colors';
    
    // Truncate content to ~800 chars to reduce prompt length and rate limit risk
    const truncatedContent = content.length > 800 
      ? content.substring(0, 800) + '...' 
      : content;
    
    let imagePrompt = `Create a ${styleDesc} image representing this dream: ${truncatedContent}. 
Use ${colorDesc} to reflect the emotion. 
The image should be evocative, symbolic, and capture the dreamlike essence. 
Aspect ratio 16:9, high quality, balanced composition.`;

    if (customPrompt) {
      imagePrompt += `\n\nAdditional user instructions: ${customPrompt}`;
      console.log(`[${requestId}] Custom prompt added (${customPrompt.length} chars)`);
    }

    console.log(`[${requestId}] === GENERATING IMAGE ===`);
    console.log(`[${requestId}] Final style: ${finalStyle}`);
    console.log(`[${requestId}] Prompt length: ${imagePrompt.length} chars`);

    // Helper to call the image API with retry on embedded 429
    const callImageApi = async (): Promise<{ imageUrl?: string; error?: any }> => {
      const imageRequestBody = {
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: imagePrompt
          }
        ],
        modalities: ['image', 'text']
      };

      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(imageRequestBody),
      });

      console.log(`[${requestId}] Image API response status: ${resp.status}`);

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error(`[${requestId}] Image API error - Status: ${resp.status}, Body: ${errorText}`);
        return { error: { status: resp.status, text: errorText } };
      }

      const data = await resp.json();

      // Check for embedded errors (API returns 200 but error inside body)
      const embeddedError = data.choices?.[0]?.error;
      if (embeddedError) {
        console.error(`[${requestId}] Embedded error in response:`, JSON.stringify(embeddedError));
        return { error: { embedded: true, code: embeddedError.code, type: embeddedError.metadata?.error_type } };
      }

      const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      return url ? { imageUrl: url } : { error: { noImage: true, responsePreview: JSON.stringify(data).slice(0, 500) } };
    };

    // First attempt
    let result = await callImageApi();

    // Retry once on rate limit (embedded 429) after 3s backoff
    if (result.error?.embedded && result.error?.code === 429) {
      console.log(`[${requestId}] Rate limited (embedded 429), retrying after 3s...`);
      await new Promise(r => setTimeout(r, 3000));
      result = await callImageApi();
    }

    // Handle final errors
    if (result.error) {
      if (result.error.status === 429 || (result.error.embedded && result.error.code === 429)) {
        return new Response(
          JSON.stringify({ error: 'Limite richieste API raggiunto. Riprova tra qualche minuto.', errorCode: 'AI_RATE_LIMIT' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (result.error.status === 402 || (result.error.embedded && result.error.code === 402)) {
        return new Response(
          JSON.stringify({ error: 'Crediti AI insufficienti. Contatta il supporto.', errorCode: 'AI_CREDITS_EXHAUSTED' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (result.error.noImage) {
        console.error(`[${requestId}] No image URL in response:`, result.error.responsePreview);
        return new Response(
          JSON.stringify({ error: 'Nessuna immagine generata dall\'AI', errorCode: 'NO_IMAGE' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Errore generazione immagine`, errorCode: 'AI_ERROR', details: result.error.text?.slice(0, 200) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageUrl = result.imageUrl!;
    console.log(`[${requestId}] Image generated successfully (URL length: ${imageUrl.length})`);
    // Salva l'URL dell'immagine nel database
    console.log(`[${requestId}] Saving image to database...`);
    const { error: updateError } = await supabase
      .from('dreams')
      .update({
        image_url: imageUrl,
        image_style: finalStyle
      })
      .eq('id', dreamId);

    if (updateError) {
      console.error(`[${requestId}] Database update error:`, updateError);
      // Don't fail the request, still return the image
    } else {
      console.log(`[${requestId}] Image saved to database`);
    }

    console.log(`[${requestId}] === END generate-dream-image SUCCESS ===`);

    return new Response(
      JSON.stringify({ 
        image_url: imageUrl,
        imageUrl: imageUrl, // backward compatibility
        image_style: finalStyle,
        style: finalStyle // backward compatibility
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        } 
      }
    );

  } catch (error) {
    console.error(`[${requestId}] UNEXPECTED ERROR:`, error);
    console.error(`[${requestId}] Error stack:`, error.stack);
    return new Response(
      JSON.stringify({ error: error.message || 'Errore imprevisto', errorCode: 'UNEXPECTED_ERROR' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
