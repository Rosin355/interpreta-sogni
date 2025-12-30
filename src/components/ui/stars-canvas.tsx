'use client';
import { useEffect, useRef, useState } from 'react';

interface StarsCanvasProps {
  transparent?: boolean;
  maxStars?: number;
  hue?: number;
  brightness?: number;
  speedMultiplier?: number;
  twinkleIntensity?: number;
  className?: string;
  paused?: boolean;
  parallaxStrength?: number;
}

export function StarsCanvas({
  transparent = false,
  maxStars = 400, // Reduced from 1200
  hue = 217,
  brightness = 10,
  speedMultiplier = 1,
  twinkleIntensity = 20,
  className = '',
  paused = false,
  parallaxStrength = 0.3,
}: StarsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const scrollOffsetRef = useRef(0);
  const [isVisible, setIsVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Visibility detection - pause when off viewport
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion) return;

    const ctx = canvas.getContext('2d')!;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    let stars: Star[] = [];
    let count = 0;

    // FPS throttling - target 30fps
    const fps = 30;
    const fpsInterval = 1000 / fps;
    let lastFrameTime = performance.now();

    // --- Cached gradient texture ---
    const canvas2 = document.createElement('canvas');
    const ctx2 = canvas2.getContext('2d')!;
    canvas2.width = 100;
    canvas2.height = 100;
    const half = canvas2.width / 2;
    const gradient2 = ctx2.createRadialGradient(half, half, 0, half, half, half);
    gradient2.addColorStop(0.025, '#fff');
    gradient2.addColorStop(0.1, `hsl(${hue}, 61%, 33%)`);
    gradient2.addColorStop(0.25, `hsl(${hue}, 64%, 6%)`);
    gradient2.addColorStop(1, 'transparent');
    ctx2.fillStyle = gradient2;
    ctx2.beginPath();
    ctx2.arc(half, half, half, 0, Math.PI * 2);
    ctx2.fill();

    // --- Utility functions ---
    const random = (min: number, max?: number) => {
      if (max === undefined) {
        max = min;
        min = 0;
      }
      if (min > max) [min, max] = [max, min];
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const maxOrbit = (x: number, y: number) => {
      const max = Math.max(x, y);
      const diameter = Math.round(Math.sqrt(max * max + max * max));
      return diameter / 2;
    };

    // --- Star class ---
    class Star {
      orbitRadius: number;
      radius: number;
      orbitX: number;
      orbitY: number;
      timePassed: number;
      speed: number;
      alpha: number;
      parallaxFactor: number;

      constructor() {
        this.orbitRadius = random(maxOrbit(w, h));
        this.radius = random(60, this.orbitRadius) / 12;
        this.orbitX = w / 2;
        this.orbitY = h / 2;
        this.timePassed = random(0, maxStars);
        this.speed = (random(this.orbitRadius) / 50000) * speedMultiplier;
        this.alpha = (random(2, 10) / 10) * brightness;
        // Parallax factor based on orbit radius (bigger orbit = slower parallax)
        this.parallaxFactor = (1 - this.orbitRadius / maxOrbit(w, h)) * parallaxStrength + 0.1;
        count++;
        stars[count] = this;
      }

      draw() {
        const parallaxOffset = scrollOffsetRef.current * this.parallaxFactor;
        const x = Math.sin(this.timePassed) * this.orbitRadius + this.orbitX;
        const y = Math.cos(this.timePassed) * this.orbitRadius + this.orbitY - parallaxOffset;
        const twinkle = random(twinkleIntensity);

        if (twinkle === 1 && this.alpha > 0) {
          this.alpha -= 0.05;
        } else if (twinkle === 2 && this.alpha < 1) {
          this.alpha += 0.05;
        }

        ctx.globalAlpha = this.alpha;
        ctx.drawImage(canvas2, x - this.radius / 2, y - this.radius / 2, this.radius, this.radius);
        this.timePassed += this.speed;
      }
    }

    for (let i = 0; i < maxStars; i++) new Star();

    // --- Animation loop with FPS throttling ---
    const animate = (currentTime: number) => {
      if (paused || !isVisible) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = currentTime - lastFrameTime;

      if (elapsed >= fpsInterval) {
        lastFrameTime = currentTime - (elapsed % fpsInterval);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = transparent ? 'hsla(217, 64%, 6%, 0)' : 'hsla(217, 64%, 6%, 1)';
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i < stars.length; i++) {
          stars[i].draw();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // --- Resize handling ---
    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    // --- Scroll handling for parallax (passive) ---
    const handleScroll = () => {
      scrollOffsetRef.current = window.scrollY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      cancelAnimationFrame(animationRef.current!);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [transparent, maxStars, hue, brightness, speedMultiplier, twinkleIntensity, paused, parallaxStrength, isVisible, prefersReducedMotion]);

  // Static fallback for reduced motion
  if (prefersReducedMotion) {
    return (
      <div 
        className={`absolute inset-0 w-full h-full ${className}`}
        style={{
          background: transparent ? 'transparent' : 'hsl(217, 64%, 6%)',
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ willChange: 'transform' }}
    />
  );
}
