import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Top progress bar sincronizzata con il caricamento reale delle route lazy.
 *
 * Logica:
 * - Al cambio di pathname mostriamo la barra e cresce in modo asintotico fino a ~90%.
 * - Quando il nuovo componente di pagina è effettivamente montato (children renderizzati
 *   dopo il Suspense fallback), il prossimo effetto su pathname coincide col mount,
 *   quindi completiamo la barra a 100% e la nascondiamo.
 *
 * In pratica: useLocation() si aggiorna quando React Router cambia route, ma il render
 * dei children del wrapper avviene solo dopo che il chunk lazy è pronto. Tracciamo
 * quel mount con un ref incrementato dal child wrapper.
 */
export const RouteProgressBar = ({ loadingTick }: { loadingTick?: number }) => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | undefined>(loadingTick);

  // Avvio: cambio route -> start progress
  useEffect(() => {
    setVisible(true);
    setProgress(10);

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        // Crescita asintotica morbida
        const delta = (90 - p) * 0.15;
        return Math.min(90, p + Math.max(0.5, delta));
      });
    }, 120);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [location.pathname]);

  // Completion: quando il nuovo content è montato (loadingTick cambia dopo Suspense),
  // chiudiamo la barra.
  useEffect(() => {
    if (loadingTick === undefined) return;
    if (loadingTick === lastTickRef.current) return;
    lastTickRef.current = loadingTick;

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    setProgress(100);
    const t = window.setTimeout(() => setVisible(false), 220);
    const t2 = window.setTimeout(() => setProgress(0), 480);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [loadingTick]);

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
