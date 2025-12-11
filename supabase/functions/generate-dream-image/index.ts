import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { RateLimiter, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { generateDreamImageSchema } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. JWT Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticazione richiesta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    console.log('Attempting authentication with token...');

    // Create client and verify user with the token
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error details:', authError.message);
      return new Response(
        JSON.stringify({ error: 'Autenticazione non valida', details: authError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error('No user returned from auth');
      return new Response(
        JSON.stringify({ error: 'Utente non trovato' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // 2. Rate Limiting
    const rateLimiter = new RateLimiter();
    const rateLimit = await rateLimiter.checkLimit(
      user.id,
      'generate-dream-image',
      RATE_LIMITS.DREAM_OPERATIONS
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

    // 3. Input Validation
    const requestBody = await req.json();
    const validation = generateDreamImageSchema.safeParse(requestBody);
    
    if (!validation.success) {
      console.error('Validation failed:', JSON.stringify(validation.error.issues, null, 2));
      console.error('Request body was:', JSON.stringify(requestBody, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Dati non validi', 
          details: validation.error.issues.map(i => i.message).join(', ')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { dreamId, content, mood, imageStyle, autoStyle, customPrompt } = validation.data;

    console.log('Richiesta generazione immagine per sogno:', dreamId);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Verify dream ownership
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('user_id')
      .eq('id', dreamId)
      .single();

    if (dreamError || !dream) {
      return new Response(
        JSON.stringify({ error: 'Sogno non trovato' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (dream.user_id !== user.id) {
      console.error('Ownership verification failed');
      return new Response(
        JSON.stringify({ error: 'Non sei autorizzato a generare immagini per questo sogno' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determina lo stile da usare
    let finalStyle = imageStyle;
    
    if (autoStyle) {
      console.log('Determinazione automatica dello stile...');
      
      const styleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
      });

      if (!styleResponse.ok) {
        if (styleResponse.status === 429 || styleResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: styleResponse.status === 429 ? 'Rate limit raggiunto' : 'Crediti insufficienti' }),
            { status: styleResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error('Errore nella determinazione dello stile');
      }

      const styleData = await styleResponse.json();
      finalStyle = styleData.choices[0].message.content.trim().toLowerCase();
      console.log('Stile determinato automaticamente:', finalStyle);
    }

    // Mappa degli stili con descrizioni ottimizzate
    const styleDescriptions: Record<string, string> = {
      'realistico': 'fotorealistico, dettagliato, cinematografico, illuminazione naturale',
      'onirico': 'surreale, etereo, atmosfera dreamlike, colori pastello, elementi fluttuanti',
      'artistico': 'dipinto ad olio, pittorico, pennellate visibili, stile impressionista',
      'minimalista': 'minimalista, design pulito, forme geometriche semplici, palette limitata',
      'fantastico': 'fantasy art, magico, elementi fantastici, colori vividi, luci brillanti'
    };

    const moodColors: Record<string, string> = {
      'felicita': 'toni caldi dorati e gialli luminosi',
      'tristezza': 'toni freddi blu e grigi',
      'rabbia': 'rossi intensi e arancioni ardenti',
      'paura': 'toni scuri e ombre profonde',
      'sorpresa': 'colori brillanti e contrastanti',
      'disgusto': 'verdi torbidi e marroni',
      'ansia': 'grigi nebbiosi e viola tesi',
      'calma': 'blu sereni e verdi acquatici',
      'eccitazione': 'colori vivaci e saturi',
      'confusione': 'colori sfocati e mischiati',
      'noia': 'toni neutri e desaturati',
      'vergogna': 'rosa pallidi e rossi sbiaditi',
      'orgoglio': 'ori e porpora regali'
    };

    const styleDesc = styleDescriptions[finalStyle || 'onirico'] || styleDescriptions['onirico'];
    const colorDesc = mood ? moodColors[mood.toLowerCase()] || 'colori naturali' : 'colori naturali';
    
    let imagePrompt = `Crea un'immagine ${styleDesc} che rappresenti questo sogno: ${content}. 
Usa ${colorDesc} per riflettere l'emozione. 
L'immagine deve essere evocativa, simbolica e catturare l'essenza onirica del sogno. 
Aspect ratio 16:9, alta qualità, composizione bilanciata.`;

    if (customPrompt) {
      imagePrompt += `\n\nSuggerimenti aggiuntivi dall'utente: ${customPrompt}`;
      console.log('Suggerimenti personalizzati aggiunti');
    }

    console.log('Generazione immagine con Nano Banana...');

    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: imagePrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!imageResponse.ok) {
      if (imageResponse.status === 429 || imageResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: imageResponse.status === 429 ? 'Rate limit raggiunto' : 'Crediti insufficienti' }),
          { status: imageResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Errore generazione immagine: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('Nessuna immagine generata');
    }

    console.log('Immagine generata con successo');

    // Salva l'URL dell'immagine nel database
    const { error: updateError } = await supabase
      .from('dreams')
      .update({
        image_url: imageUrl,
        image_style: finalStyle
      })
      .eq('id', dreamId);

    if (updateError) {
      console.error('Errore nel salvataggio dell\'immagine:', updateError);
    }

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
    console.error('Error in generate-dream-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
