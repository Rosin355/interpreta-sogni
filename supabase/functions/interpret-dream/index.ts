import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { RateLimiter, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { interpretDreamSchema } from "../_shared/validation.ts";
import { calculateDreamPhase } from "../_shared/alchemical-calculator.ts";

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY non configurato');
    }

    // Authenticate user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
      'interpret-dream',
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
    console.log('[interpret-dream] Request body:', JSON.stringify(requestBody, null, 2));
    
    const validation = interpretDreamSchema.safeParse(requestBody);
    
    if (!validation.success) {
      console.error('[interpret-dream] Validation failed:', JSON.stringify(validation.error.issues, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Dati non validi', 
          details: validation.error.issues.map(i => i.message).join(', ')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { dreamId } = validation.data;
    console.log('[interpret-dream] Processing dreamId:', dreamId);

    // Use service role to fetch dream
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Fetch dream and verify ownership
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

    // Verify ownership
    if (dream.user_id !== user.id) {
      console.error('Ownership verification failed:', { dreamUserId: dream.user_id, requestUserId: user.id });
      return new Response(
        JSON.stringify({ error: 'Non sei autorizzato ad interpretare questo sogno' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

LESSICO SIMBOLICO ALCHEMICO (usalo come griglia di lettura, non come tassonomia rigida):

🌑 NIGREDO — oscurità, peso, impurità, primordiale, decomposizione, abisso, materia nera, indifferenziazione.
Animale tipico: il CORVO.
Immagini guida: sangue; scimmioni, corvi, rinoceronti, coccodrilli, serpenti, topi, elefanti, maiali; animali pesanti, "sporchi" o primordiali come lo squalo, il calamaro gigante, l'orca; acqua sporca o nera; terra sporca o nera; cieli neri senza stelle né astri; ambienti di paura, putrefazione, dissoluzione.
Nota essenziale: la Nigredo NON è una fase negativa di per sé. È "negativa" nel senso che NEGA la distinzione (Viveka): è una fase di indifferenziazione necessaria, materia prima della trasformazione, mai un giudizio sul sognatore.

🌙 ALBEDO — purificazione, chiarezza, lunarità, bianchezza, leggerezza, grazia, mediazione tra terra, acqua e cielo.
Animale tipico: l'UNICORNO.
Immagini guida: luna, stelle; animali e uccelli bianchi dal portamento leggiadro (aironi, colombe, cigni, oche, conigli); creature che toccano la terra o l'acqua e si elevano nel cielo; acque limpide, alba, neve, specchi.

☀️ RUBEDO — integrazione, pienezza, luce solare, fertilità, unione, benedizione, amore irradiato, compimento.
Simboli tipici: il RUBINO, i DIAMANTI, i GIOIELLI, il SOLE.
Immagini guida: campi di grano e immagini di fertilità; sole molto lucente; arcobaleno; nuvole paradisiache; abbracci lucenti che emanano amore estremo; unioni sessuali o romantiche che donano sensazioni di estremo benessere; divinità che si comportano in modo benefico nei confronti del sognatore; oro.

REGOLE INTERPRETATIVE:
- Questi simboli sono SEGNALI, non verdetti: nessun singolo simbolo decide da solo la fase.
- Pesa ogni immagine insieme a tono emotivo, atmosfera, immagini dominanti e trasformazione narrata.
- Se il sogno contiene simboli misti, motiva la fase dominante e riconosci eventuali elementi secondari di un'altra fase (es. "Nigredo dominante con aperture di Albedo").
- Integra il lessico in modo poetico, mai meccanico o didascalico.

SEZIONE "✦ ALCHIMIA" (OBBLIGATORIA in chiusura dell'interpretazione):
Includi sempre un paragrafo finale dedicato, introdotto da "✦ Alchimia", in cui:
1. Dichiari la fase dominante (Nigredo / Albedo / Rubedo) e la motivi citando i simboli precisi rilevati nel sogno.
2. Riconosci eventuali aperture verso un'altra fase, se presenti.
3. Espandi liberamente con ciò che ritieni più utile al sognatore: significato della fase nel suo percorso, cosa la fase "chiede" di integrare, suggerimenti di consapevolezza e pratiche di attenzione interiore coerenti.
4. Se la fase è Nigredo, ricorda esplicitamente che non è un giudizio negativo ma una fase di indifferenziazione (Viveka) necessaria alla trasformazione.

Fornisci un'interpretazione approfondita ma accessibile del sogno, considerando:
- I simboli presenti (anche alla luce del lessico alchemico sopra)
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

    console.log('[interpret-dream] Calling Lovable AI for interpretation...');
    console.log('[interpret-dream] System prompt length:', systemPrompt.length);
    console.log('[interpret-dream] User prompt length:', userPrompt.length);

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

    console.log('Interpretazione generata con successo');

    // Generate summary if needed (if longer than 500 chars)
    let interpretationSummary = interpretation;
    if (interpretation.length > 500) {
      console.log('Generazione summary per TTS...');
      
      const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: 'Sei un esperto nel riassumere interpretazioni di sogni. Crea un riassunto conciso ma completo, massimo 500 caratteri, mantenendo i concetti chiave.' 
            },
            { 
              role: 'user', 
              content: `Riassumi questa interpretazione in massimo 500 caratteri:\n\n${interpretation}` 
            }
          ],
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        interpretationSummary = summaryData.choices?.[0]?.message?.content || interpretation.substring(0, 500);
      } else {
        interpretationSummary = interpretation.substring(0, 500);
      }
    }

    // Calcola la fase alchemica
    console.log('Calcolo fase alchemica...');
    const alchemicalPhase = calculateDreamPhase({
      content: dream.content,
      mood: dream.mood,
      tags: dream.tags,
      interpretation: interpretation
    });
    console.log(`Fase alchemica calcolata: ${alchemicalPhase}`);

    // Salva l'interpretazione e la fase alchemica nel database
    const { error: updateError } = await supabase
      .from('dreams')
      .update({ 
        interpretation,
        interpretation_summary: interpretationSummary,
        alchemical_phase: alchemicalPhase
      })
      .eq('id', dreamId);

    if (updateError) {
      console.error('Errore nel salvataggio dell\'interpretazione:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        interpretation,
        interpretation_summary: interpretationSummary,
        alchemical_phase: alchemicalPhase
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
    console.error('[interpret-dream] FATAL ERROR:', error);
    console.error('[interpret-dream] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
