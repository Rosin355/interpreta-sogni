import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const APP_URL = "https://dreamalchemist.app";
const FROM_EMAIL = "Interpreta i tuoi Sogni <noreply@dreamalchemist.app>";
const TO_EMAIL = "info@dreamalchemist.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface ContactRequest {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildEmail(
  name: string,
  email: string,
  subject: string,
  message: string,
): string {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#050010;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050010;padding:40px 0;">
    <tr><td align="center">
      <p style="font-size:18px;color:#c9a84c;letter-spacing:12px;margin:0 0 24px;">✦ ✧ ✦ ✧ ✦</p>
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0a0318;border:1px solid rgba(201,168,76,0.5);border-radius:16px;overflow:hidden;box-shadow:0 0 40px rgba(201,168,76,0.15);">
        <tr><td style="padding:32px 40px 20px;text-align:center;border-bottom:1px solid rgba(201,168,76,0.2);">
          <img src="${APP_URL}/dreamalchemist_logo.png" alt="Dream Alchemist" width="64" height="64" style="width:64px;height:64px;border-radius:12px;display:inline-block;margin:0 0 12px;" />
          <h1 style="color:#f5e6a3;font-size:22px;font-weight:600;margin:0;letter-spacing:0.5px;">Nuovo messaggio dal sito</h1>
        </td></tr>
        <tr><td style="padding:30px 40px;">
          <div style="background-color:rgba(201,168,76,0.08);border-left:3px solid #c9a84c;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 16px;">
            <p style="color:#f5e6a3;font-size:14px;margin:0 0 6px;"><strong>Da:</strong> ${safeName}</p>
            <p style="color:#f5e6a3;font-size:14px;margin:0 0 6px;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color:#c9a84c;text-decoration:none;">${safeEmail}</a></p>
            <p style="color:#f5e6a3;font-size:14px;margin:0;"><strong>Oggetto:</strong> ${safeSubject}</p>
          </div>
          <div style="background-color:rgba(86,54,205,0.1);padding:16px 18px;border-radius:8px;margin:0 0 16px;">
            <p style="color:#9b8fc4;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Messaggio</p>
            <p style="color:#b8a9d4;font-size:14px;line-height:1.7;margin:0;">${safeMessage}</p>
          </div>
          <p style="color:#9b8fc4;font-size:12px;margin:16px 0 0;">
            Puoi rispondere direttamente a questa email — verrà inviata a ${safeEmail}.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px 28px;text-align:center;border-top:1px solid rgba(201,168,76,0.2);">
          <p style="font-size:16px;color:#c9a84c;letter-spacing:8px;margin:0 0 10px;">✧ ✦ ✧</p>
          <p style="color:#6b5f8a;font-size:11px;margin:0;">
            <a href="${APP_URL}" style="color:#9b8fc4;text-decoration:none;">Interpreta i tuoi Sogni</a> · dreamalchemist.app
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("[send-contact-email] RESEND_API_KEY mancante");
      return new Response(
        JSON.stringify({ error: "Configurazione email mancante" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const body: ContactRequest = await req.json().catch(() => ({}));
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const subject = (body.subject ?? "").trim();
    const message = (body.message ?? "").trim();

    const errors: Record<string, string> = {};
    if (!name || name.length > 100) errors.name = "Nome non valido (max 100 caratteri)";
    if (!email || !isValidEmail(email) || email.length > 255) {
      errors.email = "Email non valida";
    }
    if (!subject || subject.length > 200) errors.subject = "Oggetto non valido (max 200 caratteri)";
    if (!message || message.length < 10 || message.length > 2000) {
      errors.message = "Messaggio non valido (10–2000 caratteri)";
    }

    if (Object.keys(errors).length > 0) {
      return new Response(
        JSON.stringify({ error: "Dati non validi", details: errors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const html = buildEmail(name, email, subject, message);

    const emailResponse = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      reply_to: email,
      subject: `[Contatto] ${subject}`,
      html,
    });

    if ((emailResponse as any)?.error) {
      const resendError = (emailResponse as any).error;
      console.error("[send-contact-email] Resend error:", resendError);
      return new Response(
        JSON.stringify({
          error: "Impossibile inviare l'email in questo momento",
          details: resendError.message || String(resendError),
        }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    console.log(
      "[send-contact-email] Inviata, id:",
      (emailResponse as any)?.data?.id,
    );

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("[send-contact-email] ERROR:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Errore sconosciuto" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
