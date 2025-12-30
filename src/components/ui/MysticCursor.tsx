import React, { useEffect, useRef, useCallback } from 'react';

interface MysticCursorProps {
  trailLength?: number;
  enabled?: boolean;
}

const MysticCursor: React.FC<MysticCursorProps> = ({ 
  trailLength = 8,
  enabled = true 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const trailPoints = useRef<{ x: number; y: number; age: number }[]>([]);
  const animationRef = useRef<number>();
  const isVisible = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isVisible.current) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // Update trail points - add new point and age existing ones
    trailPoints.current.unshift({ 
      x: mousePos.current.x, 
      y: mousePos.current.y, 
      age: 0 
    });

    // Age and filter trail points
    trailPoints.current = trailPoints.current
      .map(p => ({ ...p, age: p.age + 1 }))
      .filter(p => p.age < trailLength * 3)
      .slice(0, trailLength * 2);

    // Draw trail with smooth interpolation
    for (let i = trailPoints.current.length - 1; i >= 0; i--) {
      const point = trailPoints.current[i];
      const progress = i / (trailLength * 2);
      const opacity = Math.max(0, 1 - progress) * 0.5;
      const size = 4 + (1 - progress) * 10;

      if (opacity <= 0) continue;

      // Outer glow
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, size * 2
      );
      gradient.addColorStop(0, `hsla(300, 100%, 70%, ${opacity * 0.6})`);
      gradient.addColorStop(0.4, `hsla(320, 80%, 50%, ${opacity * 0.3})`);
      gradient.addColorStop(0.7, `hsla(280, 70%, 45%, ${opacity * 0.15})`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(point.x, point.y, size * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw main cursor
    const { x, y } = mousePos.current;

    // Outer soft glow
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, 40);
    outerGlow.addColorStop(0, 'hsla(300, 100%, 70%, 0.15)');
    outerGlow.addColorStop(0.5, 'hsla(320, 80%, 50%, 0.08)');
    outerGlow.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    // Inner core
    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
    coreGradient.addColorStop(0, 'hsla(300, 100%, 80%, 0.9)');
    coreGradient.addColorStop(0.5, 'hsla(320, 80%, 60%, 0.7)');
    coreGradient.addColorStop(1, 'hsla(280, 70%, 50%, 0.4)');
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();

    // Cross rays
    ctx.save();
    ctx.globalAlpha = 0.4;
    
    // Vertical ray
    const vGradient = ctx.createLinearGradient(x, y - 20, x, y + 20);
    vGradient.addColorStop(0, 'transparent');
    vGradient.addColorStop(0.5, 'hsla(300, 100%, 70%, 0.8)');
    vGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = vGradient;
    ctx.fillRect(x - 1, y - 20, 2, 40);

    // Horizontal ray
    const hGradient = ctx.createLinearGradient(x - 20, y, x + 20, y);
    hGradient.addColorStop(0, 'transparent');
    hGradient.addColorStop(0.5, 'hsla(300, 100%, 70%, 0.8)');
    hGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = hGradient;
    ctx.fillRect(x - 20, y - 1, 40, 2);

    ctx.restore();

    animationRef.current = requestAnimationFrame(draw);
  }, [trailLength]);

  useEffect(() => {
    if (!enabled) return;

    // Check if device has fine pointer (mouse)
    const hasMouse = window.matchMedia('(pointer: fine)').matches;
    if (!hasMouse) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      isVisible.current = true;
    };

    const handleMouseLeave = () => {
      isVisible.current = false;
      trailPoints.current = [];
    };

    const handleMouseEnter = () => {
      isVisible.current = true;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    // Start animation loop
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, draw]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

export default MysticCursor;
