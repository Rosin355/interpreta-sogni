import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AppLoadingOverlayProps {
  title?: string;
  messages?: string[];
  /** Durata target indicativa in ms per la progressione simulata */
  targetDuration?: number;
}

const DEFAULT_MESSAGES = [
  "Sto aprendo il tuo spazio interiore…",
  "Sto raccogliendo i sogni recenti…",
  "Sto ricomponendo i simboli emersi…",
  "Sto leggendo il tuo viaggio alchemico…",
  "Quasi pronto.",
];

/**
 * Overlay full-screen elegante per first load.
 * Percentuale simulata con curva asintotica (si avvicina ma non raggiunge 100
 * finché il componente è montato — al cambio di stato viene smontato e svanisce).
 */
export const AppLoadingOverlay = ({
  title = "Dream Alchemist",
  messages = DEFAULT_MESSAGES,
  targetDuration = 4000,
}: AppLoadingOverlayProps) => {
  const [progress, setProgress] = useState(2);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      // Curva asintotica: si avvicina al 95% senza superarlo
      const ratio = 1 - Math.exp(-elapsed / (targetDuration * 0.6));
      const next = Math.min(95, Math.round(ratio * 95));
      setProgress((prev) => (next > prev ? next : prev));
    }, 120);
    return () => clearInterval(interval);
  }, [targetDuration]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, 2200);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,hsl(var(--dream-space)/0.85)_0%,hsl(var(--background))_70%)] backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div className="relative flex flex-col items-center gap-8 px-8 text-center">
        {/* Orbita mistica */}
        <div className="relative h-24 w-24">
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
          </motion.div>
          <motion.div
            className="absolute inset-3 rounded-full border border-accent/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent))]" />
          </motion.div>
          <motion.div
            className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_24px_hsl(var(--primary))]"
            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Titolo */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.42em] text-muted-foreground">
            {title}
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5 }}
              className="max-w-sm text-base leading-7 text-foreground/85"
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress bar sottile */}
        <div className="w-64 space-y-2">
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-border/40">
            <motion.div
              className="h-full bg-gradient-to-r from-accent via-primary to-accent"
              initial={{ width: "2%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {progress}%
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default AppLoadingOverlay;
