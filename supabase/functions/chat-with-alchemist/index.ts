import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { recordUsage, rollbackUsage } from "../_shared/usage-ledger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dreamId, message } = await req.json();

    if (!dreamId || !message) {
      return new Response(
        JSON.stringify({ error: "dreamId e message sono obbligatori" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autenticato" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for knowledge base (RLS restricts to admin only)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch dream
    const { data: dream, error: dreamError } = await supabase
      .from("dreams")
      .select("title, content, interpretation, mood, tags, alchemical_phase, dream_date")
      .eq("id", dreamId)
      .eq("user_id", user.id)
      .single();

    if (dreamError || !dream) {
      return new Response(
        JSON.stringify({ error: "Sogno non trovato" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch conversation history, previous dreams, and knowledge base in parallel
    const [historyResult, prevDreamsResult, knowledgeResult] = await Promise.all([
      // Conversation history
      supabase
        .from("dream_conversations")
        .select("role, content")
        .eq("dream_id", dreamId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50),

      // Last 10 dreams for context
      supabase
        .from("dreams")
        .select("title, content, mood, tags, alchemical_phase, dream_date, interpretation_summary")
        .eq("user_id", user.id)
        .neq("id", dreamId)
        .order("dream_date", { ascending: false })
        .limit(10),

      // Knowledge base: search symbols matching dream tags
      dream.tags?.length
        ? supabaseAdmin
            .from("dream_knowledge_base")
            .select("symbol, interpretation, category, context")
            .in("symbol", dream.tags.map((t: string) => t.toLowerCase()))
            .limit(20)
        : Promise.resolve({ data: [] }),
    ]);

    const history = historyResult.data || [];
    const prevDreams = prevDreamsResult.data || [];
    const knowledgeEntries = knowledgeResult.data || [];

    // Save user message
    await supabase.from("dream_conversations").insert({
      dream_id: dreamId,
      user_id: user.id,
      role: "user",
      content: message,
    });

    // Calculate alchemical profile
    const allDreams = [dream, ...prevDreams];
    const phaseCounts: Record<string, number> = {};
    for (const d of allDreams) {
      if (d.alchemical_phase) {
        phaseCounts[d.alchemical_phase] = (phaseCounts[d.alchemical_phase] || 0) + 1;
      }
    }
    const dominantPhase = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "sconosciuta";
    const phaseProfile = Object.entries(phaseCounts)
      .map(([phase, count]) => `${phase}: ${count} sogni`)
      .join(", ");

    // Build previous dreams context
    const prevDreamsContext = prevDreams.length > 0
      ? prevDreams.map((d: any) => 
          `- "${d.title}" (${d.dream_date})${d.alchemical_phase ? ` [${d.alchemical_phase}]` : ""}: ${(d.content || "").substring(0, 200)}...${d.interpretation_summary ? ` | Sintesi: ${d.interpretation_summary}` : ""}`
        ).join("\n")
      : "Nessun sogno precedente registrato.";

    // Build knowledge base context
    const knowledgeContext = knowledgeEntries.length > 0
      ? knowledgeEntries.map((k: any) =>
          `- **${k.symbol}** (${k.category}): ${k.interpretation}${k.context ? ` [Contesto: ${k.context}]` : ""}`
        ).join("\n")
      : "";

    // Build system prompt
    const systemPrompt = `Sei L'Alchimista, la guida personale del viaggio onirico e alchemico di questo sognatore. Combini psicologia junghiana, simbolismo alchemico, mitologia e intuizione profonda. Parli in italiano con tono caldo, misterioso ma accessibile.

Sei la guida PERSONALE di questo sognatore — lo conosci attraverso i suoi sogni e il suo percorso. Non sei un generico interprete, ma il SUO Alchimista.

## SOGNO CORRENTE

**Titolo:** ${dream.title}
**Data:** ${dream.dream_date}
**Contenuto del sogno:** ${dream.content}
${dream.mood ? `**Umore:** ${dream.mood}` : ""}
${dream.tags?.length ? `**Simboli/Tag:** ${dream.tags.join(", ")}` : ""}
${dream.alchemical_phase ? `**Fase Alchemica:** ${dream.alchemical_phase}` : ""}
${dream.interpretation ? `**Interpretazione AI precedente:** ${dream.interpretation}` : ""}

## SOGNI PRECEDENTI (ultimi 10)

${prevDreamsContext}

## PROFILO ALCHEMICO DEL SOGNATORE

- **Fase dominante:** ${dominantPhase}
- **Distribuzione fasi:** ${phaseProfile || "non ancora determinata"}
- **Numero sogni registrati:** ${allDreams.length}

${knowledgeContext ? `## KNOWLEDGE BASE - SIMBOLI RILEVANTI\n\n${knowledgeContext}` : ""}

## ISTRUZIONI DI COMPORTAMENTO

Le tue risposte devono:
- Esplorare i simboli e i significati nascosti del sogno corrente
- Collegare il sogno alla vita interiore del sognatore e ai suoi sogni precedenti quando pertinente
- Identificare pattern ricorrenti tra i sogni (simboli, emozioni, temi)
- Usare i riferimenti dalla knowledge base quando disponibili per arricchire l'interpretazione
- Guidare il sognatore nel suo viaggio alchemico personale (Nigredo → Albedo → Rubedo)
- Suggerire come il sogno corrente si posiziona nel percorso alchemico complessivo
- Fare domande che stimolino la riflessione e l'auto-esplorazione
- Essere empatico e mai giudicante
- Essere conciso ma profondo (max 300 parole per risposta)
- Non ripetere informazioni già dette nella conversazione`;

    // Build messages for AI
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (history.length > 0) {
      for (const msg of history) {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    aiMessages.push({ role: "user", content: message });

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY non configurata" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the alchemist chat AI call optimistically (feature=advanced_alchemist_message).
    const chatLedgerId = await recordUsage(supabaseAdmin, user.id, 'advanced_alchemist_message', {
      function_name: 'chat-with-alchemist',
      provider: 'lovable',
      model: 'google/gemini-3-flash-preview',
      calls: 1,
    });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const statusCode = aiResponse.status;
      const errorText = await aiResponse.text().catch(() => "");
      // Provider call failed → not billed → roll back the optimistic record.
      await rollbackUsage(supabaseAdmin, chatLedgerId, 'chat-with-alchemist');
      if (statusCode === 429) {
        const { notifyQuotaToAdmins } = await import("../_shared/error-response.ts");
        notifyQuotaToAdmins({
          provider: "lovable-ai",
          errorCode: "AI_RATE_LIMIT",
          functionName: "chat-with-alchemist",
          technicalMessage: `Lovable AI 429: ${errorText}`,
        }).catch(() => {});
        return new Response(
          JSON.stringify({ errorCode: "AI_RATE_LIMIT", error: `Lovable AI rate limit: ${errorText}` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (statusCode === 402) {
        const { notifyQuotaToAdmins } = await import("../_shared/error-response.ts");
        notifyQuotaToAdmins({
          provider: "lovable-ai",
          errorCode: "AI_CREDITS_EXHAUSTED",
          functionName: "chat-with-alchemist",
          technicalMessage: `Lovable AI 402: ${errorText}`,
        }).catch(() => {});
        return new Response(
          JSON.stringify({ errorCode: "AI_CREDITS_EXHAUSTED", error: `Lovable AI credits exhausted: ${errorText}` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", statusCode, errorText);
      return new Response(
        JSON.stringify({ errorCode: "UPSTREAM_UNAVAILABLE", error: `AI gateway ${statusCode}: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      console.error("No content in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ errorCode: "INTERNAL_ERROR", error: "Risposta AI vuota" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save assistant message
    await supabase.from("dream_conversations").insert({
      dream_id: dreamId,
      user_id: user.id,
      role: "assistant",
      content: assistantMessage,
    });

    return new Response(
      JSON.stringify({ reply: assistantMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("chat-with-alchemist error:", error);
    return new Response(
      JSON.stringify({ errorCode: "INTERNAL_ERROR", error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
