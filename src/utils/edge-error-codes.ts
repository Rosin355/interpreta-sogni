// Codici errore standardizzati per le edge function
export type EdgeErrorCode =
  | "API_QUOTA_EXCEEDED"
  | "STT_QUOTA_EXCEEDED"
  | "TTS_QUOTA_EXCEEDED"
  | "AI_CREDITS_EXHAUSTED"
  | "AI_RATE_LIMIT"
  | "EMAIL_QUOTA_EXCEEDED"
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "NETWORK_ERROR"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_AUTH"
  | "INTERNAL_ERROR";

// Codici legati a quote/limiti di servizi terzi (messaggio generico per l'utente)
export const QUOTA_ERROR_CODES: ReadonlySet<string> = new Set([
  "API_QUOTA_EXCEEDED",
  "STT_QUOTA_EXCEEDED",
  "TTS_QUOTA_EXCEEDED",
  "AI_CREDITS_EXHAUSTED",
  "EMAIL_QUOTA_EXCEEDED",
]);

export const isQuotaErrorCode = (code?: string | null): boolean =>
  !!code && QUOTA_ERROR_CODES.has(code);

const NEUTRAL_QUOTA_MESSAGE =
  "Servizio temporaneamente non disponibile. Riprova tra qualche minuto. Se il problema persiste, invia una segnalazione.";

const NEUTRAL_RATE_LIMIT_MESSAGE =
  "Troppe richieste in pochi secondi. Attendi un istante e riprova.";

export interface UserMessageOptions {
  isSuperAdmin?: boolean;
  fallback?: string;
  technicalMessage?: string;
}

/** Messaggio neutro mostrato all'utente finale (e dettaglio tecnico per super admin). */
export const getUserFacingMessage = (
  errorCode: string | undefined | null,
  { isSuperAdmin, fallback, technicalMessage }: UserMessageOptions = {}
): string => {
  if (isSuperAdmin && technicalMessage) {
    return `[ADMIN] ${technicalMessage}`;
  }

  switch (errorCode) {
    case "API_QUOTA_EXCEEDED":
    case "STT_QUOTA_EXCEEDED":
    case "TTS_QUOTA_EXCEEDED":
    case "AI_CREDITS_EXHAUSTED":
    case "EMAIL_QUOTA_EXCEEDED":
      return NEUTRAL_QUOTA_MESSAGE;
    case "AI_RATE_LIMIT":
      return NEUTRAL_RATE_LIMIT_MESSAGE;
    case "INVALID_INPUT":
      return "Dati non validi. Verifica i campi e riprova.";
    case "UNAUTHORIZED":
      return "Sessione scaduta. Ricarica la pagina e riprova.";
    case "NETWORK_ERROR":
      return "Problema di connessione. Verifica la rete e riprova.";
    case "UPSTREAM_UNAVAILABLE":
      return "Il servizio è momentaneamente irraggiungibile. Riprova tra poco.";
    case "UPSTREAM_AUTH":
      return "Servizio vocale non disponibile. Contatta l'assistenza.";
    default:
      return (
        fallback ||
        "Si è verificato un errore. Puoi inviare una segnalazione qui sotto."
      );
  }
};
