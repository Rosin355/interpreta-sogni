import React, { useCallback, useState } from "react";
import { StarsCanvas } from "./stars-canvas";
import BlurTextAnimation from "./blur-text-animation";

interface HeadlinePhrase {
  line1: string;
  specialWord?: string;
  line2: string;
}

type HeroPhrase = string | HeadlinePhrase;

interface HeroProps {
  trustBadge?: {
    text: string;
    icons?: string[];
  };
  headline?: HeadlinePhrase;
  animatedPhrases?: readonly HeroPhrase[];
  subtitle: string;
  buttons?: React.ReactNode;
  className?: string;
}

const getPhraseText = (phrase?: HeroPhrase) => {
  if (!phrase) return "";
  if (typeof phrase === "string") return phrase;

  return `${phrase.line1} ${phrase.specialWord ? `${phrase.specialWord} ` : ""}${phrase.line2}`.trim();
};

const Hero: React.FC<HeroProps> = ({
  trustBadge,
  headline,
  animatedPhrases,
  subtitle,
  buttons,
  className = "",
}) => {
  const fallbackText = getPhraseText(headline) || "Esplora l' Universo dei Tuoi Sogni";
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  const phrases = animatedPhrases?.length ? animatedPhrases : [headline ?? fallbackText];
  const safePhraseIndex = Math.min(Math.max(currentPhraseIndex, 0), phrases.length - 1);
  const activePhrase = getPhraseText(phrases[safePhraseIndex]) || fallbackText;
  const isFinalPhrase = safePhraseIndex === phrases.length - 1;

  const handlePhraseComplete = useCallback(() => {
    setCurrentPhraseIndex((currentIndex) => {
      if (currentIndex >= phrases.length - 1) {
        return currentIndex;
      }

      return currentIndex + 1;
    });
  }, [phrases.length]);

  return (
    <div className={`relative w-full min-h-[100svh] overflow-hidden bg-background ${className}`}>
      <style>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        
        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        @keyframes cinematic-blur-in {
          from {
            opacity: 0;
            filter: blur(16px) brightness(0.65);
            transform: translateY(20px) scale(0.96) rotateX(-10deg);
          }
          to {
            opacity: 1;
            filter: blur(0px) brightness(1);
            transform: translateY(0) scale(1) rotateX(0deg);
          }
        }

        .animate-cinematic-blur-in {
          animation: cinematic-blur-in 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          opacity: 0;
          will-change: filter, transform, opacity;
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        .animation-delay-300 {
          animation-delay: 0.3s;
        }

        .animation-delay-500 {
          animation-delay: 0.5s;
        }
      `}</style>

      <StarsCanvas
        maxStars={400}
        hue={260}
        brightness={0.8}
        speedMultiplier={0.5}
        twinkleIntensity={30}
      />

      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-[5]"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(var(--background)) 100%)",
        }}
      />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-foreground">
        {trustBadge && (
          <div className="mb-6 sm:mb-8 animate-fade-in-down">
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary/10 backdrop-blur-md border border-primary/30 rounded-full text-xs sm:text-sm">
              {trustBadge.icons && (
                <div className="flex">
                  {trustBadge.icons.map((icon, index) => (
                    <span key={index} className="text-accent">
                      {icon}
                    </span>
                  ))}
                </div>
              )}
              <span className="text-muted-foreground">{trustBadge.text}</span>
            </div>
          </div>
        )}

        <div
          className={`w-full text-center max-w-[94vw] sm:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 hero-content ${
            isFinalPhrase ? "space-y-5 sm:space-y-6" : "space-y-0"
          }`}
        >
          <div className="animate-fade-in-up animation-delay-200">
            <BlurTextAnimation
              key={safePhraseIndex}
              as="h1"
              text={fallbackText}
              phrases={phrases.map((phrase) => getPhraseText(phrase) || fallbackText)}
              activePhraseIndex={safePhraseIndex}
              fullHeight={false}
              className="w-full"
              fontSize="text-[1.25rem] sm:text-[1.6rem] md:text-[2rem] lg:text-[2.55rem] xl:text-[3rem]"
              fontFamily="font-bodoni-heading"
              textColor="text-foreground"
              loop={false}
              freezeOnComplete={isFinalPhrase}
              onAnimationComplete={handlePhraseComplete}
              staticText={activePhrase}
            />
          </div>

          {isFinalPhrase && (
            <>
              <div className="max-w-[92vw] sm:max-w-2xl lg:max-w-3xl mx-auto animate-cinematic-blur-in animation-delay-300">
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground font-light leading-relaxed">
                  {subtitle}
                </p>
              </div>

              {buttons && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-7 sm:mt-9 hero-buttons px-2 animate-cinematic-blur-in animation-delay-500">
                  {buttons}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hero;
