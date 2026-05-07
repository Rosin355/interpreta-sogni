"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import dreamAlchemistLogo from "@/assets/dreamalchemist_logo.png";
import { prefetchRoute, startRoutePrefetch } from "@/utils/route-prefetch";

const AnimatedNavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  return (
    <Link 
      to={href} 
      className="group relative h-[20px] overflow-hidden flex flex-col items-center"
    >
      <motion.div
        className="flex flex-col items-center"
        initial={false}
        whileHover={{ y: -20 }}
        transition={{ 
          duration: 0.4,
          ease: [0.23, 1, 0.32, 1]
        }}
      >
        <span className="h-[20px] flex items-center text-gray-300 text-sm font-bodoni-heading whitespace-nowrap tracking-wide">
          {children}
        </span>
        <span className="h-[20px] flex items-center text-white text-sm font-bodoni-heading whitespace-nowrap tracking-wide">
          {children}
        </span>
      </motion.div>
    </Link>
  );
};

export function MiniNavbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const shapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const goTo = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(href);
    setIsOpen(false);
  };

  const toggleMenu = () => {
    startRoutePrefetch(true);
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass('rounded-xl');
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass('rounded-full');
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const navLinksData = [
    { label: 'Esplora', href: '/explore' },
    { label: 'Chi Siamo', href: '/about' },
  ];

  const loginButtonElement = (
    <Link to="/auth?mode=login" onPointerDown={() => prefetchRoute("/auth")} onFocus={() => prefetchRoute("/auth")} className="relative flex min-h-[48px] w-full items-center justify-center px-4 py-2 sm:min-h-0 sm:w-auto sm:px-3 text-xs sm:text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white transition-colors duration-200 text-center before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:border before:border-primary/25 before:bg-primary/5 before:content-[''] sm:before:hidden">
      Log In
    </Link>
  );

  const signupButtonElement = (
    <div className="relative group w-full sm:w-auto">
       <div className="absolute inset-0 -m-2 rounded-full
                     hidden sm:block
                     bg-gray-100
                     opacity-40 filter blur-lg pointer-events-none
                     transition-all duration-300 ease-out
                     group-hover:opacity-60 group-hover:blur-xl group-hover:-m-3"></div>
       <Link to="/auth?mode=signup" onPointerDown={() => prefetchRoute("/auth")} onFocus={() => prefetchRoute("/auth")} className="relative z-10 flex min-h-[48px] w-full items-center justify-center px-4 py-2 sm:min-h-0 sm:w-auto sm:px-3 text-xs sm:text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-all duration-200 text-center before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:border before:border-primary/25 before:bg-primary/10 before:content-[''] sm:before:hidden">
         Inizia Ora
       </Link>
    </div>
  );

  return (
    <header className={cn(
      "fixed top-6 left-1/2 transform -translate-x-1/2 z-50",
      "flex flex-col items-center",
      "pl-6 pr-6 py-3 backdrop-blur-sm",
      headerShapeClass,
      "border border-[#333] bg-[#1f1f1f57]",
      "w-[calc(100%-2rem)] sm:w-auto",
      "transition-[border-radius] duration-0 ease-in-out"
    )}>

      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
        <Link to="/" className="flex items-center flex-shrink-0 group">
           <img 
            src={dreamAlchemistLogo}
            alt="Dream Alchemist"
            className="w-10 h-10 object-contain transition-transform duration-500 group-hover:scale-105" 
           />
        </Link>

        <nav className="hidden sm:flex items-center space-x-4 sm:space-x-6 text-sm">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          {loginButtonElement}
          {signupButtonElement}
        </div>

        <button className="sm:hidden -mr-2 flex min-h-11 min-w-11 items-center justify-center text-gray-300 focus:outline-none" onClick={toggleMenu} aria-label={isOpen ? 'Close Menu' : 'Open Menu'}>
          {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sm:hidden flex flex-col items-center w-full overflow-hidden"
          >
            <nav className="flex flex-col items-stretch gap-3 py-8 text-lg w-full" data-touch-debug="menu-mobile-pubblico">
              {navLinksData.map((link) => (
                <button type="button" key={link.href} onPointerDown={() => prefetchRoute(link.href)} onFocus={() => prefetchRoute(link.href)} onClick={goTo(link.href)} className="relative flex min-h-[64px] w-full items-center justify-center rounded-xl px-4 text-center text-gray-300 hover:text-white active:text-white active:bg-white/10 transition-colors font-bodoni-heading tracking-wide touch-manipulation">
                  <span>{link.label}</span>
                </button>
              ))}
              <div className="flex flex-col items-center space-y-4 mt-4 w-full px-4">
                {loginButtonElement}
                {signupButtonElement}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
