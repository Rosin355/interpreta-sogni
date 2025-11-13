import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const dreamCategories = [
  {
    id: 'nightmare',
    name: 'Incubi',
    keywords: ['incubo', 'paura', 'terrore', 'angoscia', 'morte', 'inseguimento']
  },
  {
    id: 'lucid',
    name: 'Sogni Lucidi',
    keywords: ['lucido', 'consapevole', 'controllo', 'lucidità']
  },
  {
    id: 'flying',
    name: 'Volare',
    keywords: ['volar', 'volo', 'libertà', 'ali']
  },
  {
    id: 'love',
    name: 'Amore',
    keywords: ['amore', 'cuore', 'bacio', 'romantico', 'partner', 'famiglia']
  },
  {
    id: 'nature',
    name: 'Natura',
    keywords: ['acqua', 'mare', 'oceano', 'fiume', 'pioggia', 'natura', 'foresta']
  },
  {
    id: 'recurring',
    name: 'Ricorrenti',
    keywords: ['ricorrent', 'premonitori', 'simbolico']
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content || content.length < 20) {
      return new Response(
        JSON.stringify({ tags: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Sei un esperto analista di sogni. Analizza il testo del sogno e suggerisci tag appropriati basandoti sulle seguenti categorie:

${dreamCategories.map(cat => `- ${cat.name}: ${cat.keywords.join(', ')}`).join('\n')}

Identifica temi principali, emozioni, simboli e luoghi. Suggerisci 3-7 tag rilevanti in italiano.
Ogni tag dovrebbe essere breve (1-3 parole) e pertinente al contenuto del sogno.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analizza questo sogno e suggerisci tag appropriati:\n\n${content}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_dream_tags',
              description: 'Suggerisci tag appropriati per il sogno analizzato',
              parameters: {
                type: 'object',
                properties: {
                  tags: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        tag: { type: 'string', description: 'Il tag suggerito in italiano' },
                        confidence: { type: 'number', description: 'Livello di confidenza 0-1' },
                        category: { type: 'string', description: 'Categoria del tag' }
                      },
                      required: ['tag', 'confidence', 'category']
                    },
                    minItems: 3,
                    maxItems: 7
                  }
                },
                required: ['tags']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_dream_tags' } }
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Payment required', code: 'PAYMENT_REQUIRED' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ tags: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestedTags = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ tags: suggestedTags.tags }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-tags function:', error);
    return new Response(
      JSON.stringify({ error: error.message, tags: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
