import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Wrapper che applica una transizione fade molto leggera ad ogni cambio route.
 * - Durata breve (~180ms), tono editoriale.
 * - Rispetta prefers-reduced-motion (nessuna animazione).
 * - Non interferisce con Suspense fallback: avvolge l'intero <Routes/>,
 *   quindi il fade riparte solo quando il nuovo contenuto è effettivamente montato.
 */
export const RouteFadeTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (prefersReducedMotion.current) return;
    setVisible(false);
    const t = window.setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [location.pathname]);

  if (prefersReducedMotion.current) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 180ms ease-out",
        willChange: "opacity",
      }}
    >
      {children}
    </div>
  );
};

export default RouteFadeTransition;
