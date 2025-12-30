import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const initScrollAnimations = () => {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // Configure ScrollTrigger for better performance
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true,
  });

  // Hero section fade-in sequence
  gsap.from('.hero-content', {
    opacity: 0,
    y: 50,
    duration: 1.2,
    delay: 0.3,
    ease: 'power3.out'
  });
  
  gsap.from('.hero-buttons', {
    opacity: 0,
    y: 30,
    duration: 1,
    delay: 0.8,
    stagger: 0.15,
    ease: 'power2.out'
  });

  // Features section - batch animation for better performance
  ScrollTrigger.batch('.feature-card', {
    onEnter: (elements) => {
      gsap.from(elements, {
        opacity: 0,
        y: 60,
        scale: 0.97,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
      });
    },
    start: 'top 85%',
    once: true,
  });

  // Section titles - batch animation
  ScrollTrigger.batch('.section-title', {
    onEnter: (elements) => {
      gsap.from(elements, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
      });
    },
    start: 'top 90%',
    once: true,
  });

  // Research section - content reveal
  gsap.from('.research-content', {
    scrollTrigger: {
      trigger: '.research-section',
      start: 'top 80%',
      once: true,
    },
    opacity: 0,
    y: 40,
    duration: 0.8,
    ease: 'power2.out'
  });

  // Research patterns batch
  ScrollTrigger.batch('.research-pattern', {
    onEnter: (elements) => {
      gsap.from(elements, {
        opacity: 0,
        scale: 0.95,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
      });
    },
    start: 'top 85%',
    once: true,
  });

  // Experience section - simplified parallax
  const experienceMockup = document.querySelector('.experience-mockup');
  if (experienceMockup) {
    gsap.to(experienceMockup, {
      scrollTrigger: {
        trigger: '.experience-section',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 2,
      },
      y: -50,
      ease: 'none'
    });
  }

  // Experience content fade
  gsap.from('.experience-content', {
    scrollTrigger: {
      trigger: '.experience-section',
      start: 'top 85%',
      once: true,
    },
    opacity: 0,
    x: -30,
    duration: 0.8,
    ease: 'power2.out'
  });

  // CTA section - simplified entrance
  gsap.from('.cta-content', {
    scrollTrigger: {
      trigger: '.cta-section',
      start: 'top 85%',
      once: true,
    },
    opacity: 0,
    y: 30,
    duration: 0.8,
    ease: 'power2.out'
  });

  // Simplified parallax backgrounds
  const parallaxBgs = gsap.utils.toArray<HTMLElement>('.parallax-bg');
  if (parallaxBgs.length > 0) {
    parallaxBgs.forEach((bg) => {
      gsap.to(bg, {
        scrollTrigger: {
          trigger: bg.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 3,
        },
        y: -60,
        ease: 'none'
      });
    });
  }
};

export const cardHoverAnimation = (element: HTMLElement) => {
  gsap.to(element, {
    y: -6,
    boxShadow: '0 20px 40px -12px hsla(300, 100%, 70%, 0.2)',
    duration: 0.3,
    ease: 'power2.out'
  });
};

export const cardLeaveAnimation = (element: HTMLElement) => {
  gsap.to(element, {
    y: 0,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    duration: 0.3,
    ease: 'power2.out'
  });
};

export const buttonMagneticEffect = (button: HTMLElement, event: MouseEvent) => {
  const { left, top, width, height } = button.getBoundingClientRect();
  const centerX = left + width / 2;
  const centerY = top + height / 2;
  
  const deltaX = (event.clientX - centerX) * 0.12;
  const deltaY = (event.clientY - centerY) * 0.12;
  
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
    duration: 0.4,
    ease: 'power2.out'
  });
};
