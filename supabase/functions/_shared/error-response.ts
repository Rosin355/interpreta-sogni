// Helper condivisi per risposte edge function con error handling unificato
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export type EdgeErrorCode =
  | "API_QUOTA_EXCEEDED"
  | "STT_QUOTA_EXCEEDED"
  | "TTS_QUOTA_EXCEEDED"
  | "AI_CREDITS_EXHAUSTED"
  | "AI_RATE_LIMIT"
  | "EMAIL_QUOTA_EXCEEDED"
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "UPSTREAM_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";

export interface EdgeErrorBody {
  errorCode: EdgeErrorCode;
  error: string; // tecnico
  details?: Record<string, unknown>;
}

const STATUS_FOR_CODE: Record<EdgeErrorCode, number> = {
  API_QUOTA_EXCEEDED: 429,
  STT_QUOTA_EXCEEDED: 429,
  TTS_QUOTA_EXCEEDED: 429,
  AI_CREDITS_EXHAUSTED: 429,
  AI_RATE_LIMIT: 429,
  EMAIL_QUOTA_EXCEEDED: 429,
  INVALID_INPUT: 400,
  UNAUTHORIZED: 401,
  UPSTREAM_UNAVAILABLE: 502,
  NETWORK_ERROR: 502,
  INTERNAL_ERROR: 500,
};

const QUOTA_CODES = new Set<EdgeErrorCode>([
  "API_QUOTA_EXCEEDED",
  "STT_QUOTA_EXCEEDED",
  "TTS_QUOTA_EXCEEDED",
  "AI_CREDITS_EXHAUSTED",
  "EMAIL_QUOTA_EXCEEDED",
]);

export const errorResponse = (
  errorCode: EdgeErrorCode,
  message: string,
  details?: Record<string, unknown>,
  statusOverride?: number
): Response => {
  const body: EdgeErrorBody = { errorCode, error: message, details };
  return new Response(JSON.stringify(body), {
    status: statusOverride ?? STATUS_FOR_CODE[errorCode],
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

const SUPER_ADMIN_EMAILS = [
  "romesh.singhabahu@gmail.com",
  "jessicaommarin@gmail.com",
];

const PROVIDER_DASHBOARDS: Record<string, string> = {
  rapidapi: "https://rapidapi.com/gbattaglia/api/astrologer",
  elevenlabs: "https://elevenlabs.io/app/subscription",
  "lovable-ai": "https://lovable.dev",
  resend: "https://resend.com/dashboard",
};

const THROTTLE_HOURS = 6;

/**
 * Invia (con throttling) un'email ai super admin quando un provider terzo ha esaurito la quota.
 * Best-effort: non blocca il flow se fallisce.
 */
export const notifyQuotaToAdmins = async (params: {
  provider: "rapidapi" | "elevenlabs" | "lovable-ai" | "resend";
  errorCode: EdgeErrorCode;
  functionName: string;
  technicalMessage: string;
}): Promise<void> => {
  try {
    if (!QUOTA_CODES.has(params.errorCode)) return;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const settingKey = `quota_alert_${params.provider}_last_sent`;

    // Throttle check
    const { data: setting } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();

    const lastSentIso = (setting?.value as any)?.iso as string | undefined;
    if (lastSentIso) {
      const ageMs = Date.now() - new Date(lastSentIso).getTime();
      if (ageMs < THROTTLE_HOURS * 3600 * 1000) {
        console.log(
          `[quota-alert] throttled (${params.provider}, last sent ${lastSentIso})`
        );
        return;
      }
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!lovableKey || !resendKey) {
      console.warn("[quota-alert] missing keys, cannot send");
      return;
    }

    const dashboardUrl = PROVIDER_DASHBOARDS[params.provider] ?? "";
    const subject = `[Dream Alchemist] Quota esaurita — ${params.provider}`;
    const html = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0a0a0f;color:#f5f5f5;font-family:-apple-system,Segoe UI,Inter,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:14px;letter-spacing:0.2em;text-transform:uppercase;color:#d4af37;margin:0 0 24px;">Dream Alchemist · Admin Alert</h1>
    <h2 style="font-size:22px;line-height:1.3;color:#fff;margin:0 0 16px;">Quota esaurita — ${params.provider}</h2>
    <p style="color:#bbb;line-height:1.6;margin:0 0 24px;">Una edge function ha rilevato l'esaurimento della quota di un servizio terzo. L'utente finale ha visto solo un messaggio neutro.</p>
    <table style="width:100%;border-collapse:collapse;background:#15151c;border:1px solid #2a2a35;border-radius:8px;">
      <tr><td style="padding:12px 16px;color:#888;border-bottom:1px solid #2a2a35;">Provider</td><td style="padding:12px 16px;color:#fff;border-bottom:1px solid #2a2a35;">${params.provider}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;border-bottom:1px solid #2a2a35;">Codice</td><td style="padding:12px 16px;color:#fff;border-bottom:1px solid #2a2a35;">${params.errorCode}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;border-bottom:1px solid #2a2a35;">Edge function</td><td style="padding:12px 16px;color:#fff;border-bottom:1px solid #2a2a35;">${params.functionName}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;border-bottom:1px solid #2a2a35;">Quando</td><td style="padding:12px 16px;color:#fff;border-bottom:1px solid #2a2a35;">${new Date().toISOString()}</td></tr>
      <tr><td style="padding:12px 16px;color:#888;vertical-align:top;">Dettaglio</td><td style="padding:12px 16px;color:#ddd;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px;">${escapeHtml(
        params.technicalMessage
      )}</td></tr>
    </table>
    ${
      dashboardUrl
        ? `<p style="margin:24px 0 0;"><a href="${dashboardUrl}" style="display:inline-block;padding:12px 20px;background:#d4af37;color:#0a0a0f;text-decoration:none;border-radius:6px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;font-size:13px;">Apri dashboard ${params.provider}</a></p>`
        : ""
    }
    <p style="color:#555;font-size:11px;margin:32px 0 0;">Notifica inviata max 1 volta ogni ${THROTTLE_HOURS}h per provider.</p>
  </div>
</body></html>`.trim();

    const resp = await fetch(
      "https://connector-gateway.lovable.dev/resend/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": resendKey,
        },
        body: JSON.stringify({
          from: "Dream Alchemist <noreply@dreamalchemist.app>",
          to: SUPER_ADMIN_EMAILS,
          subject,
          html,
        }),
      }
    );

    if (!resp.ok) {
      console.warn("[quota-alert] resend failed", resp.status, await resp.text());
      return;
    }

    // Update throttle marker
    await admin.from("app_settings").upsert({
      key: settingKey,
      value: { iso: new Date().toISOString(), provider: params.provider },
    });

    console.log(`[quota-alert] sent to admins for ${params.provider}`);
  } catch (e) {
    console.warn("[quota-alert] error", e);
  }
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
