import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MysticLoader } from "@/components/ui/MysticLoader";

/**
 * Overlay unico mostrato ad ogni cambio rotta.
 * Resta visibile solo finché il nuovo chunk lazy è montato e il tempo minimo
 * è trascorso. Il caricamento dati delle pagine viene gestito dagli skeleton
 * interni, così il primo tap del menu non resta bloccato da fetch lenti.
 *
 * Safety: dopo MAX_VISIBLE_MS l'overlay viene chiuso comunque per evitare
 * blocchi in caso di errori di fetch.
 *
 * Rispetta prefers-reduced-motion: nessun overlay.
 */
const MIN_VISIBLE_MS = 180;
const MAX_VISIBLE_MS = 1800;

export const RouteSwitchOverlay = ({ loadingTick }: { loadingTick?: number }) => {
  const location = useLocation();

  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  const lastTickRef = useRef<number | undefined>(loadingTick);
  const minTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const isFirstRouteRef = useRef(true);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Cambio rotta → mostra overlay e resetta i flag
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (isFirstRouteRef.current) {
      isFirstRouteRef.current = false;
      lastTickRef.current = loadingTick;
      return;
    }

    setVisible(true);
    setMounted(false);
    setMinElapsed(false);

    if (minTimerRef.current) window.clearTimeout(minTimerRef.current);
    if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);

    minTimerRef.current = window.setTimeout(() => {
      setMinElapsed(true);
    }, MIN_VISIBLE_MS);

    // Safety: chiudi comunque dopo MAX_VISIBLE_MS
    maxTimerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, MAX_VISIBLE_MS);

    return () => {
      if (minTimerRef.current) {
        window.clearTimeout(minTimerRef.current);
        minTimerRef.current = null;
      }
      if (maxTimerRef.current) {
        window.clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
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

  // Chiudi quando tutte le condizioni sono soddisfatte
  useEffect(() => {
    if (visible && mounted && minElapsed) {
      setVisible(false);
      if (maxTimerRef.current) {
        window.clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
      }
    }
  }, [visible, mounted, minElapsed]);

  const [progress, setProgress] = useState(0);

  // Simula il progresso finché siamo visibili
  useEffect(() => {
    if (!visible) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95; // Si ferma al 95% finché non è pronto davvero
        const step = prev < 30 ? 2 : prev < 70 ? 1 : 0.5;
        return prev + step;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [visible]);

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
      <MysticLoader 
        fullScreen 
        size="lg" 
        text="Sintonizzazione frequenze oniriche..." 
        progress={progress}
      />
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
