import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { AlchemicalPhase } from "@/utils/alchemical-phases";

interface CelebrationOptions {
  phase: AlchemicalPhase;
  fromPhase?: AlchemicalPhase;
}

export const useAlchemicalCelebration = () => {
  // Suono di celebrazione (usando Web Audio API per generare toni)
  const playTransitionSound = useCallback((phase: AlchemicalPhase) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const frequencies = {
      nigredo: [220, 246.94, 261.63], // A3, B3, C4 - toni più bassi
      albedo: [329.63, 369.99, 392.00], // E4, F#4, G4 - toni medi
      rubedo: [440, 493.88, 523.25] // A4, B4, C5 - toni più alti
    };
    
    const notes = frequencies[phase];
    
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      const startTime = audioContext.currentTime + (index * 0.15);
      const duration = 0.3;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }, []);

  // Effetti confetti basati sulla fase
  const launchConfetti = useCallback((phase: AlchemicalPhase) => {
    const colors = {
      nigredo: ['#1a1a1a', '#333333', '#4d4d4d', '#666666'],
      albedo: ['#ffffff', '#f0f0f0', '#e0e0e0', '#d0d0d0', '#c0c0c0'],
      rubedo: ['#ef4444', '#f97316', '#fbbf24', '#dc2626', '#ea580c']
    };

    const phaseColors = colors[phase];

    // Prima esplosione centrale
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: phaseColors,
      gravity: 1,
      scalar: 1.2,
      drift: 0,
      ticks: 200
    });

    // Seconda esplosione dai lati
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: phaseColors
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: phaseColors
      });
    }, 200);

    // Pioggia di stelle dall'alto
    setTimeout(() => {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      
      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 3,
          angle: 90,
          spread: 40,
          origin: {
            x: randomInRange(0.1, 0.9),
            y: 0
          },
          colors: phaseColors,
          gravity: 0.5,
          scalar: 0.8,
          drift: randomInRange(-0.5, 0.5),
          ticks: 300
        });
      }, 100);
    }, 400);
  }, []);

  // Celebrazione completa
  const celebrate = useCallback((options: CelebrationOptions) => {
    const { phase } = options;
    
    // Lancia confetti
    launchConfetti(phase);
    
    // Riproduci suono
    playTransitionSound(phase);
  }, [launchConfetti, playTransitionSound]);

  return { celebrate };
};
