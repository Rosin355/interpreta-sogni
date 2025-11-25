import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailNotificationRequest {
  type: "professional_approved" | "dream_shared" | "new_comment" | "dream_shared_user_request" | "user_invitation";
  recipientEmail: string;
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { type, recipientEmail, recipientName, data }: EmailNotificationRequest = await req.json();

    console.log("[send-email-notification] Request received", { type, recipientEmail });

    let subject = "";
    let html = "";

    switch (type) {
      case "professional_approved":
        subject = "✅ Congratulazioni! Il tuo account professionale è stato approvato";
        html = `
          <h1>Benvenuto in Interpreta i tuoi Sogni!</h1>
          <p>Ciao ${recipientName || "Professionista"},</p>
          <p>Siamo lieti di informarti che il tuo account professionale è stato <strong>approvato</strong>!</p>
          <p>Ora puoi ricevere sogni condivisi dagli utenti e fornire feedback professionali.</p>
          <p>Accedi alla tua dashboard per iniziare.</p>
          <br>
          <p>Grazie per far parte della nostra community!</p>
          <p>Il Team di Interpreta i tuoi Sogni</p>
        `;
        break;

      case "dream_shared":
        subject = `🌙 Nuovo sogno condiviso con te${data?.dreamTitle ? `: "${data.dreamTitle}"` : ""}`;
        html = `
          <h1>Nuovo Sogno Condiviso</h1>
          <p>Ciao ${recipientName || "Professionista"},</p>
          <p><strong>${data?.userName || "Un utente"}</strong> ha condiviso un sogno con te!</p>
          ${data?.dreamTitle ? `<p><strong>Titolo:</strong> ${data.dreamTitle}</p>` : ""}
          ${data?.message ? `<p><strong>Messaggio:</strong> ${data.message}</p>` : ""}
          <br>
          <p>Accedi alla tua dashboard per visualizzare il sogno completo e decidere se accettarlo.</p>
          <p>Il Team di Interpreta i tuoi Sogni</p>
        `;
        break;

      case "new_comment":
        subject = `💬 Nuovo feedback sul tuo sogno${data?.dreamTitle ? `: "${data.dreamTitle}"` : ""}`;
        html = `
          <h1>Nuovo Feedback Ricevuto</h1>
          <p>Ciao ${recipientName || "Utente"},</p>
          <p><strong>${data?.professionalName || "Un professionista"}</strong> ha lasciato un feedback sul tuo sogno!</p>
          ${data?.dreamTitle ? `<p><strong>Sogno:</strong> ${data.dreamTitle}</p>` : ""}
          ${data?.commentContent ? `<p><strong>Feedback:</strong> ${data.commentContent.substring(0, 200)}${data.commentContent.length > 200 ? "..." : ""}</p>` : ""}
          <br>
          <p>Accedi alla pagina del sogno per leggere il feedback completo.</p>
          <p>Il Team di Interpreta i tuoi Sogni</p>
        `;
        break;

      case "dream_shared_user_request":
        subject = `🌙 ${data?.userName || "Un utente"} vuole condividere un sogno con te`;
        html = `
          <h1>Richiesta di Condivisione Sogno</h1>
          <p>Ciao ${recipientName || "Utente"},</p>
          <p><strong>${data?.userName || "Un utente"}</strong> vorrebbe condividere un sogno con te!</p>
          ${data?.dreamTitle ? `<p><strong>Titolo sogno:</strong> ${data.dreamTitle}</p>` : ""}
          ${data?.message ? `<p><strong>Messaggio:</strong> ${data.message}</p>` : ""}
          <br>
          <p>Se sei registrato alla piattaforma, accedi per visualizzare e gestire la condivisione.</p>
          <p>Se non sei ancora registrato, <a href="${Deno.env.get('SUPABASE_URL')}/auth?mode=signup">iscriviti ora</a> per iniziare a ricevere sogni condivisi!</p>
          <br>
          <p>Il Team di Interpreta i tuoi Sogni</p>
        `;
        break;

      case "user_invitation":
        subject = `🌙 ${data?.inviterName || "Un utente"} ti invita a unirti a Interpreta i tuoi Sogni`;
        html = `
          <h1>Invito a Interpreta i tuoi Sogni</h1>
          <p>Ciao,</p>
          <p><strong>${data?.inviterName || "Un utente"}</strong> vorrebbe condividere un sogno con te su <strong>Interpreta i tuoi Sogni</strong>!</p>
          ${data?.dreamTitle ? `<p><strong>Titolo del sogno:</strong> ${data.dreamTitle}</p>` : ""}
          ${data?.message ? `
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Messaggio personale:</strong></p>
              <p style="margin: 8px 0 0 0;">${data.message}</p>
            </div>
          ` : ""}
          <br>
          <p>Per visualizzare questo sogno e connetterti con ${data?.inviterName || "altri utenti"}, devi prima registrarti sulla nostra piattaforma.</p>
          <br>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${Deno.env.get('SUPABASE_URL') || 'https://zufsbpcgcvlcdtksrzhu.supabase.co'}/auth/v1/verify?token=signup&type=signup&redirect_to=${encodeURIComponent(window?.location?.origin || 'https://interpreta-sogni.lovable.app')}/auth" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Registrati Ora
            </a>
          </div>
          <br>
          <p><strong>Interpreta i tuoi Sogni</strong> è una piattaforma dove puoi:</p>
          <ul>
            <li>✨ Registrare e interpretare i tuoi sogni con l'aiuto dell'intelligenza artificiale</li>
            <li>🌙 Condividere sogni con amici e ricevere feedback</li>
            <li>🔮 Ottenere interpretazioni astrologiche personalizzate</li>
            <li>📊 Tenere traccia dei tuoi pattern onirici nel tempo</li>
          </ul>
          <br>
          <p>Ti aspettiamo!</p>
          <p>Il Team di Interpreta i tuoi Sogni</p>
        `;
        break;

      default:
        throw new Error("Invalid notification type");
    }

    const emailResponse = await resend.emails.send({
      from: "Interpreta i tuoi Sogni <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: subject,
      html: html,
    });

    console.log("[send-email-notification] Email sent successfully", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-email-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
