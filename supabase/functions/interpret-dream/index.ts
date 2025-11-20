import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dreamId } = await req.json();
    
    if (!dreamId) {
      return new Response(
        JSON.stringify({ error: 'dreamId è richiesto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY non configurato');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Recupera il sogno
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('*')
      .eq('id', dreamId)
      .single();

    if (dreamError || !dream) {
      console.error('Errore nel recupero del sogno:', dreamError);
      return new Response(
        JSON.stringify({ error: 'Sogno non trovato' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Recupera il profilo utente per il genere
    const { data: profile } = await supabase
      .from('profiles')
      .select('gender')
      .eq('id', dream.user_id)
      .single();

    // Cerca nella knowledge base simboli rilevanti
    const { data: knowledgeEntries } = await supabase
      .from('dream_knowledge_base')
      .select('*')
      .limit(20);

    // Costruisci il prompt per l'AI
    const knowledgeContext = knowledgeEntries && knowledgeEntries.length > 0
      ? knowledgeEntries
          .map(entry => `Simbolo: ${entry.symbol}\nCategoria: ${entry.category}\nInterpretazione: ${entry.interpretation}`)
          .join('\n\n')
      : 'Nessuna conoscenza specifica disponibile.';

    const systemPrompt = `Sei un esperto interprete di sogni con conoscenze di psicologia junghiana, simbolismo e interpretazione dei sogni. 
Usa la seguente knowledge base per aiutarti nell'interpretazione:

${knowledgeContext}

${profile?.gender ? `Il sognatore è di genere ${profile.gender}. Considera questo aspetto nelle tue interpretazioni quando rilevante per archetipi, simbolismi o dinamiche psicologiche.` : ''}

Fornisci un'interpretazione approfondita ma accessibile del sogno, considerando:
- I simboli presenti
- Il mood emotivo
- Il contesto temporale
- Possibili significati psicologici
- Connessioni con l'inconscio

REGOLE ESSENZIALI:
- Lunghezza: 250-350 parole
- IMPORTANTE: concludi sempre il pensiero con una frase completa e significativa, anche se stai raggiungendo il limite di lunghezza
- Termina sempre con una frase conclusiva completa
- Non lasciare mai concetti incompleti o frasi troncate
- Se stai per raggiungere il limite, concludi elegantemente il discorso
- È meglio una interpretazione più breve ma completa che una lunga ma tagliata

Mantieni un tono empatico e professionale. Scrivi in italiano.`;

    const userPrompt = `Interpreta questo sogno:

Titolo: ${dream.title}
Data: ${dream.dream_date}
Mood: ${dream.mood || 'Non specificato'}
Tags: ${dream.tags?.join(', ') || 'Nessun tag'}

Contenuto:
${dream.content}

Fornisci un'interpretazione dettagliata e significativa.`;

    console.log('Chiamata a Lovable AI per interpretazione...');

    // Chiama Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Errore Lovable AI:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite di richieste superato. Riprova tra poco.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crediti esauriti. Aggiungi crediti al tuo workspace Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Errore AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const interpretation = aiData.choices?.[0]?.message?.content;

    if (!interpretation) {
      throw new Error('Nessuna interpretazione ricevuta dall\'AI');
    }

    console.log(`Interpretazione generata: ${interpretation.length} caratteri`);

    // Genera riassunto intelligente se > 500 caratteri
    let interpretationSummary = interpretation;

    if (interpretation.length > 500) {
      console.log('Generazione riassunto per TTS...');
      
      const summaryPrompt = `Riassumi questa interpretazione di sogno in MASSIMO 500 caratteri, mantenendo:
- I concetti chiave e simboli principali
- Il tono empatico
- Le conclusioni importanti
IMPORTANTE: termina sempre con una frase completa e significativa.

Interpretazione completa:
${interpretation}

Riassunto (max 500 caratteri):`;

      const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: summaryPrompt }
          ],
          max_tokens: 200,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const generatedSummary = summaryData.choices?.[0]?.message?.content?.trim();
        
        if (generatedSummary && generatedSummary.length <= 500) {
          interpretationSummary = generatedSummary;
          console.log(`Riassunto generato: ${interpretationSummary.length} caratteri`);
        } else {
          interpretationSummary = interpretation.substring(0, 497) + '...';
          console.log('Fallback: riassunto troncato');
        }
      } else {
        interpretationSummary = interpretation.substring(0, 497) + '...';
        console.log('Fallback: riassunto troncato (errore API)');
      }
    }

    console.log('Interpretazione salvata, aggiornamento sogno...');

    // Salva interpretazione completa e riassunto nel database
    const { error: updateError } = await supabase
      .from('dreams')
      .update({ 
        interpretation,
        interpretation_summary: interpretationSummary 
      })
      .eq('id', dreamId);

    if (updateError) {
      console.error('Errore nell\'aggiornamento del sogno:', updateError);
      throw updateError;
    }

    console.log('Interpretazione e riassunto salvati con successo');

    return new Response(
      JSON.stringify({ 
        interpretation,
        interpretation_summary: interpretationSummary 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Errore in interpret-dream:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Errore sconosciuto' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
