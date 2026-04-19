import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MysticLoader } from "@/components/ui/MysticLoader";

/**
 * Overlay mostrato ad ogni cambio rotta.
 * - Compare immediatamente al cambio di pathname.
 * - Resta visibile per almeno MIN_VISIBLE_MS, anche se il chunk è già in cache.
 * - Scompare solo quando ENTRAMBE le condizioni sono vere:
 *     1) il nuovo chunk lazy è montato (loadingTick è cambiato)
 *     2) il tempo minimo è trascorso
 * - Rispetta prefers-reduced-motion: nessun overlay (evita flash inutili).
 *
 * Lo stato di "switching" vive qui, in un contenitore padre (AppRouter) che
 * NON viene smontato dal cambio rotta, così l'overlay non sparisce con il
 * panel della pagina precedente.
 */
const MIN_VISIBLE_MS = 400;

export const RouteSwitchOverlay = ({ loadingTick }: { loadingTick?: number }) => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false); // chunk pronto?
  const [minElapsed, setMinElapsed] = useState(false); // minimo trascorso?
  const lastTickRef = useRef<number | undefined>(loadingTick);
  const minTimerRef = useRef<number | null>(null);
  const isFirstRouteRef = useRef(true);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Cambio rotta → mostra overlay e resetta i flag
  useEffect(() => {
    if (prefersReducedMotion) return;
    // Salta il primo render (caricamento iniziale gestito da Suspense fallback)
    if (isFirstRouteRef.current) {
      isFirstRouteRef.current = false;
      lastTickRef.current = loadingTick;
      return;
    }

    setVisible(true);
    setMounted(false);
    setMinElapsed(false);

    if (minTimerRef.current) window.clearTimeout(minTimerRef.current);
    minTimerRef.current = window.setTimeout(() => {
      setMinElapsed(true);
    }, MIN_VISIBLE_MS);

    return () => {
      if (minTimerRef.current) {
        window.clearTimeout(minTimerRef.current);
        minTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // loadingTick cambia → chunk montato
  useEffect(() => {
    if (loadingTick === undefined) return;
    if (loadingTick === lastTickRef.current) return;
    lastTickRef.current = loadingTick;
    setMounted(true);
  }, [loadingTick]);

  // Quando entrambe le condizioni sono vere, chiudi
  useEffect(() => {
    if (visible && mounted && minElapsed) {
      setVisible(false);
    }
  }, [visible, mounted, minElapsed]);

  if (!visible || prefersReducedMotion) return null;

  return (
    <div
      aria-hidden="false"
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[55] pointer-events-none"
      style={{
        animation: "routeSwitchFadeIn 160ms ease-out both",
      }}
    >
      <MysticLoader fullScreen size="lg" text="Cambio scenario onirico..." />
      <style>{`
        @keyframes routeSwitchFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default RouteSwitchOverlay;
