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

Fornisci un'interpretazione approfondita ma accessibile del sogno, considerando:
- I simboli presenti
- Il mood emotivo
- Il contesto temporale
- Possibili significati psicologici
- Connessioni con l'inconscio

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

    console.log('Interpretazione generata, aggiornamento sogno...');

    // Salva l'interpretazione nel database
    const { error: updateError } = await supabase
      .from('dreams')
      .update({ interpretation })
      .eq('id', dreamId);

    if (updateError) {
      console.error('Errore nell\'aggiornamento del sogno:', updateError);
      throw updateError;
    }

    console.log('Interpretazione salvata con successo');

    return new Response(
      JSON.stringify({ interpretation }),
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
