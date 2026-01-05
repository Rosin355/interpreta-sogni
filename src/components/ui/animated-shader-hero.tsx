import React from 'react';
import { StarsCanvas } from './stars-canvas';

// Types for component props
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

// Reusable Hero Component
const Hero: React.FC<HeroProps> = ({
  trustBadge,
  headline,
  subtitle,
  buttons,
  className = ""
}) => {
  return (
    <div className={`relative w-full h-[85vh] md:h-screen overflow-hidden bg-background ${className}`}>
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
        
        .animation-delay-800 {
          animation-delay: 0.8s;
        }
      `}</style>
      
      <StarsCanvas 
        maxStars={400}
        hue={260}
        brightness={0.8}
        speedMultiplier={0.5}
        twinkleIntensity={30}
      />
      
      {/* Gradient fade at the bottom for seamless transition */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-[5]"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(var(--background)) 100%)",
        }}
      />
      
      {/* Hero Content Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-foreground">
        {/* Trust Badge */}
        {trustBadge && (
          <div className="mb-8 animate-fade-in-down">
            <div className="flex items-center gap-2 px-6 py-3 bg-primary/10 backdrop-blur-md border border-primary/30 rounded-full text-sm">
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

        <div className="text-center space-y-6 max-w-5xl mx-auto px-4 hero-content">
          {/* Main Heading with Animation */}
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground animate-fade-in-up animation-delay-200">
              {headline.line1}{" "}
              {headline.specialWord && (
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
                  {headline.specialWord}
                </span>
              )}{" "}
              {headline.line2}
            </h1>
          </div>
          
          {/* Subtitle with Animation */}
          <div className="max-w-3xl mx-auto animate-fade-in-up animation-delay-400">
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground font-light leading-relaxed">
              {subtitle}
            </p>
          </div>
          
          {/* CTA Buttons with Animation */}
          {buttons && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 animate-fade-in-up animation-delay-600 hero-buttons">
              {buttons}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hero;
