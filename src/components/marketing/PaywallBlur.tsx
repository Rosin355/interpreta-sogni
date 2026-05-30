import { Link } from "react-router-dom";
import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaywallBlurProps {
  /** Testo nascosto sotto il blur (per dare un assaggio visivo) */
  hiddenPreview: string;
  /** ID del sogno, usato per il tracking della sorgente di conversione */
  dreamId: string;
  /** Se l'utente è già loggato, mostriamo un CTA diverso (upgrade vs signup) */
  isAuthenticated?: boolean;
}

export const PaywallBlur = ({ hiddenPreview, dreamId, isAuthenticated = false }: PaywallBlurProps) => {
  const ctaTo = isAuthenticated
    ? `/settings?tab=plan&from=visione&dream=${dreamId}`
    : `/auth?mode=signup&from=visione&dream=${dreamId}`;

  const ctaLabel = isAuthenticated
    ? "Sblocca con Alchemist Premium"
    : "Inizia il tuo viaggio — gratis";

  return (
    <div className="relative mt-6">
      {/* Testo sfocato come "teaser visivo" */}
      <div
        aria-hidden
        className="select-none pointer-events-none max-h-48 overflow-hidden text-sm leading-relaxed text-foreground/70"
        style={{
          filter: "blur(6px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, hsl(0 0% 0% / 1) 0%, hsl(0 0% 0% / 0.7) 40%, hsl(0 0% 0% / 0) 90%)",
          maskImage:
            "linear-gradient(to bottom, hsl(0 0% 0% / 1) 0%, hsl(0 0% 0% / 0.7) 40%, hsl(0 0% 0% / 0) 90%)",
        }}
      >
        {hiddenPreview}
      </div>

      {/* Overlay editoriale */}
      <div
        className="absolute inset-0 flex items-end justify-center pb-2"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, hsl(var(--background) / 0.6) 40%, hsl(var(--background)) 80%)",
        }}
      >
        <div className="text-center max-w-md px-6 pb-2">
          <div
            className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.32em] mb-4"
            style={{ color: "hsl(var(--mystic-glow))" }}
          >
            <span>✦</span>
            <span>La voce dell'Alchimista continua</span>
            <span>✦</span>
          </div>

          <p className="font-editorial italic text-base text-foreground/80 leading-relaxed mb-6">
            Sblocca l'<em>interpretazione completa</em>, la tua mappa alchemica
            personale e il dialogo segreto con l'Alchimista.
          </p>

          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to={ctaTo}>
              <Sparkles className="h-4 w-4 mr-2" />
              {ctaLabel}
            </Link>
          </Button>

          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground mt-4">
              Hai già un account?{" "}
              <Link
                to={`/auth?mode=login&from=visione&dream=${dreamId}`}
                className="underline hover:text-mystic-pink transition-colors"
              >
                Accedi
              </Link>
            </p>
          )}

          <p className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 mt-5">
            <Lock className="h-3 w-3" />
            Contenuto riservato ai membri
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaywallBlur;
