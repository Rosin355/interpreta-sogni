"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import dreamAlchemistLogo from "@/assets/dreamalchemist_logo.png";

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
        <span className="h-[20px] flex items-center text-gray-300 text-sm font-medium whitespace-nowrap tracking-wide">
          {children}
        </span>
        <span className="h-[20px] flex items-center text-white text-sm font-medium whitespace-nowrap tracking-wide">
          {children}
        </span>
      </motion.div>
    </Link>
  );
};

export function MiniNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const shapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleMenu = () => {
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
    <Link to="/auth?mode=login" className="px-5 py-2 text-xs sm:text-sm border border-white/10 bg-white/5 text-gray-300 rounded-full hover:border-white/30 hover:text-white transition-all duration-300 w-full sm:w-auto text-center backdrop-blur-sm">
      Log In
    </Link>
  );

  const signupButtonElement = (
    <Link to="/auth?mode=signup" className="relative group w-full sm:w-auto">
       <div className="absolute inset-0 -m-1 rounded-full
                     hidden sm:block
                     bg-white
                     opacity-20 filter blur-md pointer-events-none
                     transition-all duration-300 ease-out
                     group-hover:opacity-40 group-hover:blur-lg"></div>
       <div className="relative z-10 px-5 py-2 text-xs sm:text-sm font-semibold text-black bg-white rounded-full hover:bg-gray-100 transition-all duration-300 w-full sm:w-auto text-center block">
         Inizia Ora
       </div>
    </Link>
  );

  return (
    <header className={cn(
      "fixed top-8 left-1/2 transform -translate-x-1/2 z-50",
      "flex flex-col items-center",
      "px-6 py-2.5 backdrop-blur-xl",
      headerShapeClass,
      "border border-white/10 bg-black/40",
      "w-[calc(100%-2rem)] sm:w-auto min-w-[500px]",
      "transition-all duration-500 ease-in-out shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    )}>

      <div className="flex items-center justify-between w-full gap-x-10">
        <Link to="/" className="flex items-center gap-4 flex-shrink-0 group">
           <img 
            src={dreamAlchemistLogo}
            alt="Dream Alchemist"
            className="w-16 h-16 object-contain transition-transform duration-500 group-hover:scale-105" 
           />
           <span className="hidden md:block font-editorial uppercase tracking-[0.2em] text-foreground text-sm whitespace-nowrap">
            DREAM ALCHEMIST
           </span>
        </Link>

        <nav className="hidden sm:flex items-center space-x-8">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-4">
          {loginButtonElement}
          {signupButtonElement}
        </div>

        <button className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-300 focus:outline-none" onClick={toggleMenu} aria-label={isOpen ? 'Close Menu' : 'Open Menu'}>
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
            <nav className="flex flex-col items-center space-y-6 py-8 text-lg w-full">
              {navLinksData.map((link) => (
                <Link key={link.href} to={link.href} onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white transition-colors w-full text-center font-medium">
                  {link.label}
                </Link>
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
