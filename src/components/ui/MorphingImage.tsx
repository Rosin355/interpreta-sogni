import React from 'react';
import { motion, useInView, Variants } from 'framer-motion';
import { useRef } from 'react';

interface MorphingImageProps {
  src: string;
  alt: string;
  className?: string;
  morphType?: 'fade' | 'scale' | 'blur' | 'reveal' | 'glow';
  duration?: number;
  delay?: number;
}

export const MorphingImage: React.FC<MorphingImageProps> = ({
  src,
  alt,
  className = '',
  morphType = 'reveal',
  duration = 1.2,
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const getVariants = (): Variants => {
    switch (morphType) {
      case 'fade':
        return {
          hidden: { opacity: 0, scale: 0.95 },
          visible: { 
            opacity: 1, 
            scale: 1,
            transition: { duration, delay, ease: 'easeOut' }
          }
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.8, y: 40 },
          visible: { 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: { duration, delay, ease: 'easeOut' }
          }
        };
      case 'blur':
        return {
          hidden: { opacity: 0, filter: 'blur(20px)', scale: 1.1 },
          visible: { 
            opacity: 1, 
            filter: 'blur(0px)', 
            scale: 1,
            transition: { duration: duration * 1.2, delay, ease: 'easeOut' }
          }
        };
      case 'reveal':
        return {
          hidden: { 
            opacity: 0, 
            clipPath: 'inset(100% 0% 0% 0%)',
            scale: 1.05
          },
          visible: { 
            opacity: 1, 
            clipPath: 'inset(0% 0% 0% 0%)',
            scale: 1,
            transition: { 
              duration: duration * 1.3, 
              delay,
              ease: 'easeInOut',
            }
          }
        };
      case 'glow':
        return {
          hidden: { 
            opacity: 0, 
            scale: 0.9,
            filter: 'brightness(0.5) saturate(0)'
          },
          visible: { 
            opacity: 1, 
            scale: 1,
            filter: 'brightness(1) saturate(1)',
            transition: { 
              duration: duration * 1.4, 
              delay,
              ease: 'easeOut'
            }
          }
        };
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { duration, delay } }
        };
    }
  };

  return (
    <div ref={ref} className="relative overflow-hidden">
      {/* Glow effect behind image */}
      {morphType === 'glow' && (
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1.1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: duration * 2, delay: delay + 0.3, ease: 'easeOut' }}
          style={{
            background: 'radial-gradient(ellipse at center, hsl(var(--mystic-glow) / 0.3) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      )}
      
      {/* Shimmer overlay during reveal */}
      {morphType === 'reveal' && (
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none"
          initial={{ x: '-100%', opacity: 0 }}
          animate={isInView ? { x: '200%', opacity: [0, 0.5, 0] } : { x: '-100%', opacity: 0 }}
          transition={{ 
            duration: duration * 1.5, 
            delay: delay + 0.2, 
            ease: 'easeInOut' 
          }}
          style={{
            background: 'linear-gradient(90deg, transparent 0%, hsl(var(--mystic-glow) / 0.4) 50%, transparent 100%)',
            width: '50%',
          }}
        />
      )}

      {/* Main image */}
      <motion.img
        src={src}
        alt={alt}
        className={className}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={getVariants()}
      />

      {/* Particle dust effect for glow type */}
      {morphType === 'glow' && isInView && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 2, delay: delay + 0.5 }}
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 20% 30%, hsl(var(--mystic-glow)) 50%, transparent 100%),
              radial-gradient(2px 2px at 40% 70%, hsl(var(--mystic-magenta)) 50%, transparent 100%),
              radial-gradient(1px 1px at 60% 20%, hsl(var(--mystic-pink)) 50%, transparent 100%),
              radial-gradient(2px 2px at 80% 50%, hsl(var(--mystic-violet)) 50%, transparent 100%),
              radial-gradient(1px 1px at 30% 80%, hsl(var(--mystic-glow)) 50%, transparent 100%)
            `,
          }}
        />
      )}
    </div>
  );
};

export default MorphingImage;
