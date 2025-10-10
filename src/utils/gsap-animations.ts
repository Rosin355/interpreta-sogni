import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const initScrollAnimations = () => {
  // Hero section fade-in sequence
  gsap.from('.hero-content', {
    opacity: 0,
    y: 50,
    duration: 1,
    delay: 0.5,
    ease: 'power3.out'
  });
  
  gsap.from('.hero-buttons', {
    opacity: 0,
    y: 30,
    duration: 0.8,
    delay: 1,
    stagger: 0.2,
    ease: 'power2.out'
  });

  // Features section stagger animation
  gsap.from('.feature-card', {
    scrollTrigger: {
      trigger: '.features-section',
      start: 'top 80%',
      end: 'bottom 20%',
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    y: 60,
    scale: 0.95,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out'
  });

  // Research section animation
  gsap.from('.research-content', {
    scrollTrigger: {
      trigger: '.research-section',
      start: 'top 70%',
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    y: 40,
    duration: 1,
    ease: 'power2.out'
  });

  // Experience section parallax
  gsap.to('.experience-mockup', {
    scrollTrigger: {
      trigger: '.experience-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1
    },
    y: -50,
    ease: 'none'
  });

  // CTA section dramatic entrance
  gsap.from('.cta-content', {
    scrollTrigger: {
      trigger: '.cta-section',
      start: 'top 75%',
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    scale: 0.9,
    duration: 1,
    ease: 'back.out(1.7)'
  });

  // Floating animation for cards
  gsap.to('.float-element', {
    y: -20,
    duration: 3,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    stagger: {
      each: 0.5,
      from: 'random'
    }
  });
};

export const cardHoverAnimation = (element: HTMLElement) => {
  gsap.to(element, {
    y: -10,
    boxShadow: '0 20px 60px rgba(255, 107, 157, 0.3)',
    duration: 0.3,
    ease: 'power2.out'
  });
};

export const cardLeaveAnimation = (element: HTMLElement) => {
  gsap.to(element, {
    y: 0,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    duration: 0.3,
    ease: 'power2.out'
  });
};

export const buttonMagneticEffect = (button: HTMLElement, event: MouseEvent) => {
  const { left, top, width, height } = button.getBoundingClientRect();
  const centerX = left + width / 2;
  const centerY = top + height / 2;
  
  const deltaX = (event.clientX - centerX) * 0.2;
  const deltaY = (event.clientY - centerY) * 0.2;
  
  gsap.to(button, {
    x: deltaX,
    y: deltaY,
    duration: 0.3,
    ease: 'power2.out'
  });
};

export const buttonResetEffect = (button: HTMLElement) => {
  gsap.to(button, {
    x: 0,
    y: 0,
    duration: 0.5,
    ease: 'elastic.out(1, 0.5)'
  });
};
