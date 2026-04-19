import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Top progress bar sincronizzata con il caricamento reale delle route lazy.
 *
 * Con prefetch idle attivo, i chunk sono quasi sempre già in cache: il mount
 * avviene entro pochi ms e mostrare la barra creerebbe solo "rumore" visivo.
 *
 * Per questo applichiamo una soglia di apparizione (APPEAR_THRESHOLD_MS):
 * - Al cambio route partiamo un timer; solo se scatta facciamo apparire la barra.
 * - Se il loadingTick (mount completato) arriva prima del timer, la barra
 *   non viene mai mostrata.
 * - Se il caricamento supera la soglia, la barra appare e cresce in modo
 *   asintotico fino al completamento.
 */
const APPEAR_THRESHOLD_MS = 250;

export const RouteProgressBar = ({ loadingTick }: { loadingTick?: number }) => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const appearTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | undefined>(loadingTick);

  const clearAllTimers = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (appearTimerRef.current) {
      window.clearTimeout(appearTimerRef.current);
      appearTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  // Avvio: cambio route -> programma comparsa solo se il caricamento
  // supera la soglia. Sui chunk già prefetchati il timer viene cancellato
  // dall'effetto su loadingTick prima di scattare.
  useEffect(() => {
    clearAllTimers();
    setVisible(false);
    setProgress(0);

    appearTimerRef.current = window.setTimeout(() => {
      setVisible(true);
      setProgress(10);
      intervalRef.current = window.setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p;
          // Crescita asintotica morbida
          const delta = (90 - p) * 0.15;
          return Math.min(90, p + Math.max(0.5, delta));
        });
      }, 120);
    }, APPEAR_THRESHOLD_MS);

    return () => {
      clearAllTimers();
    };
  }, [location.pathname]);

  // Completion: quando il nuovo content è montato (loadingTick cambia dopo Suspense),
  // cancelliamo il timer di apparizione (se la barra non è ancora visibile non
  // appare affatto) o completiamo e nascondiamo se è già visibile.
  useEffect(() => {
    if (loadingTick === undefined) return;
    if (loadingTick === lastTickRef.current) return;
    lastTickRef.current = loadingTick;

    // Se la barra non è ancora apparsa, semplicemente cancelliamo tutto.
    if (appearTimerRef.current) {
      window.clearTimeout(appearTimerRef.current);
      appearTimerRef.current = null;
    }

    if (!visible) {
      // Mount avvenuto entro la soglia: nessun feedback necessario.
      return;
    }

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(100);
    hideTimerRef.current = window.setTimeout(() => setVisible(false), 220);
    resetTimerRef.current = window.setTimeout(() => setProgress(0), 480);
  }, [loadingTick, visible]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 240ms ease-out" }}
    >
      <div
        className="h-full bg-gradient-to-r from-accent via-primary to-accent shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
        style={{
          width: `${progress}%`,
          transition: "width 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
};

export default RouteProgressBar;
