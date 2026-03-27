import { useState, useCallback } from "react";
import BlurIntroText from "./BlurIntroText";
import { StarsCanvas } from "@/components/ui/stars-canvas";
import { motion, AnimatePresence } from "framer-motion";

const INTRO_LINES = [
  "Non tutto ciò che sogni nasce dal caso.",
  "Alcuni simboli emergono dal profondo.",
  "Altri risuonano con il cielo in cui sei nato.",
  "Tra pianeti, inconscio e alchimia interiore, inizia il viaggio.",
];

interface IntroOverlayProps {
  onComplete: () => void;
}

const markIntroSeen = () => {
  try {
    sessionStorage.setItem("intro_seen", "1");
  } catch {
    // Ignore storage failures so intro flow can still complete.
  }
};

const IntroOverlay = ({ onComplete }: IntroOverlayProps) => {
  const [textDone, setTextDone] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleEnter = useCallback(() => {
    setExiting(true);
    markIntroSeen();
    // Wait for exit animation
    setTimeout(onComplete, 1200);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    markIntroSeen();
    setExiting(true);
    setTimeout(onComplete, 800);
  }, [onComplete]);

  const handleTextComplete = useCallback(() => {
    setTextDone(true);
  }, []);

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          {/* Starfield background */}
          <div className="absolute inset-0">
            <StarsCanvas maxStars={300} hue={270} brightness={8} transparent={false} />
          </div>

          {/* Subtle veil overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 30%, hsl(var(--mystic-deep) / 0.6) 100%)",
            }}
          />

          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 z-10 text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-300 tracking-widest uppercase"
          >
            Salta
          </button>

          {/* Text animation */}
          <div className="relative z-10 flex-1 flex items-center justify-center w-full">
            <BlurIntroText lines={INTRO_LINES} onComplete={handleTextComplete} />
          </div>

          {/* CTA button - appears after text completes */}
          <div className="relative z-10 pb-20">
            <motion.button
              onClick={handleEnter}
              className="px-12 py-4 text-lg tracking-[0.2em] uppercase font-light border border-foreground/20 text-foreground/80 hover:text-foreground hover:border-foreground/40 rounded-full backdrop-blur-sm transition-colors duration-500"
              initial={{ opacity: 0, y: 20 }}
              animate={textDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                textShadow: "0 0 20px hsl(var(--mystic-glow) / 0.3)",
              }}
            >
              Entra
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="intro-exit"
          className="fixed inset-0 z-[9999] bg-background"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{ pointerEvents: "none" }}
        />
      )}
    </AnimatePresence>
  );
};

export default IntroOverlay;
