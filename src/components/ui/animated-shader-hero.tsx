import React from "react";
import { StarsCanvas } from "./stars-canvas";
import BlurTextAnimation from "./blur-text-animation";

interface HeroProps {
  trustBadge?: {
    text: string;
    icons?: string[];
  };
  headline: {
    line1: string;
    specialWord?: string;
    line2: string;
  };
  subtitle: string;
  buttons?: React.ReactNode;
  className?: string;
}

const Hero: React.FC<HeroProps> = ({
  trustBadge,
  headline,
  subtitle,
  buttons,
  className = "",
}) => {
  const introText = `${headline.line1} ${headline.specialWord ? `${headline.specialWord} ` : ""}${headline.line2}`.trim();

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

        <div className="w-full text-center space-y-4 sm:space-y-6 max-w-[96vw] sm:max-w-5xl mx-auto px-3 sm:px-4 hero-content">
          <div className="animate-fade-in-up animation-delay-200">
            <BlurTextAnimation
              text={introText}
              fullHeight={false}
              className="w-full"
              fontSize="text-[1.75rem] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
              textColor="text-foreground"
              animationDelay={4000}
            />
          </div>

          <div className="max-w-[92vw] sm:max-w-3xl mx-auto animate-fade-in-up animation-delay-400">
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground font-light leading-relaxed">
              {subtitle}
            </p>
          </div>

          {buttons && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-6 sm:mt-10 animate-fade-in-up animation-delay-600 hero-buttons px-2">
              {buttons}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hero;
