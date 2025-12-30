import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface TrailPoint {
  x: number;
  y: number;
  id: number;
}

interface MysticCursorProps {
  trailLength?: number;
  enabled?: boolean;
}

const MysticCursor: React.FC<MysticCursorProps> = ({ 
  trailLength = 12,
  enabled = true 
}) => {
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const idCounter = useRef(0);
  
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  
  const springX = useSpring(cursorX, { stiffness: 500, damping: 28 });
  const springY = useSpring(cursorY, { stiffness: 500, damping: 28 });

  useEffect(() => {
    if (!enabled) return;

    // Check if device has fine pointer (mouse)
    const hasMouse = window.matchMedia('(pointer: fine)').matches;
    if (!hasMouse) return;

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      setIsVisible(true);
      
      setTrail(prev => {
        const newPoint = { x: e.clientX, y: e.clientY, id: idCounter.current++ };
        const newTrail = [newPoint, ...prev].slice(0, trailLength);
        return newTrail;
      });
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      setTrail([]);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [enabled, trailLength, cursorX, cursorY]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {/* Trail particles */}
      {trail.map((point, index) => {
        const opacity = 1 - (index / trailLength);
        const scale = 1 - (index / trailLength) * 0.7;
        const size = 8 + (1 - index / trailLength) * 12;
        
        return (
          <motion.div
            key={point.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: opacity * 0.6,
              scale,
              x: point.x - size / 2,
              y: point.y - size / 2
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: `radial-gradient(circle, 
                hsl(var(--mystic-glow) / ${opacity * 0.8}) 0%, 
                hsl(var(--mystic-magenta) / ${opacity * 0.5}) 40%, 
                hsl(var(--mystic-violet) / ${opacity * 0.3}) 70%, 
                transparent 100%)`,
              boxShadow: `
                0 0 ${size * 2}px hsl(var(--mystic-glow) / ${opacity * 0.4}),
                0 0 ${size * 3}px hsl(var(--mystic-magenta) / ${opacity * 0.3})
              `,
              filter: `blur(${index * 0.3}px)`,
            }}
          />
        );
      })}

      {/* Main cursor glow */}
      {isVisible && (
        <motion.div
          className="absolute"
          style={{
            x: springX,
            y: springY,
            translateX: '-50%',
            translateY: '-50%',
          }}
        >
          {/* Outer glow */}
          <div 
            className="absolute rounded-full animate-glow-pulse"
            style={{
              width: 60,
              height: 60,
              left: -30,
              top: -30,
              background: `radial-gradient(circle, 
                hsl(var(--mystic-glow) / 0.15) 0%, 
                hsl(var(--mystic-magenta) / 0.1) 40%, 
                transparent 70%)`,
              filter: 'blur(8px)',
            }}
          />
          
          {/* Inner core */}
          <div 
            className="absolute rounded-full"
            style={{
              width: 12,
              height: 12,
              left: -6,
              top: -6,
              background: `radial-gradient(circle, 
                hsl(var(--mystic-glow)) 0%, 
                hsl(var(--mystic-magenta)) 50%, 
                hsl(var(--mystic-violet)) 100%)`,
              boxShadow: `
                0 0 10px hsl(var(--mystic-glow) / 0.8),
                0 0 20px hsl(var(--mystic-magenta) / 0.6),
                0 0 40px hsl(var(--mystic-violet) / 0.4)
              `,
            }}
          />
          
          {/* Cross rays */}
          <div 
            className="absolute"
            style={{
              width: 2,
              height: 30,
              left: -1,
              top: -15,
              background: `linear-gradient(to bottom, 
                transparent 0%, 
                hsl(var(--mystic-glow) / 0.6) 50%, 
                transparent 100%)`,
              filter: 'blur(1px)',
            }}
          />
          <div 
            className="absolute"
            style={{
              width: 30,
              height: 2,
              left: -15,
              top: -1,
              background: `linear-gradient(to right, 
                transparent 0%, 
                hsl(var(--mystic-glow) / 0.6) 50%, 
                transparent 100%)`,
              filter: 'blur(1px)',
            }}
          />
        </motion.div>
      )}
    </div>
  );
};

export default MysticCursor;
