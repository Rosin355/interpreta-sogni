import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { RateLimiter, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { suggestTagsSchema } from "../_shared/validation.ts";
import { recordUsage, rollbackUsage } from "../_shared/usage-ledger.ts";

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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    // Authenticate user
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Autenticazione non valida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // 2. Rate Limiting
    const rateLimiter = new RateLimiter();
    const rateLimit = await rateLimiter.checkLimit(
      user.id,
      'suggest-tags',
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
    console.log('[suggest-tags] Request received, content length:', requestBody.content?.length || 0);
    
    const validation = suggestTagsSchema.safeParse(requestBody);
    
    if (!validation.success) {
      console.error('[suggest-tags] Validation failed:', JSON.stringify(validation.error.issues, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Dati non validi', 
          details: validation.error.issues.map(i => i.message).join(', '),
          tags: []
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content } = validation.data;
    console.log('[suggest-tags] Processing content preview:', content.substring(0, 100));

    const systemPrompt = `Sei un esperto analista di sogni. Analizza il testo del sogno e suggerisci tag appropriati basandoti sulle seguenti categorie:

${dreamCategories.map(cat => `- ${cat.name}: ${cat.keywords.join(', ')}`).join('\n')}

Identifica temi principali, emozioni, simboli e luoghi. Suggerisci 3-7 tag rilevanti in italiano.
Ogni tag dovrebbe essere breve (1-3 parole) e pertinente al contenuto del sogno.`;

    // Record the tag-suggestion AI call optimistically (feature=suggest_tags).
    const usageAdmin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const tagsLedgerId = await recordUsage(usageAdmin, user.id, 'suggest_tags', {
      function_name: 'suggest-tags',
      provider: 'lovable',
      model: 'google/gemini-2.5-flash',
      calls: 1,
    });

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

    if (response.status === 429 || response.status === 402) {
      await rollbackUsage(usageAdmin, tagsLedgerId, 'suggest-tags');
      const code = response.status === 429 ? 'AI_RATE_LIMIT' : 'AI_CREDITS_EXHAUSTED';
      const { notifyQuotaToAdmins } = await import("../_shared/error-response.ts");
      notifyQuotaToAdmins({
        provider: 'lovable-ai',
        errorCode: code,
        functionName: 'suggest-tags',
        technicalMessage: `Lovable AI ${response.status}`,
      }).catch(() => {});
      return new Response(
        JSON.stringify({ errorCode: code, error: `Lovable AI ${response.status}`, tags: [] }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      await rollbackUsage(usageAdmin, tagsLedgerId, 'suggest-tags');
      const errorText = await response.text();
      console.error('[suggest-tags] AI API error:', response.status, errorText);
      console.error('[suggest-tags] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[suggest-tags] AI response received, processing tool calls...');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ tags: [] }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          } 
        }
      );
    }

    const suggestedTags = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ tags: suggestedTags.tags }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        } 
      }
    );

  } catch (error) {
    console.error('[suggest-tags] FATAL ERROR:', error);
    console.error('[suggest-tags] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ errorCode: 'INTERNAL_ERROR', error: error.message, tags: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
