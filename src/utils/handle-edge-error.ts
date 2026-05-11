import { supabase } from "@/integrations/supabase/client";
import { buildErrorReportAction } from "@/utils/error-toast-action";
import {
  getUserFacingMessage,
  isQuotaErrorCode,
} from "@/utils/edge-error-codes";

interface ToastApi {
  toast: (opts: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
    action?: ReturnType<typeof buildErrorReportAction>;
    duration?: number;
  }) => void;
}

interface HandleEdgeErrorOptions {
  /** Errore restituito da supabase.functions.invoke (FunctionsHttpError o eccezione). */
  error?: unknown;
  /** Eventuale body restituito da invoke con success=false. */
  data?: any;
  /** Nome della edge function (es. "calculate-natal-chart"). */
  functionName: string;
  /** Toast API (`useToast`). */
  toast: ToastApi["toast"];
  /** Se true, mostra messaggi tecnici dettagliati (super admin). */
  isSuperAdmin?: boolean;
  /** ID sogno opzionale, finisce nel template di segnalazione. */
  dreamId?: string;
  /** Titolo del toast (default: "Errore"). */
  title?: string;
  /** Messaggio di fallback se nessun errorCode è riconosciuto. */
  fallbackMessage?: string;
  /** Metadati extra per error_logs. */
  metadata?: Record<string, unknown>;
}

const extractErrorBody = async (error: unknown): Promise<any | null> => {
  const ctx: any = (error as any)?.context;
  if (!ctx) return null;

  // Tenta JSON direttamente (clone per non consumare il body originale)
  if (typeof ctx.clone === "function" && typeof ctx.json === "function") {
    try {
      return await ctx.clone().json();
    } catch (jsonErr) {
      console.warn("[handleEdgeError] ctx.json() failed, trying text()", jsonErr);
    }
  }

  // Fallback: leggi come testo e prova a parsarlo
  if (typeof ctx.clone === "function" && typeof ctx.text === "function") {
    try {
      const txt = await ctx.clone().text();
      if (!txt) return null;
      try {
        return JSON.parse(txt);
      } catch {
        return { error: txt };
      }
    } catch (txtErr) {
      console.warn(
        "[handleEdgeError] ctx.text() failed",
        { status: ctx.status, contentType: ctx.headers?.get?.("content-type") },
        txtErr
      );
    }
  }

  return null;
};

/**
 * Gestione standard degli errori da supabase.functions.invoke.
 * - Estrae errorCode dal body strutturato
 * - Logga in error_logs (best-effort)
 * - Mostra toast con messaggio coerente (neutro per utente, tecnico per super admin)
 * - Aggiunge azione "Invia segnalazione"
 */
export const handleEdgeError = async ({
  error,
  data,
  functionName,
  toast,
  isSuperAdmin,
  dreamId,
  title = "Errore",
  fallbackMessage,
  metadata,
}: HandleEdgeErrorOptions): Promise<void> => {
  const body = data && (data.error || data.errorCode) ? data : await extractErrorBody(error);

  const errorCode: string =
    body?.errorCode || (error as any)?.code || "INTERNAL_ERROR";
  const technicalMessage: string =
    body?.error ||
    body?.details?.message ||
    (error as any)?.message ||
    "Errore sconosciuto";

  const userMessage = getUserFacingMessage(errorCode, {
    isSuperAdmin,
    fallback: fallbackMessage,
    technicalMessage,
  });

  // Log in error_logs (best-effort)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("error_logs").insert({
        user_id: user.id,
        function_name: functionName,
        error_code: errorCode,
        error_message_user: getUserFacingMessage(errorCode, { fallback: fallbackMessage }),
        error_message_technical: technicalMessage,
        dream_id: dreamId ?? null,
        metadata: {
          ...(metadata ?? {}),
          ...(body?.details ? { details: body.details } : {}),
          isQuota: isQuotaErrorCode(errorCode),
        },
      });
    }
  } catch (logErr) {
    console.warn("error_logs insert failed", logErr);
  }

  console.error(`[${functionName}] ${errorCode}:`, technicalMessage, { error, body });

  toast({
    title,
    description: userMessage,
    variant: "destructive",
    duration: 8000,
    action: buildErrorReportAction({
      errorCode,
      functionName,
      userMessage,
      technicalMessage,
      dreamId,
    }),
  });
};
