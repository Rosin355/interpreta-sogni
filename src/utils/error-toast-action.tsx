import { ToastAction } from "@/components/ui/toast";

interface ReportActionParams {
  errorCode: string;
  functionName: string;
  userMessage: string;
  technicalMessage?: string;
  dreamId?: string;
}

/**
 * Restituisce un ToastAction "Invia segnalazione" che apre il client mail
 * dell'utente con un template precompilato contenente i dettagli tecnici.
 */
export const buildErrorReportAction = ({
  errorCode,
  functionName,
  userMessage,
  technicalMessage,
  dreamId,
}: ReportActionParams) => {
  const subject = `Segnalazione errore: ${errorCode}`;
  const bodyLines = [
    `Funzione: ${functionName}`,
    `Codice errore: ${errorCode}`,
    `Messaggio utente: ${userMessage}`,
    dreamId ? `ID sogno: ${dreamId}` : null,
    technicalMessage ? `\nDettagli tecnici:\n${technicalMessage}` : null,
    `\nData: ${new Date().toISOString()}`,
  ].filter(Boolean) as string[];

  const mailto = `mailto:support@dreamalchemist.app?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

  return (
    <ToastAction
      altText="Invia segnalazione"
      onClick={() => window.open(mailto, "_blank")}
    >
      Invia segnalazione
    </ToastAction>
  );
};
