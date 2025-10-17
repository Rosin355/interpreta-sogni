import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dreamId, content, mood, imageStyle, autoStyle } = await req.json();

    console.log('Richiesta generazione immagine per sogno:', dreamId);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Determina lo stile da usare
    let finalStyle = imageStyle;
    
    if (autoStyle) {
      console.log('Determinazione automatica dello stile...');
      
      // Chiama Lovable AI per determinare lo stile migliore
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
        if (styleResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit raggiunto. Riprova tra qualche minuto.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (styleResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Crediti insufficienti. Aggiungi fondi al tuo workspace Lovable AI.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Mappa dei colori in base all'umore
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

    // Costruisci il prompt per l'immagine
    const styleDesc = styleDescriptions[finalStyle] || styleDescriptions['onirico'];
    const colorDesc = mood ? moodColors[mood.toLowerCase()] || 'colori naturali' : 'colori naturali';
    
    const imagePrompt = `Crea un'immagine ${styleDesc} che rappresenti questo sogno: ${content}. 
Usa ${colorDesc} per riflettere l'emozione. 
L'immagine deve essere evocativa, simbolica e catturare l'essenza onirica del sogno. 
Aspect ratio 16:9, alta qualità, composizione bilanciata.`;

    console.log('Generazione immagine con Nano Banana...');

    // Genera l'immagine con Nano Banana
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
      if (imageResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit raggiunto. Riprova tra qualche minuto.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (imageResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crediti insufficienti. Aggiungi fondi al tuo workspace Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await imageResponse.text();
      console.error('Errore generazione immagine:', errorText);
      throw new Error('Errore nella generazione dell\'immagine');
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('Nessuna immagine generata');
    }

    console.log('Immagine generata, aggiornamento sogno...');

    // Aggiorna il sogno con l'immagine e lo stile
    const { error: updateError } = await supabase
      .from('dreams')
      .update({
        image_url: imageUrl,
        image_style: finalStyle,
        auto_style: autoStyle
      })
      .eq('id', dreamId);

    if (updateError) {
      console.error('Errore aggiornamento sogno:', updateError);
      throw updateError;
    }

    console.log('Immagine salvata con successo');

    return new Response(
      JSON.stringify({ 
        success: true, 
        image_url: imageUrl,
        image_style: finalStyle
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Errore nella funzione generate-dream-image:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});