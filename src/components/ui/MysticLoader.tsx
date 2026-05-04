import { useEffect, useState } from 'react';

interface MysticLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  text?: string;
  fullScreen?: boolean;
  progress?: number; // 0 to 100
}

export function MysticLoader({ 
  size = 'md', 
  showText = true,
  text = 'Caricamento...',
  fullScreen = false,
  progress
}: MysticLoaderProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (progress !== undefined) {
      // Smooth progress animation
      const timer = setTimeout(() => setDisplayProgress(progress), 50);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const sizeMap = {
    sm: { container: 40, orbit: 32, core: 8, star: 4 },
    md: { container: 80, orbit: 64, core: 16, star: 6 },
    lg: { container: 120, orbit: 96, core: 24, star: 8 },
  };

  const s = sizeMap[size];

  const containerClasses = fullScreen 
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030303] backdrop-blur-xl'
    : 'flex flex-col items-center justify-center gap-6';

  return (
    <div className={containerClasses}>
      <div 
        className="relative mb-4"
        style={{ width: s.container, height: s.container }}
      >
        {/* Outer glow ring */}
        <div 
          className={`absolute inset-0 rounded-full ${prefersReducedMotion ? '' : 'mystic-loader-pulse'}`}
          style={{
            background: 'radial-gradient(circle, hsl(var(--mystic-glow) / 0.2) 0%, transparent 70%)',
          }}
        />

        {/* Orbiting stars */}
        {!prefersReducedMotion && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute mystic-loader-orbit"
                style={{
                  width: s.orbit,
                  height: s.orbit,
                  top: '50%',
                  left: '50%',
                  marginTop: -s.orbit / 2,
                  marginLeft: -s.orbit / 2,
                  animationDelay: `${i * -0.5}s`,
                }}
              >
                <div
                  className="absolute mystic-loader-star"
                  style={{
                    width: s.star,
                    height: s.star,
                    top: 0,
                    left: '50%',
                    marginLeft: -s.star / 2,
                    background: `hsl(${280 + i * 20} 80% 70%)`,
                    borderRadius: '50%',
                    boxShadow: `0 0 ${s.star * 2}px hsl(${280 + i * 20} 80% 70%)`,
                  }}
                />
              </div>
            ))}
          </>
        )}

        {/* Inner orbit ring */}
        <div 
          className={`absolute rounded-full border ${prefersReducedMotion ? '' : 'mystic-loader-ring'}`}
          style={{
            width: s.orbit * 0.7,
            height: s.orbit * 0.7,
            top: '50%',
            left: '50%',
            marginTop: -s.orbit * 0.35,
            marginLeft: -s.orbit * 0.35,
            borderColor: 'hsl(var(--mystic-violet) / 0.3)',
          }}
        />

        {/* Core orb */}
        <div 
          className={`absolute rounded-full ${prefersReducedMotion ? '' : 'mystic-loader-core'}`}
          style={{
            width: s.core,
            height: s.core,
            top: '50%',
            left: '50%',
            marginTop: -s.core / 2,
            marginLeft: -s.core / 2,
            background: 'linear-gradient(135deg, hsl(var(--mystic-violet)) 0%, hsl(var(--mystic-magenta)) 100%)',
            boxShadow: `
              0 0 ${s.core}px hsl(var(--mystic-glow) / 0.6),
              0 0 ${s.core * 2}px hsl(var(--mystic-violet) / 0.4),
              inset 0 0 ${s.core / 2}px hsl(var(--mystic-pink) / 0.5)
            `,
          }}
        />
      </div>

      {/* Progress Bar and Text */}
      <div className="w-64 space-y-4 text-center">
        {showText && (
          <p 
            className={`text-white/60 font-editorial uppercase tracking-[0.2em] text-xs ${prefersReducedMotion ? '' : 'mystic-loader-text'}`}
          >
            {text}
          </p>
        )}
        
        {progress !== undefined && (
          <div className="relative w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-300 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        )}
        
        {progress !== undefined && (
          <p className="text-[10px] text-white/30 font-mono tracking-tighter">
            {Math.round(displayProgress)}% COMPLETATO
          </p>
        )}
      </div>
    </div>
  );
}

export default MysticLoader;
