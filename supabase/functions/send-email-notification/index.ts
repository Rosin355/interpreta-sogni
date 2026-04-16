import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const APP_URL = "https://dreamalchemist.app";
const FROM_EMAIL = "Interpreta i tuoi Sogni <noreply@dreamalchemist.app>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailNotificationRequest {
  type: "professional_approved" | "dream_shared" | "new_comment" | "dream_shared_user_request" | "user_invitation";
  recipientEmail?: string;
  recipientUserId?: string;
  recipientName?: string;
  data?: {
    dreamTitle?: string;
    dreamId?: string;
    userName?: string;
    message?: string;
    commentContent?: string;
    professionalName?: string;
    inviterName?: string;
  };
}

// ─── Shared Email Wrapper ───
function buildEmailWrapper(content: string, title: string, icon: string): string {
  return `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #050010; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #050010; padding: 40px 0;">
    <tr><td align="center">
      <!-- Stars decoration -->
      <p style="font-size: 18px; color: #c9a84c; letter-spacing: 12px; margin: 0 0 24px;">✦ ✧ ✦ ✧ ✦</p>

      <!-- Main card -->
      <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #0a0318; border: 1px solid rgba(201,168,76,0.5); border-radius: 16px; overflow: hidden; box-shadow: 0 0 40px rgba(201,168,76,0.15);">
        <!-- Header -->
        <tr><td style="padding: 32px 40px 20px; text-align: center; border-bottom: 1px solid rgba(201,168,76,0.2);">
          <img src="${APP_URL}/dreamalchemist_logo.png" alt="Dream Alchemist" width="64" height="64" style="width:64px;height:64px;border-radius:12px;display:inline-block;margin:0 0 12px;" />
          <h1 style="color: #f5e6a3; font-size: 22px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">${title}</h1>
        </td></tr>

        <!-- Content -->
        <tr><td style="padding: 30px 40px;">
          ${content}
        </td></tr>

        <!-- Footer -->
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

function buildButton(text: string, href: string): string {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${href}" style="display: inline-block; background-color: #5636cd; color: #f5e6a3; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; border: 1px solid rgba(201,168,76,0.4); letter-spacing: 0.3px;">
        ${text}
      </a>
    </div>`;
}

// ─── Email Builders ───

function buildProfessionalApprovedEmail(recipientName?: string): { subject: string; html: string } {
  const content = `
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      Ciao <strong style="color: #f5e6a3;">${recipientName || "Professionista"}</strong>,
    </p>
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      Siamo lieti di informarti che il tuo account professionale è stato <strong style="color: #c9a84c;">approvato</strong>!
    </p>
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
      Ora puoi ricevere sogni condivisi dagli utenti e fornire feedback professionali.
    </p>
    ${buildButton("Accedi alla Dashboard", `${APP_URL}/shared-dreams`)}
    <p style="color: #9b8fc4; font-size: 13px; margin: 20px 0 0;">
      Grazie per far parte della nostra community!
    </p>`;

  return {
    subject: "✅ Congratulazioni! Il tuo account professionale è stato approvato",
    html: buildEmailWrapper(content, "Account Approvato", "✅"),
  };
}

function buildDreamSharedEmail(recipientName?: string, data?: EmailNotificationRequest["data"]): { subject: string; html: string } {
  const content = `
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      Ciao <strong style="color: #f5e6a3;">${recipientName || "Professionista"}</strong>,
    </p>
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      <strong style="color: #c9a84c;">${data?.userName || "Un utente"}</strong> ha condiviso un sogno con te!
    </p>
    ${data?.dreamTitle ? `<div style="background-color: rgba(201,168,76,0.08); border-left: 3px solid #c9a84c; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 0 0 16px;">
      <p style="color: #f5e6a3; font-size: 14px; margin: 0;"><strong>Titolo:</strong> ${data.dreamTitle}</p>
    </div>` : ""}
    ${data?.message ? `<p style="color: #9b8fc4; font-size: 14px; font-style: italic; margin: 0 0 16px;">"${data.message}"</p>` : ""}
    ${buildButton("Visualizza il Sogno", `${APP_URL}/shared-with-me`)}`;

  return {
    subject: `🌙 Nuovo sogno condiviso con te${data?.dreamTitle ? `: "${data.dreamTitle}"` : ""}`,
    html: buildEmailWrapper(content, "Nuovo Sogno Condiviso", "🌙"),
  };
}

function buildNewCommentEmail(recipientName?: string, data?: EmailNotificationRequest["data"]): { subject: string; html: string } {
  const content = `
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      Ciao <strong style="color: #f5e6a3;">${recipientName || "Utente"}</strong>,
    </p>
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      <strong style="color: #c9a84c;">${data?.professionalName || "Un professionista"}</strong> ha lasciato un feedback sul tuo sogno!
    </p>
    ${data?.dreamTitle ? `<div style="background-color: rgba(201,168,76,0.08); border-left: 3px solid #c9a84c; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 0 0 16px;">
      <p style="color: #f5e6a3; font-size: 14px; margin: 0;"><strong>Sogno:</strong> ${data.dreamTitle}</p>
    </div>` : ""}
    ${data?.commentContent ? `<div style="background-color: rgba(86,54,205,0.1); padding: 14px 16px; border-radius: 8px; margin: 0 0 16px;">
      <p style="color: #b8a9d4; font-size: 14px; margin: 0; line-height: 1.6;">${data.commentContent.substring(0, 200)}${data.commentContent.length > 200 ? "..." : ""}</p>
    </div>` : ""}
    ${buildButton("Leggi il Feedback", `${APP_URL}/dreams/${data?.dreamId || ""}`)}`;

  return {
    subject: `💬 Nuovo feedback sul tuo sogno${data?.dreamTitle ? `: "${data.dreamTitle}"` : ""}`,
    html: buildEmailWrapper(content, "Nuovo Feedback Ricevuto", "💬"),
  };
}

function buildDreamSharedUserRequestEmail(recipientName?: string, data?: EmailNotificationRequest["data"]): { subject: string; html: string } {
  const content = `
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      Ciao <strong style="color: #f5e6a3;">${recipientName || "Utente"}</strong>,
    </p>
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      <strong style="color: #c9a84c;">${data?.userName || "Un utente"}</strong> vorrebbe condividere un sogno con te!
    </p>
    ${data?.dreamTitle ? `<div style="background-color: rgba(201,168,76,0.08); border-left: 3px solid #c9a84c; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 0 0 16px;">
      <p style="color: #f5e6a3; font-size: 14px; margin: 0;"><strong>Titolo:</strong> ${data.dreamTitle}</p>
    </div>` : ""}
    ${data?.message ? `<p style="color: #9b8fc4; font-size: 14px; font-style: italic; margin: 0 0 16px;">"${data.message}"</p>` : ""}
    ${buildButton("Visualizza la Condivisione", `${APP_URL}/shared-with-me`)}
    <p style="color: #9b8fc4; font-size: 13px; margin: 16px 0 0;">
      Se non sei ancora registrato, <a href="${APP_URL}/auth" style="color: #c9a84c; text-decoration: underline;">iscriviti ora</a> per iniziare a ricevere sogni condivisi!
    </p>`;

  return {
    subject: `🌙 ${data?.userName || "Un utente"} vuole condividere un sogno con te`,
    html: buildEmailWrapper(content, "Richiesta di Condivisione", "🌙"),
  };
}

function buildUserInvitationEmail(data?: EmailNotificationRequest["data"]): { subject: string; html: string } {
  const content = `
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      Ciao,
    </p>
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
      <strong style="color: #c9a84c;">${data?.inviterName || "Un utente"}</strong> vorrebbe condividere un sogno con te su <strong style="color: #f5e6a3;">Interpreta i tuoi Sogni</strong>!
    </p>
    ${data?.dreamTitle ? `<div style="background-color: rgba(201,168,76,0.08); border-left: 3px solid #c9a84c; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 0 0 16px;">
      <p style="color: #f5e6a3; font-size: 14px; margin: 0;"><strong>Sogno:</strong> ${data.dreamTitle}</p>
    </div>` : ""}
    ${data?.message ? `<div style="background-color: rgba(86,54,205,0.1); padding: 14px 16px; border-radius: 8px; margin: 0 0 16px;">
      <p style="color: #9b8fc4; font-size: 12px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px;">Messaggio personale</p>
      <p style="color: #b8a9d4; font-size: 14px; margin: 0; line-height: 1.6;">${data.message}</p>
    </div>` : ""}
    <p style="color: #b8a9d4; font-size: 15px; line-height: 1.7; margin: 16px 0;">
      Registrati per visualizzare il sogno e connetterti con ${data?.inviterName || "altri utenti"}.
    </p>
    ${buildButton("Registrati Ora", `${APP_URL}/auth`)}
    <div style="background-color: rgba(201,168,76,0.06); padding: 16px; border-radius: 10px; margin: 20px 0 0;">
      <p style="color: #f5e6a3; font-size: 13px; font-weight: 600; margin: 0 0 10px;">Con Interpreta i tuoi Sogni puoi:</p>
      <p style="color: #b8a9d4; font-size: 13px; line-height: 2; margin: 0;">
        ✨ Interpretare i sogni con l'intelligenza artificiale<br>
        🌙 Condividere sogni con amici e professionisti<br>
        🔮 Ottenere interpretazioni astrologiche personalizzate<br>
        📊 Tracciare i pattern onirici nel tempo
      </p>
    </div>`;

  return {
    subject: `🌙 ${data?.inviterName || "Un utente"} ti invita a unirti a Interpreta i tuoi Sogni`,
    html: buildEmailWrapper(content, "Invito a Interpreta i tuoi Sogni", "✨"),
  };
}

// ─── Handler ───

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Verify JWT using anon key client with auth header for signing key support
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Service role client for admin operations (user lookup, etc.)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, recipientEmail, recipientUserId, recipientName, data }: EmailNotificationRequest = await req.json();

    let finalRecipientEmail = recipientEmail;
    let finalRecipientName = recipientName;

    if (!finalRecipientEmail && recipientUserId) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(recipientUserId);
      if (userError || !userData?.user?.email) {
        console.error('[send-email] Failed to lookup user email:', userError);
        throw new Error("Could not find recipient email");
      }
      finalRecipientEmail = userData.user.email;
      if (!finalRecipientName) {
        finalRecipientName = userData.user.user_metadata?.username || userData.user.email.split('@')[0];
      }
    }

    if (!finalRecipientEmail) throw new Error("Recipient email is required");

    console.log('[send-email] Request:', { type, recipientEmail: finalRecipientEmail, recipientUserId, recipientName: finalRecipientName });

    let emailContent: { subject: string; html: string };

    switch (type) {
      case "professional_approved":
        emailContent = buildProfessionalApprovedEmail(finalRecipientName);
        break;
      case "dream_shared":
        emailContent = buildDreamSharedEmail(finalRecipientName, data);
        break;
      case "new_comment":
        emailContent = buildNewCommentEmail(finalRecipientName, data);
        break;
      case "dream_shared_user_request":
        emailContent = buildDreamSharedUserRequestEmail(finalRecipientName, data);
        break;
      case "user_invitation":
        emailContent = buildUserInvitationEmail(data);
        break;
      default:
        throw new Error("Invalid notification type");
    }

    // Verifica RESEND_API_KEY presente
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error('[send-email] RESEND_API_KEY mancante nei secrets');
      return new Response(
        JSON.stringify({
          error: "Configurazione email mancante: RESEND_API_KEY non impostata nei secrets della Edge Function.",
          errorCode: "RESEND_KEY_MISSING",
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('[send-email] Sending:', emailContent.subject, '→', finalRecipientEmail);

    const emailResponse = await resend.emails.send({
      from: FROM_EMAIL,
      to: [finalRecipientEmail],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log('[send-email] Resend raw response:', JSON.stringify(emailResponse));

    // Resend SDK ritorna { data, error } anche su 4xx — non lancia eccezione
    if ((emailResponse as any)?.error) {
      const resendError = (emailResponse as any).error;
      const errMsg: string = resendError.message || JSON.stringify(resendError);
      const errName: string = resendError.name || "";

      let errorCode = "RESEND_API_ERROR";
      if (/domain/i.test(errMsg) && /(verif|not found)/i.test(errMsg)) {
        errorCode = "RESEND_DOMAIN_UNVERIFIED";
      } else if (/api[_ ]?key|unauthor|forbidden/i.test(errMsg) || errName === "validation_error") {
        errorCode = "RESEND_AUTH_ERROR";
      } else if (/testing|test mode|own email/i.test(errMsg)) {
        errorCode = "RESEND_TEST_MODE";
      }

      console.error('[send-email] Resend rifiutato:', errorCode, errMsg);
      return new Response(
        JSON.stringify({
          error: `Resend ha rifiutato l'email: ${errMsg}`,
          errorCode,
          resendError,
        }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('[send-email] Inviata con successo, id:', (emailResponse as any)?.data?.id);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('[send-email] ERROR:', error);
    return new Response(
      JSON.stringify({
        error: error.message || "Errore sconosciuto durante l'invio email",
        errorCode: "EDGE_FUNCTION_EXCEPTION",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
