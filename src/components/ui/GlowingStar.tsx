interface GlowingStarProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'white' | 'pink' | 'purple' | 'gold';
  animated?: boolean;
  style?: React.CSSProperties;
  delay?: number;
}

export function GlowingStar({ 
  className = '', 
  size = 'md',
  color = 'white',
  animated = true,
  style,
  delay = 0,
}: GlowingStarProps) {
  const sizeMap = {
    sm: { star: 8, glow: 20, rays: 15 },
    md: { star: 12, glow: 30, rays: 25 },
    lg: { star: 20, glow: 50, rays: 40 },
    xl: { star: 30, glow: 80, rays: 60 },
  };

  const colorMap = {
    white: { core: '#ffffff', glow: 'rgba(255, 255, 255, 0.8)', rays: 'rgba(255, 255, 255, 0.4)' },
    pink: { core: '#f472b6', glow: 'rgba(244, 114, 182, 0.8)', rays: 'rgba(244, 114, 182, 0.4)' },
    purple: { core: '#a855f7', glow: 'rgba(168, 85, 247, 0.8)', rays: 'rgba(168, 85, 247, 0.4)' },
    gold: { core: '#fbbf24', glow: 'rgba(251, 191, 36, 0.8)', rays: 'rgba(251, 191, 36, 0.4)' },
  };

  const s = sizeMap[size];
  const c = colorMap[color];

  return (
    <div
      className={`relative ${animated ? 'star-glow-animation' : ''} ${className}`}
      style={{ 
        width: s.glow * 2, 
        height: s.glow * 2,
        '--star-delay': `${delay}s`,
        willChange: animated ? 'transform, opacity' : 'auto',
        ...style 
      } as React.CSSProperties}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
          filter: 'blur(4px)',
        }}
      />

      {/* Cross rays */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: s.rays * 2,
          height: 2,
          marginLeft: -s.rays,
          marginTop: -1,
          background: `linear-gradient(90deg, transparent, ${c.rays}, ${c.core}, ${c.rays}, transparent)`,
        }}
      />
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: 2,
          height: s.rays * 2,
          marginLeft: -1,
          marginTop: -s.rays,
          background: `linear-gradient(180deg, transparent, ${c.rays}, ${c.core}, ${c.rays}, transparent)`,
        }}
      />

      {/* Diagonal rays */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: s.rays * 1.4,
          height: 1,
          marginLeft: -s.rays * 0.7,
          marginTop: -0.5,
          transform: 'rotate(45deg)',
          background: `linear-gradient(90deg, transparent, ${c.rays}, ${c.core}, ${c.rays}, transparent)`,
          opacity: 0.6,
        }}
      />
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: s.rays * 1.4,
          height: 1,
          marginLeft: -s.rays * 0.7,
          marginTop: -0.5,
          transform: 'rotate(-45deg)',
          background: `linear-gradient(90deg, transparent, ${c.rays}, ${c.core}, ${c.rays}, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* Core */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: s.star,
          height: s.star,
          marginLeft: -s.star / 2,
          marginTop: -s.star / 2,
          borderRadius: '50%',
          background: c.core,
          boxShadow: `0 0 ${s.star}px ${c.core}`,
        }}
      />
    </div>
  );
}
