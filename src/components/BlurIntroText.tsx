import { useEffect, useRef, useState, useCallback } from "react";

interface BlurIntroTextProps {
  lines: string[];
  onComplete?: () => void;
  className?: string;
}

// Per-word animation with blur, opacity, translateY, scale, rotateX, glow
// Matches the premium cinematic feel of the reference BlurTextAnimation
const WORD_DURATION = 600; // ms per word reveal
const WORD_DELAY = 120; // ms stagger between words
const LINE_PAUSE = 1400; // ms pause between lines
const BLUR_START = 12; // px
const BRIGHTNESS_START = 0.4;

interface WordState {
  text: string;
  progress: number; // 0 to 1
}

const BlurIntroText = ({ lines, onComplete, className = "" }: BlurIntroTextProps) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [words, setWords] = useState<WordState[]>([]);
  const [lineOpacity, setLineOpacity] = useState(1);
  const [completed, setCompleted] = useState(false);
  const animFrameRef = useRef<number>();
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const animateLine = useCallback((line: string, lineIdx: number) => {
    const lineWords = line.split(" ").filter(Boolean);
    const initialWords = lineWords.map((w) => ({ text: w, progress: 0 }));
    setWords(initialWords);
    setLineOpacity(1);

    // Animate each word with staggered timing
    lineWords.forEach((_, wordIdx) => {
      const startDelay = wordIdx * WORD_DELAY;
      const startTime = performance.now() + startDelay;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, Math.max(0, elapsed / WORD_DURATION));

        setWords((prev) => {
          const next = [...prev];
          if (next[wordIdx]) {
            next[wordIdx] = { ...next[wordIdx], progress };
          }
          return next;
        });

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };

      const t = setTimeout(() => {
        animFrameRef.current = requestAnimationFrame(animate);
      }, startDelay);
      timeoutsRef.current.push(t);
    });

    // After all words revealed, pause then fade out line
    const totalWordTime = (lineWords.length - 1) * WORD_DELAY + WORD_DURATION;
    const fadeOutStart = totalWordTime + LINE_PAUSE * 0.6;

    const fadeOut = setTimeout(() => {
      // Fade out current line
      setLineOpacity(0);

      const nextLine = setTimeout(() => {
        if (lineIdx < lines.length - 1) {
          setCurrentLineIndex(lineIdx + 1);
        } else {
          setCompleted(true);
          onComplete?.();
        }
      }, 800); // fade-out duration
      timeoutsRef.current.push(nextLine);
    }, fadeOutStart);
    timeoutsRef.current.push(fadeOut);
  }, [lines, onComplete]);

  useEffect(() => {
    if (!completed && currentLineIndex < lines.length) {
      clearTimeouts();
      animateLine(lines[currentLineIndex], currentLineIndex);
    }
    return clearTimeouts;
  }, [currentLineIndex, completed, lines, animateLine, clearTimeouts]);

  // Easing function for smoother animation
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  return (
    <div className={`flex items-center justify-center min-h-[120px] px-6 ${className}`}>
      <p
        className="text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light leading-relaxed max-w-4xl"
        style={{
          opacity: lineOpacity,
          transition: "opacity 0.8s ease-in-out",
        }}
      >
        {words.map((word, i) => {
          const p = easeOutCubic(word.progress);
          const blur = BLUR_START * (1 - p);
          const opacity = p;
          const translateY = 20 * (1 - p);
          const scale = 0.92 + 0.08 * p;
          const rotateX = 15 * (1 - p);
          const brightness = BRIGHTNESS_START + (1 - BRIGHTNESS_START) * p;
          const glowOpacity = p * 0.6;

          return (
            <span
              key={`${currentLineIndex}-${i}`}
              className="inline-block mr-[0.3em] text-foreground"
              style={{
                filter: `blur(${blur}px) brightness(${brightness})`,
                opacity,
                transform: `translateY(${translateY}px) scale(${scale}) perspective(600px) rotateX(${rotateX}deg)`,
                textShadow: `0 0 ${20 * glowOpacity}px hsl(var(--mystic-glow) / ${glowOpacity}), 0 0 ${40 * glowOpacity}px hsl(var(--mystic-violet) / ${glowOpacity * 0.5})`,
                willChange: "transform, filter, opacity",
                transition: "none",
              }}
            >
              {word.text}
            </span>
          );
        })}
      </p>
    </div>
  );
};

export default BlurIntroText;
