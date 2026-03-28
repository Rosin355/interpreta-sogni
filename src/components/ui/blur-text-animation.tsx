import React, { useEffect, useMemo, useRef, useState } from "react";

interface WordData {
  text: string;
  duration: number;
  delay: number;
  blur: number;
  scale?: number;
}

interface BlurTextAnimationProps {
  text?: string;
  words?: WordData[];
  phrases?: readonly string[];
  activePhraseIndex?: number;
  className?: string;
  fontSize?: string;
  fontFamily?: string;
  textColor?: string;
  animationDelay?: number;
  fullHeight?: boolean;
  loop?: boolean;
  freezeOnComplete?: boolean;
  staticText?: string;
  onAnimationComplete?: () => void;
}

export default function BlurTextAnimation({
  text = "Elegant blur animation that brings your words to life with cinematic transitions.",
  words,
  phrases,
  activePhraseIndex = 0,
  className = "",
  fontSize = "text-4xl md:text-5xl lg:text-6xl",
  fontFamily = "font-['Avenir_Next',_'Avenir',_system-ui,_sans-serif]",
  textColor = "text-white",
  animationDelay = 4000,
  fullHeight = true,
  loop = true,
  freezeOnComplete = false,
  staticText,
  onAnimationComplete,
}: BlurTextAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const hasCompletedRef = useRef(false);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const startDelayTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const resolvedText = phrases?.length ? phrases[Math.min(activePhraseIndex, phrases.length - 1)] : text;

  const textWords = useMemo(() => {
    if (words) return words;

    const splitWords = resolvedText.split(" ");
    const totalWords = splitWords.length;

    return splitWords.map((word, index) => {
      const progress = index / totalWords;
      const exponentialDelay = Math.pow(progress, 0.8) * 0.5;
      const baseDelay = index * 0.06;
      const microVariation = (Math.random() - 0.5) * 0.05;

      return {
        text: word,
        duration: 2.2 + Math.cos(index * 0.3) * 0.3,
        delay: baseDelay + exponentialDelay + microVariation,
        blur: 12 + Math.floor(Math.random() * 8),
        scale: 0.9 + Math.sin(index * 0.2) * 0.05,
      };
    });
  }, [resolvedText, words]);

  useEffect(() => {
    hasCompletedRef.current = false;
    setIsAnimating(false);
  }, [resolvedText]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setPrefersReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);

    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsAnimating(true);
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onAnimationComplete?.();
      }
      return;
    }

    const markComplete = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      onAnimationComplete?.();
    };

    const startAnimation = () => {
      startDelayTimeoutRef.current = setTimeout(() => {
        setIsAnimating(true);
      }, 200);

      let maxTime = 0;
      textWords.forEach((word) => {
        const totalTime = word.delay + word.duration;
        maxTime = Math.max(maxTime, totalTime);
      });

      animationTimeoutRef.current = setTimeout(() => {
        if (loop) {
          setIsAnimating(false);

          resetTimeoutRef.current = setTimeout(() => {
            startAnimation();
          }, animationDelay);
          return;
        }

        if (!freezeOnComplete) {
          setIsAnimating(false);
        }

        completeTimeoutRef.current = setTimeout(markComplete, 150);
      }, (maxTime + 1) * 1000);
    };

    startAnimation();

    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      if (startDelayTimeoutRef.current) clearTimeout(startDelayTimeoutRef.current);
      if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
    };
  }, [textWords, animationDelay, prefersReducedMotion, loop, freezeOnComplete, onAnimationComplete]);

  const renderedWords = freezeOnComplete && !isAnimating && staticText
    ? staticText.split(" ").filter(Boolean).map((word) => ({
        text: word,
        duration: 0,
        delay: 0,
        blur: 0,
        scale: 1,
      }))
    : textWords;

  return (
    <div className={`flex items-center justify-center ${fullHeight ? "min-h-screen" : "min-h-0"} ${className}`}>
      <div className="text-center max-w-[92vw] sm:max-w-3xl lg:max-w-5xl px-4 sm:px-6 md:px-8">
        <p
          className={`${textColor} ${fontSize} ${fontFamily} font-light leading-[1.2] sm:leading-[1.25] md:leading-[1.3] tracking-wide break-words`}
        >
          {renderedWords.map((word, index) => (
            <span
              key={index}
              className={`inline-block transition-all ${
                isAnimating || (freezeOnComplete && staticText) ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transitionDuration: `${word.duration}s`,
                transitionDelay: `${word.delay}s`,
                transitionTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                filter:
                  isAnimating || (freezeOnComplete && staticText)
                    ? "blur(0px) brightness(1)"
                    : `blur(${word.blur}px) brightness(0.6)`,
                transform:
                  isAnimating || (freezeOnComplete && staticText)
                  ? "translateY(0) scale(1) rotateX(0deg)"
                  : `translateY(20px) scale(${word.scale || 1}) rotateX(-15deg)`,
                marginRight: "0.35em",
                willChange: "filter, transform, opacity",
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                textShadow:
                  isAnimating || (freezeOnComplete && staticText)
                  ? "0 2px 8px rgba(255,255,255,0.1)"
                  : "0 0 40px rgba(255,255,255,0.4)",
              }}
            >
              {word.text}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
