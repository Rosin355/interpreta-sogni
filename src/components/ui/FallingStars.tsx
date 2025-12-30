'use client';
import { useEffect, useRef } from 'react';

interface FallingStarsProps {
  className?: string;
  starCount?: number;
  colors?: string[];
  speed?: number;
  paused?: boolean;
}

interface FallingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  color: string;
  delay: number;
  active: boolean;
}

export function FallingStars({
  className = '',
  starCount = 20,
  colors = ['#a855f7', '#ec4899', '#f472b6', '#c084fc', '#e879f9'],
  speed = 1,
  paused = false,
}: FallingStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const starsRef = useRef<FallingStar[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const createStar = (): FallingStar => ({
      x: Math.random() * w * 1.5 - w * 0.25,
      y: -50 - Math.random() * 200,
      length: 30 + Math.random() * 80,
      speed: (2 + Math.random() * 3) * speed,
      opacity: 0.3 + Math.random() * 0.7,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 5000,
      active: false,
    });

    // Initialize stars with staggered delays
    starsRef.current = Array.from({ length: starCount }, createStar);

    let startTime = Date.now();

    const animate = () => {
      if (paused) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentTime = Date.now() - startTime;

      ctx.clearRect(0, 0, w, h);

      starsRef.current.forEach((star, index) => {
        // Check if star should become active
        if (!star.active && currentTime > star.delay) {
          star.active = true;
        }

        if (!star.active) return;

        // Update position
        star.x += star.speed * 0.5;
        star.y += star.speed;

        // Draw the falling star with trail
        const gradient = ctx.createLinearGradient(
          star.x - star.length * 0.3,
          star.y - star.length * 0.6,
          star.x,
          star.y
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, star.color + '40');
        gradient.addColorStop(1, star.color);

        ctx.beginPath();
        ctx.moveTo(star.x - star.length * 0.3, star.y - star.length * 0.6);
        ctx.lineTo(star.x, star.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.globalAlpha = star.opacity;
        ctx.stroke();

        // Draw glow at the head
        const glowGradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, 8
        );
        glowGradient.addColorStop(0, star.color);
        glowGradient.addColorStop(0.5, star.color + '60');
        glowGradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(star.x, star.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.globalAlpha = star.opacity;
        ctx.fill();

        ctx.globalAlpha = 1;

        // Reset star when it goes off screen
        if (star.y > h + 100 || star.x > w + 100) {
          starsRef.current[index] = {
            ...createStar(),
            delay: 0,
            active: true,
          };
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current!);
      window.removeEventListener('resize', handleResize);
    };
  }, [starCount, colors, speed, paused]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
