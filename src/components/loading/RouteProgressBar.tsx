import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Barra di progresso sottile in alto, attivata ad ogni cambio di route.
 * Utile come feedback discreto per il lazy-loading dei chunk.
 */
export const RouteProgressBar = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setVisible(true);
    setProgress(15);

    const t1 = window.setTimeout(() => setProgress(55), 80);
    const t2 = window.setTimeout(() => setProgress(85), 240);
    const t3 = window.setTimeout(() => setProgress(100), 480);
    const t4 = window.setTimeout(() => setVisible(false), 720);

    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
    };
  }, [location.pathname]);

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
          transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
};

export default RouteProgressBar;
