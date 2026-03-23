import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

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

    // Fetch conversation history
    const { data: history } = await supabase
      .from("dream_conversations")
      .select("role, content")
      .eq("dream_id", dreamId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50);

    // Save user message
    await supabase.from("dream_conversations").insert({
      dream_id: dreamId,
      user_id: user.id,
      role: "user",
      content: message,
    });

    // Build system prompt
    const systemPrompt = `Sei L'Alchimista, un esperto e saggio interprete dei sogni che combina psicologia junghiana, simbolismo alchemico e intuizione profonda. Parli in italiano con tono caldo, misterioso ma accessibile.

Il sognatore sta discutendo con te il seguente sogno:

**Titolo:** ${dream.title}
**Data:** ${dream.dream_date}
**Contenuto del sogno:** ${dream.content}
${dream.mood ? `**Umore:** ${dream.mood}` : ""}
${dream.tags?.length ? `**Simboli/Tag:** ${dream.tags.join(", ")}` : ""}
${dream.alchemical_phase ? `**Fase Alchemica:** ${dream.alchemical_phase}` : ""}
${dream.interpretation ? `**Interpretazione AI precedente:** ${dream.interpretation}` : ""}

Le tue risposte devono:
- Esplorare i simboli e i significati nascosti del sogno
- Collegare il sogno alla vita interiore del sognatore
- Usare riferimenti alchemici (Nigredo, Albedo, Rubedo) quando pertinente
- Fare domande che stimolino la riflessione
- Essere empatiche e mai giudicanti
- Essere concise ma profonde (max 300 parole per risposta)`;

    // Build messages for AI
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (history && history.length > 0) {
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
      if (statusCode === 429) {
        return new Response(
          JSON.stringify({ error: "Limite richieste raggiunto. Riprova tra qualche minuto." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (statusCode === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti AI esauriti." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", statusCode, errorText);
      return new Response(
        JSON.stringify({ error: "Errore nella generazione della risposta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      console.error("No content in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Risposta AI vuota" }),
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
