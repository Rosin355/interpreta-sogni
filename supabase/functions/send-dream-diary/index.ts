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
    const { mode, dreamId } = await req.json();

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

    // Fetch dreams
    let dreamsQuery = supabase
      .from("dreams")
      .select("id, title, content, dream_date, mood, tags, alchemical_phase, interpretation, interpretation_summary")
      .eq("user_id", user.id)
      .order("dream_date", { ascending: false });

    if (mode === "single" && dreamId) {
      dreamsQuery = dreamsQuery.eq("id", dreamId);
    }

    const { data: dreams, error: dreamsError } = await dreamsQuery;
    if (dreamsError || !dreams?.length) {
      return new Response(
        JSON.stringify({ error: "Nessun sogno trovato" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch conversations
    const dreamIds = dreams.map((d: any) => d.id);
    const { data: conversations } = await supabase
      .from("dream_conversations")
      .select("dream_id, role, content, created_at")
      .in("dream_id", dreamIds)
      .order("created_at", { ascending: true });

    // Build HTML email content
    const dreamEntries = dreams.map((dream: any) => {
      const dreamConvos = (conversations || []).filter((c: any) => c.dream_id === dream.id);
      const date = new Date(dream.dream_date).toLocaleDateString("it-IT", {
        day: "numeric", month: "long", year: "numeric",
      });

      let html = `
        <div style="margin-bottom: 40px; border-bottom: 1px solid #e5e7eb; padding-bottom: 30px;">
          <h2 style="color: #5636cd; margin: 0 0 8px;">${dream.title}</h2>
          <p style="color: #888; font-size: 13px; margin: 0 0 16px;">${date}${dream.mood ? ` · Umore: ${dream.mood}` : ""}${dream.alchemical_phase ? ` · Fase: ${dream.alchemical_phase}` : ""}</p>
          ${dream.tags?.length ? `<p style="color: #888; font-size: 12px; margin: 0 0 16px;">Tag: ${dream.tags.join(", ")}</p>` : ""}
          
          <h3 style="color: #333; font-size: 15px; margin: 20px 0 8px;">Il Sogno</h3>
          <p style="color: #555; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${dream.content}</p>
      `;

      if (dream.interpretation) {
        const cleanInterp = dream.interpretation
          .replace(/#{1,6}\s/g, "")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/\n/g, "<br>");
        html += `
          <h3 style="color: #333; font-size: 15px; margin: 20px 0 8px;">Interpretazione</h3>
          <div style="color: #555; font-size: 14px; line-height: 1.6;">${cleanInterp}</div>
        `;
      }

      if (dreamConvos.length > 0) {
        html += `<h3 style="color: #333; font-size: 15px; margin: 20px 0 8px;">Dialogo con l'Alchimista</h3>`;
        for (const msg of dreamConvos) {
          const sender = msg.role === "user" ? "Tu" : "L'Alchimista";
          const color = msg.role === "user" ? "#333" : "#5636cd";
          html += `<p style="margin: 8px 0;"><strong style="color: ${color};">${sender}:</strong> <span style="color: #555;">${msg.content}</span></p>`;
        }
      }

      html += `</div>`;
      return html;
    });

    const subject = mode === "single" 
      ? `Diario del Sogno: ${dreams[0].title}`
      : `Il Tuo Diario dei Sogni (${dreams.length} sogni)`;

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 30px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #5636cd; font-size: 28px; margin: 0;">✦ Il Mio Diario dei Sogni</h1>
          <p style="color: #888; font-size: 13px; margin-top: 8px;">Generato il ${new Date().toLocaleDateString("it-IT")}</p>
        </div>
        ${dreamEntries.join("")}
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #aaa; font-size: 12px;">Interpreta i tuoi Sogni · dreamalchemist.app</p>
        </div>
      </div>
    `;

    // Send via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Servizio email non configurato" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Interpreta i tuoi Sogni <noreply@dreamalchemist.app>",
        to: [user.email],
        subject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("Resend error:", errText);
      return new Response(
        JSON.stringify({ error: "Errore nell'invio dell'email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-dream-diary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
