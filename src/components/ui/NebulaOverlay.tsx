import { motion } from 'framer-motion';

interface NebulaOverlayProps {
  className?: string;
  intensity?: 'light' | 'medium' | 'strong';
  animated?: boolean;
}

export function NebulaOverlay({ 
  className = '', 
  intensity = 'medium',
  animated = true 
}: NebulaOverlayProps) {
  const opacityMap = {
    light: 0.15,
    medium: 0.25,
    strong: 0.4,
  };

  const opacity = opacityMap[intensity];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Main nebula gradient */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 30%, hsl(280 70% 30% / ${opacity}) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 20%, hsl(320 80% 40% / ${opacity * 0.8}) 0%, transparent 50%),
            radial-gradient(ellipse 70% 60% at 50% 80%, hsl(260 60% 25% / ${opacity * 0.6}) 0%, transparent 50%)
          `,
        }}
        animate={animated ? {
          scale: [1, 1.05, 1],
          opacity: [1, 0.8, 1],
        } : undefined}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary floating nebula */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 50% 30% at 70% 60%, hsl(300 70% 50% / ${opacity * 0.5}) 0%, transparent 50%),
            radial-gradient(ellipse 40% 40% at 30% 70%, hsl(270 60% 40% / ${opacity * 0.4}) 0%, transparent 50%)
          `,
        }}
        animate={animated ? {
          x: [0, 20, 0],
          y: [0, -15, 0],
        } : undefined}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Cosmic dust particles effect */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 20%, hsl(330 100% 90%) 50%, transparent 100%),
            radial-gradient(1px 1px at 30% 45%, hsl(280 100% 85%) 50%, transparent 100%),
            radial-gradient(2px 2px at 55% 15%, hsl(320 100% 80%) 50%, transparent 100%),
            radial-gradient(1px 1px at 75% 35%, hsl(270 100% 90%) 50%, transparent 100%),
            radial-gradient(1px 1px at 90% 65%, hsl(300 100% 85%) 50%, transparent 100%),
            radial-gradient(2px 2px at 15% 75%, hsl(310 100% 75%) 50%, transparent 100%),
            radial-gradient(1px 1px at 45% 85%, hsl(290 100% 80%) 50%, transparent 100%),
            radial-gradient(1px 1px at 85% 90%, hsl(320 100% 90%) 50%, transparent 100%)
          `,
          backgroundSize: '100% 100%',
        }}
      />
    </div>
  );
}
