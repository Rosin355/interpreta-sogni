import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { RateLimiter, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { interpretDreamSchema } from "../_shared/validation.ts";
import {
  computeDreamPhase,
  extractPhaseFromInterpretation,
  localizeItalianMoodWords,
} from "../_shared/alchemical-calculator.ts";
import {
  buildKbPromptSection,
  isKbRetrievalEnabledForUser,
  retrieveKnowledgeContext,
  stripKbCitationMarkers,
} from "../_shared/knowledge-retrieval.ts";
import { captureDreamSymbols } from "../_shared/symbol-extraction.ts";

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

    // 3. Input Validation — accept BOTH iOS snake_case `dream_id` and web
    // camelCase `dreamId`. Validation must not require either before we can
    // normalize, so both are optional in the schema and resolved here.
    const requestBody = await req.json();

    const validation = interpretDreamSchema.safeParse(requestBody);

    if (!validation.success) {
      console.error('[interpret-dream] Validation failed:', validation.error.issues.map(i => i.message).join(', '));
      return new Response(
        JSON.stringify({
          error: 'Dati non validi',
          details: validation.error.issues.map(i => i.message).join(', ')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = validation.data;
    const dreamId = body.dream_id ?? body.dreamId;

    // Locale drives the output language. Default to Italian (app-native).
    const locale = (body.locale ?? 'it').trim() || 'it';
    const isItalian = locale.toLowerCase().startsWith('it');

    // Safe request log — never the dream content; the id is truncated to a prefix.
    console.log(
      `[interpret-dream] request dreamIdPrefix=${dreamId ? dreamId.slice(0, 8) : 'none'} style=${body.style ?? 'none'} locale=${body.locale ?? 'none'} hasDreamIdSnake=${!!body.dream_id} hasDreamIdCamel=${!!body.dreamId}`
    );

    if (!dreamId) {
      return new Response(
        JSON.stringify({ error: 'dream_id mancante', error_code: 'missing_dream_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // KB semantic retrieval (tester-gated, FAIL-OPEN). Never blocks interpretation:
    // any failure proceeds with the normal flow and kb_context_used=false. The
    // query is built from dream content but is NEVER logged or stored as the
    // retrieval-log query (stored as NULL inside the helper).
    let kbSection = "";
    let kbContextUsed = false;
    let kbResultCount = 0;
    let kbSources: { title: string; domain: string }[] = [];
    if (isKbRetrievalEnabledForUser(user.id)) {
      const queryText = [
        dream.title,
        dream.tags?.join(", "),
        dream.content,
      ].filter(Boolean).join("\n").slice(0, 2000);

      const kb = await retrieveKnowledgeContext({
        supabaseAdmin: supabase,
        userId: user.id,
        queryText,
        domain: null, // search across all active sources for first rollout
        language: "it",
        matchCount: 3,
        matchThreshold: 0.40,
      });
      if (kb.chunks.length > 0) {
        kbSection = buildKbPromptSection(kb.chunks);
        kbContextUsed = true;
        kbResultCount = kb.resultCount;
        kbSources = kb.chunks.map((c) => ({ title: c.sourceTitle, domain: c.domain }));
      }
    }

    // Costruisci il prompt per l'AI
    const knowledgeContext = knowledgeEntries && knowledgeEntries.length > 0
      ? knowledgeEntries
          .map(entry => `Simbolo: ${entry.symbol}\nCategoria: ${entry.category}\nInterpretazione: ${entry.interpretation}`)
          .join('\n\n')
      : 'Nessuna conoscenza specifica disponibile.';

    const systemPrompt = `Sei un esperto interprete di sogni con conoscenze di psicologia junghiana, simbolismo e interpretazione dei sogni. 
Usa la seguente knowledge base per aiutarti nell'interpretazione:

${knowledgeContext}
${kbSection ? `\n${kbSection}\n` : ''}
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
1. Dichiari la fase dominante come PRIMA cosa della sezione: scrivi SOLTANTO il nome della fase — una sola tra Nigredo, Albedo o Rubedo — da solo e SENZA ripetere l'elenco delle tre opzioni; poi motivala citando i simboli precisi rilevati nel sogno. Questa fase è quella UFFICIALE del sogno e deve restare coerente con tutto il resto del testo (non contraddirla altrove).
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

STILE E LINGUA:
- Scrivi ${isItalian ? 'esclusivamente in italiano' : `nella lingua dell'utente (locale "${locale}")`}.
- Usa SEMPRE le parole emotive nella lingua dell'utente: se il mood è in italiano, mantienilo in italiano (es. "gioia", mai "Joy"; "paura", mai "Fear"). Non tradurre in inglese i termini emotivi.
- Tono intimo, poetico, simbolico, caldo e umano: chiaro, mai clinico, mai generico, mai prolisso.
- Evita le formule fatte da assistente generico (es. "Caro sognatore", "è estremamente significativo", "merita di essere esplorato con attenzione") salvo quando davvero necessario.
- Parla al sognatore in modo diretto e naturale, come una guida simbolica, non come un chatbot.

EMFASI E FORMATTAZIONE:
- Puoi usare il grassetto Markdown (**parola**) SOLO per pochi termini simbolici chiave, con parsimonia: **Rubedo**, **Nigredo**, **Albedo**, **Re**, **Regina**, **unione degli opposti**, **luce dorata**, **Sé**.
- Non mettere in grassetto intere frasi.
- Niente titoli/heading Markdown (#, ##), niente elenchi puntati salvo esplicita necessità.
- Niente citazioni, riferimenti a fonti o marcatori tra parentesi quadre ([1], [2], "Fonte ...").
- Non menzionare mai meccanismi interni, retrieval o Knowledge Base.

Mantieni un tono empatico e umano.`;

    const userPrompt = `Interpreta questo sogno:

Locale utente: ${locale}
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
        const { notifyQuotaToAdmins } = await import("../_shared/error-response.ts");
        notifyQuotaToAdmins({
          provider: "lovable-ai",
          errorCode: "AI_RATE_LIMIT",
          functionName: "interpret-dream",
          technicalMessage: `Lovable AI 429: ${errorText}`,
        }).catch(() => {});
        return new Response(
          JSON.stringify({ errorCode: "AI_RATE_LIMIT", error: `Lovable AI rate limit: ${errorText}` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (aiResponse.status === 402) {
        const { notifyQuotaToAdmins } = await import("../_shared/error-response.ts");
        notifyQuotaToAdmins({
          provider: "lovable-ai",
          errorCode: "AI_CREDITS_EXHAUSTED",
          functionName: "interpret-dream",
          technicalMessage: `Lovable AI 402: ${errorText}`,
        }).catch(() => {});
        return new Response(
          JSON.stringify({ errorCode: "AI_CREDITS_EXHAUSTED", error: `Lovable AI credits exhausted: ${errorText}` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Errore AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawInterpretation = aiData.choices?.[0]?.message?.content;

    if (!rawInterpretation) {
      throw new Error('Nessuna interpretazione ricevuta dall\'AI');
    }

    // Defensive cleanup: strip any internal KB citation markers ([1], [Fonte A])
    // the model may have echoed, then (Italian locale only) repair stray English
    // mood words. Neither removes dream text nor valid Markdown bold.
    const cleanedInterpretation = stripKbCitationMarkers(rawInterpretation);
    const interpretation = isItalian
      ? localizeItalianMoodWords(cleanedInterpretation)
      : cleanedInterpretation;

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
              content: `Riassumi l'interpretazione del sogno in modo breve, lirico e naturale (massimo 500 caratteri), ${isItalian ? 'esclusivamente in italiano' : `nella lingua del locale "${locale}"`}. Mantieni le parole emotive nella stessa lingua (es. "gioia", mai "Joy"). Puoi usare il grassetto **solo** per 1-2 parole simboliche chiave (es. **Rubedo**). Niente citazioni, niente riferimenti a fonti, niente parentesi quadre, niente elenchi puntati. Evita il tono da assistente generico e i concetti incompleti.`
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
        const rawSummary = stripKbCitationMarkers(
          summaryData.choices?.[0]?.message?.content || interpretation.substring(0, 500)
        );
        interpretationSummary = isItalian ? localizeItalianMoodWords(rawSummary) : rawSummary;
      } else {
        interpretationSummary = interpretation.substring(0, 500);
      }
    }

    // Alchemical phase — single source of truth. The phase the AI DECLARED in the
    // "✦ Alchimia" section wins (so the saved value matches the text the user
    // reads). Otherwise fall back to the heuristic — but do NOT silently default
    // to nigredo: on a blind heuristic (low signal or a tie) persist null and log
    // it, so the phase distribution isn't inflated toward Nigredo.
    const declaredPhase = extractPhaseFromInterpretation(interpretation, 'interpret-dream');
    let alchemicalPhase = declaredPhase;
    let phaseSource = 'interpretation';
    if (!alchemicalPhase) {
      const heuristic = computeDreamPhase({
        content: dream.content,
        mood: dream.mood,
        tags: dream.tags,
        interpretation: interpretation
      });
      alchemicalPhase = heuristic.phase;
      phaseSource = heuristic.blind ? `heuristic_blind:${heuristic.reason}` : 'heuristic';
      if (heuristic.blind) {
        console.warn(`ALCHEMICAL_PHASE_NULL function=interpret-dream reason=${heuristic.reason}`);
      }
    }
    console.log(`[interpret-dream] phase=${alchemicalPhase ?? 'null'} source=${phaseSource}`);

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

    // Symbol capture — background, best-effort. Runs ONLY because the
    // interpretation succeeded; a failure never blocks or alters it.
    EdgeRuntime.waitUntil(captureDreamSymbols({
      supabase,
      lovableApiKey,
      dreamId,
      dreamContent: dream.content,
      interpretation,
      functionName: 'interpret-dream',
    }));

    return new Response(
      JSON.stringify({
        interpretation,
        interpretation_summary: interpretationSummary,
        alchemical_phase: alchemicalPhase,
        // Additive, non-breaking metadata (older iOS clients simply ignore it).
        // Source titles/domains only — never chunk content, IDs or embeddings.
        kb_context_used: kbContextUsed,
        kb_result_count: kbResultCount,
        kb_sources: kbSources
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
