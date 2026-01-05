import { useEffect, useState } from 'react';

interface MysticLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  text?: string;
  fullScreen?: boolean;
}

export function MysticLoader({ 
  size = 'md', 
  showText = true,
  text = 'Caricamento...',
  fullScreen = false 
}: MysticLoaderProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm'
    : 'flex flex-col items-center justify-center gap-4';

  return (
    <div className={containerClasses}>
      <div 
        className="relative"
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

        {/* Cross rays from core */}
        {!prefersReducedMotion && (
          <div 
            className="absolute mystic-loader-rays"
            style={{
              width: s.core * 3,
              height: s.core * 3,
              top: '50%',
              left: '50%',
              marginTop: -s.core * 1.5,
              marginLeft: -s.core * 1.5,
            }}
          >
            <div 
              className="absolute"
              style={{
                width: '100%',
                height: 2,
                top: '50%',
                left: 0,
                marginTop: -1,
                background: 'linear-gradient(90deg, transparent, hsl(var(--mystic-glow) / 0.6), transparent)',
              }}
            />
            <div 
              className="absolute"
              style={{
                width: 2,
                height: '100%',
                top: 0,
                left: '50%',
                marginLeft: -1,
                background: 'linear-gradient(180deg, transparent, hsl(var(--mystic-glow) / 0.6), transparent)',
              }}
            />
          </div>
        )}
      </div>

      {/* Loading text */}
      {showText && (
        <p 
          className={`text-muted-foreground ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'} ${prefersReducedMotion ? '' : 'mystic-loader-text'}`}
        >
          {text}
        </p>
      )}
    </div>
  );
}

export default MysticLoader;
