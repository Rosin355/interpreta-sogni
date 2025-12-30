import React, { useEffect, useRef, useCallback } from 'react';

interface MysticCursorProps {
  trailLength?: number;
  enabled?: boolean;
}

const MysticCursor: React.FC<MysticCursorProps> = ({ 
  trailLength = 5, // Reduced from 8
  enabled = true 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const targetPos = useRef({ x: 0, y: 0 });
  const trailPoints = useRef<{ x: number; y: number; age: number }[]>([]);
  const animationRef = useRef<number>();
  const isVisible = useRef(false);
  const isIdle = useRef(false);
  const idleTimeoutRef = useRef<number>();
  const lastMoveTime = useRef(0);

  // FPS throttling
  const fps = 30;
  const fpsInterval = 1000 / fps;
  const lastFrameTime = useRef(performance.now());

  const draw = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // FPS throttling
    const elapsed = currentTime - lastFrameTime.current;
    if (elapsed < fpsInterval) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }
    lastFrameTime.current = currentTime - (elapsed % fpsInterval);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isVisible.current || isIdle.current) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }

    // Smooth interpolation towards target
    mousePos.current.x += (targetPos.current.x - mousePos.current.x) * 0.3;
    mousePos.current.y += (targetPos.current.y - mousePos.current.y) * 0.3;

    // Update trail points
    trailPoints.current.unshift({ 
      x: mousePos.current.x, 
      y: mousePos.current.y, 
      age: 0 
    });

    // Age and filter trail points
    trailPoints.current = trailPoints.current
      .map(p => ({ ...p, age: p.age + 1 }))
      .filter(p => p.age < trailLength * 2)
      .slice(0, trailLength);

    // Draw trail with smooth interpolation
    for (let i = trailPoints.current.length - 1; i >= 0; i--) {
      const point = trailPoints.current[i];
      const progress = i / trailLength;
      const opacity = Math.max(0, 1 - progress) * 0.4;
      const size = 3 + (1 - progress) * 8;

      if (opacity <= 0) continue;

      // Outer glow
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, size * 2
      );
      gradient.addColorStop(0, `hsla(300, 100%, 70%, ${opacity * 0.5})`);
      gradient.addColorStop(0.5, `hsla(320, 80%, 50%, ${opacity * 0.2})`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(point.x, point.y, size * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw main cursor
    const { x, y } = mousePos.current;

    // Outer soft glow (smaller)
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, 25);
    outerGlow.addColorStop(0, 'hsla(300, 100%, 70%, 0.12)');
    outerGlow.addColorStop(0.6, 'hsla(320, 80%, 50%, 0.06)');
    outerGlow.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    // Inner core (smaller)
    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 6);
    coreGradient.addColorStop(0, 'hsla(300, 100%, 80%, 0.85)');
    coreGradient.addColorStop(0.5, 'hsla(320, 80%, 60%, 0.6)');
    coreGradient.addColorStop(1, 'hsla(280, 70%, 50%, 0.3)');
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();

    // Cross rays (shorter)
    ctx.save();
    ctx.globalAlpha = 0.3;
    
    const rayLength = 12;
    
    // Vertical ray
    const vGradient = ctx.createLinearGradient(x, y - rayLength, x, y + rayLength);
    vGradient.addColorStop(0, 'transparent');
    vGradient.addColorStop(0.5, 'hsla(300, 100%, 70%, 0.7)');
    vGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = vGradient;
    ctx.fillRect(x - 1, y - rayLength, 2, rayLength * 2);

    // Horizontal ray
    const hGradient = ctx.createLinearGradient(x - rayLength, y, x + rayLength, y);
    hGradient.addColorStop(0, 'transparent');
    hGradient.addColorStop(0.5, 'hsla(300, 100%, 70%, 0.7)');
    hGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = hGradient;
    ctx.fillRect(x - rayLength, y - 1, rayLength * 2, 2);

    ctx.restore();

    animationRef.current = requestAnimationFrame(draw);
  }, [trailLength, fpsInterval]);

  useEffect(() => {
    if (!enabled) return;

    // Check if device has fine pointer (mouse)
    const hasMouse = window.matchMedia('(pointer: fine)').matches;
    if (!hasMouse) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize, { passive: true });

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      isVisible.current = true;
      isIdle.current = false;
      lastMoveTime.current = performance.now();

      // Reset idle timeout
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = window.setTimeout(() => {
        isIdle.current = true;
        trailPoints.current = [];
      }, 150);
    };

    const handleMouseLeave = () => {
      isVisible.current = false;
      trailPoints.current = [];
    };

    const handleMouseEnter = () => {
      isVisible.current = true;
      isIdle.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
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
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [enabled, draw]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ mixBlendMode: 'screen', willChange: 'transform' }}
    />
  );
};

export default MysticCursor;
