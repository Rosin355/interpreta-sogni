import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://interpreta-sogni.lovable.app";

function buildEmailWrapper(content: string, title: string, icon: string): string {
  return `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #050010; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #050010; padding: 40px 0;">
    <tr><td align="center">
      <p style="font-size: 18px; color: #c9a84c; letter-spacing: 12px; margin: 0 0 24px;">✦ ✧ ✦ ✧ ✦</p>
      <table width="650" cellpadding="0" cellspacing="0" style="max-width: 650px; width: 100%; background-color: #0a0318; border: 1px solid rgba(201,168,76,0.5); border-radius: 16px; overflow: hidden; box-shadow: 0 0 40px rgba(201,168,76,0.15);">
        <tr><td style="padding: 32px 40px 20px; text-align: center; border-bottom: 1px solid rgba(201,168,76,0.2);">
          <img src="${APP_URL}/dreamalchemist_logo.png" alt="Dream Alchemist" width="64" height="64" style="width:64px;height:64px;border-radius:12px;display:inline-block;margin:0 0 12px;" />
          <h1 style="color: #f5e6a3; font-size: 24px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">${title}</h1>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          ${content}
        </td></tr>
        <tr><td style="padding: 20px 40px 28px; text-align: center; border-top: 1px solid rgba(201,168,76,0.2);">
          <p style="font-size: 16px; color: #c9a84c; letter-spacing: 8px; margin: 0 0 10px;">✧ ✦ ✧</p>
          <p style="color: #6b5f8a; font-size: 11px; margin: 0;">
            <a href="${APP_URL}" style="color: #9b8fc4; text-decoration: none;">Interpreta i tuoi Sogni</a> · dreamalchemist.app
          </p>
        </td></tr>
      </table>
      <p style="font-size: 14px; color: #c9a84c; letter-spacing: 12px; margin: 24px 0 0;">✧ ✦ ✧ ✦ ✧</p>
    </td></tr>
  </table>
</body>
</html>`;
}

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

    const dreamIds = dreams.map((d: any) => d.id);
    const { data: conversations } = await supabase
      .from("dream_conversations")
      .select("dream_id, role, content, created_at")
      .in("dream_id", dreamIds)
      .order("created_at", { ascending: true });

    // Build dream entries
    const dreamEntries = dreams.map((dream: any) => {
      const dreamConvos = (conversations || []).filter((c: any) => c.dream_id === dream.id);
      const date = new Date(dream.dream_date).toLocaleDateString("it-IT", {
        day: "numeric", month: "long", year: "numeric",
      });

      let html = `
        <div style="margin-bottom: 30px; background-color: rgba(201,168,76,0.04); border: 1px solid rgba(201,168,76,0.15); border-radius: 12px; padding: 24px; overflow: hidden;">
          <h2 style="color: #f5e6a3; font-size: 18px; margin: 0 0 8px;">${dream.title}</h2>
          <p style="color: #6b5f8a; font-size: 12px; margin: 0 0 16px;">
            ${date}${dream.mood ? ` · Umore: ${dream.mood}` : ""}${dream.alchemical_phase ? ` · Fase: ${dream.alchemical_phase}` : ""}
          </p>
          ${dream.tags?.length ? `<p style="color: #9b8fc4; font-size: 11px; margin: 0 0 16px; letter-spacing: 0.5px;">Tag: ${dream.tags.join(", ")}</p>` : ""}
          
          <p style="color: #c9a84c; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin: 16px 0 8px;">Il Sogno</p>
          <p style="color: #b8a9d4; font-size: 14px; line-height: 1.7; white-space: pre-wrap; margin: 0;">${dream.content}</p>
      `;

      if (dream.interpretation) {
        const cleanInterp = dream.interpretation
          .replace(/#{1,6}\s/g, "")
          .replace(/\*\*(.*?)\*\*/g, "<strong style='color: #f5e6a3;'>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/\n/g, "<br>");
        html += `
          <p style="color: #c9a84c; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin: 20px 0 8px;">Interpretazione</p>
          <div style="color: #b8a9d4; font-size: 14px; line-height: 1.7;">${cleanInterp}</div>
        `;
      }

      if (dreamConvos.length > 0) {
        html += `<p style="color: #c9a84c; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin: 20px 0 8px;">Dialogo con l'Alchimista</p>`;
        for (const msg of dreamConvos) {
          const isUser = msg.role === "user";
          const sender = isUser ? "Tu" : "L'Alchimista";
          const senderColor = isUser ? "#b8a9d4" : "#c9a84c";
          html += `<p style="margin: 8px 0; font-size: 13px;"><strong style="color: ${senderColor};">${sender}:</strong> <span style="color: #b8a9d4;">${msg.content}</span></p>`;
        }
      }

      html += `</div>`;
      return html;
    });

    const subject = mode === "single"
      ? `✦ Diario del Sogno: ${dreams[0].title}`
      : `✦ Il Tuo Diario dei Sogni (${dreams.length} sogni)`;

    const dateStr = new Date().toLocaleDateString("it-IT");
    const innerContent = `
      <p style="color: #9b8fc4; font-size: 13px; text-align: center; margin: 0 0 24px;">Generato il ${dateStr}</p>
      ${dreamEntries.join("")}
    `;

    const emailHtml = buildEmailWrapper(innerContent, "Il Mio Diario dei Sogni", "✦");

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
