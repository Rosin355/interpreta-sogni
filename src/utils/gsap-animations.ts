import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const initScrollAnimations = () => {
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

  // Features section - smooth reveal with stagger
  gsap.from('.feature-card', {
    scrollTrigger: {
      trigger: '.features-section',
      start: 'top 85%',
      end: 'center center',
      toggleActions: 'play none none reverse',
      scrub: false
    },
    opacity: 0,
    y: 80,
    scale: 0.95,
    duration: 1,
    stagger: {
      each: 0.12,
      ease: 'power2.out'
    },
    ease: 'power3.out'
  });

  // Section titles - elegant fade up
  gsap.utils.toArray<HTMLElement>('.section-title').forEach((title) => {
    gsap.from(title, {
      scrollTrigger: {
        trigger: title,
        start: 'top 90%',
        toggleActions: 'play none none reverse'
      },
      opacity: 0,
      y: 40,
      duration: 1,
      ease: 'power2.out'
    });
  });

  // Research section - content reveal
  gsap.from('.research-content', {
    scrollTrigger: {
      trigger: '.research-section',
      start: 'top 75%',
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    y: 60,
    duration: 1.2,
    ease: 'power2.out'
  });

  // Research patterns stagger
  gsap.from('.research-pattern', {
    scrollTrigger: {
      trigger: '.research-section',
      start: 'top 70%',
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    scale: 0.9,
    duration: 0.8,
    stagger: 0.1,
    ease: 'back.out(1.4)'
  });

  // Experience section - parallax mockup
  gsap.to('.experience-mockup', {
    scrollTrigger: {
      trigger: '.experience-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.5
    },
    y: -80,
    ease: 'none'
  });

  // Experience content fade
  gsap.from('.experience-content', {
    scrollTrigger: {
      trigger: '.experience-section',
      start: 'top 80%',
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    x: -50,
    duration: 1,
    ease: 'power2.out'
  });

  // CTA section - dramatic scale entrance
  gsap.from('.cta-content', {
    scrollTrigger: {
      trigger: '.cta-section',
      start: 'top 80%',
      toggleActions: 'play none none reverse'
    },
    opacity: 0,
    scale: 0.92,
    y: 40,
    duration: 1.2,
    ease: 'power3.out'
  });

  // Floating animation for decorative elements
  gsap.to('.float-element', {
    y: -15,
    duration: 4,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    stagger: {
      each: 0.8,
      from: 'random'
    }
  });

  // Parallax backgrounds
  gsap.utils.toArray<HTMLElement>('.parallax-bg').forEach((bg) => {
    gsap.to(bg, {
      scrollTrigger: {
        trigger: bg.parentElement,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 2
      },
      y: -100,
      ease: 'none'
    });
  });

  // Smooth section transitions - fade between sections
  gsap.utils.toArray<HTMLElement>('section').forEach((section, index) => {
    if (index === 0) return; // Skip hero section
    
    gsap.from(section, {
      scrollTrigger: {
        trigger: section,
        start: 'top 95%',
        end: 'top 60%',
        scrub: 1,
        toggleActions: 'play none none reverse'
      },
      opacity: 0.3,
      ease: 'power1.out'
    });
  });

  // Glowing stars animation
  gsap.to('.glowing-star', {
    scale: 1.2,
    opacity: 0.8,
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    stagger: {
      each: 0.5,
      from: 'random'
    }
  });

  // Nebula drift animation
  gsap.to('.nebula-overlay', {
    backgroundPosition: '100% 100%',
    duration: 30,
    repeat: -1,
    yoyo: true,
    ease: 'none'
  });
};

export const cardHoverAnimation = (element: HTMLElement) => {
  gsap.to(element, {
    y: -8,
    boxShadow: '0 25px 50px -12px hsla(300, 100%, 70%, 0.25)',
    duration: 0.4,
    ease: 'power2.out'
  });
};

export const cardLeaveAnimation = (element: HTMLElement) => {
  gsap.to(element, {
    y: 0,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    duration: 0.4,
    ease: 'power2.out'
  });
};

export const buttonMagneticEffect = (button: HTMLElement, event: MouseEvent) => {
  const { left, top, width, height } = button.getBoundingClientRect();
  const centerX = left + width / 2;
  const centerY = top + height / 2;
  
  const deltaX = (event.clientX - centerX) * 0.15;
  const deltaY = (event.clientY - centerY) * 0.15;
  
  gsap.to(button, {
    x: deltaX,
    y: deltaY,
    duration: 0.4,
    ease: 'power2.out'
  });
};

export const buttonResetEffect = (button: HTMLElement) => {
  gsap.to(button, {
    x: 0,
    y: 0,
    duration: 0.6,
    ease: 'elastic.out(1, 0.4)'
  });
};
