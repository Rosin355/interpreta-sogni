"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from "@/lib/utils";

const AnimatedNavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const defaultTextColor = 'text-gray-300';
  const hoverTextColor = 'text-white';
  const textSizeClass = 'text-sm font-medium';
  const heightClass = "h-6"; // 24px per riga

  return (
    <Link to={href} className={cn("group relative inline-block overflow-hidden", heightClass, textSizeClass)}>
      <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform group-hover:-translate-y-1/2">
        <span className={cn("flex items-center", heightClass, defaultTextColor)}>
          {children}
        </span>
        <span className={cn("flex items-center", heightClass, hoverTextColor)}>
          {children}
        </span>
      </div>
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

  const logoElement = (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <img src="/dreamalchemist_logo.png" alt="Dream Alchemist Logo" className="w-full h-full object-contain" />
    </div>
  );

  const navLinksData = [
    { label: 'Esplora', href: '/explore' },
    { label: 'Chi Siamo', href: '/about' },
  ];

  const loginButtonElement = (
    <Link to="/auth?mode=login" className="px-4 py-2 sm:px-3 text-xs sm:text-sm border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 rounded-full hover:border-white/50 hover:text-white transition-colors duration-200 w-full sm:w-auto text-center">
      Log In
    </Link>
  );

  const signupButtonElement = (
    <Link to="/auth?mode=signup" className="relative group w-full sm:w-auto">
       <div className="absolute inset-0 -m-2 rounded-full
                     hidden sm:block
                     bg-gray-100
                     opacity-40 filter blur-lg pointer-events-none
                     transition-all duration-300 ease-out
                     group-hover:opacity-60 group-hover:blur-xl group-hover:-m-3"></div>
       <div className="relative z-10 px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-all duration-200 w-full sm:w-auto text-center block">
         Inizia Ora
       </div>
    </Link>
  );

  return (
    <header className={cn(
      "fixed top-6 left-1/2 transform -translate-x-1/2 z-50",
      "flex flex-col items-center",
      "pl-6 pr-6 py-3 backdrop-blur-md",
      headerShapeClass,
      "border border-[#333] bg-[#1f1f1f57]",
      "w-[calc(100%-2rem)] sm:w-auto",
      "transition-[border-radius] duration-300 ease-in-out"
    )}>

      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
        <Link to="/" className="flex items-center gap-3">
           {logoElement}
           <span className="hidden md:block font-editorial uppercase tracking-[0.15em] text-white text-sm">DREAM ALCHEMIST</span>
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

        <button className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-300 focus:outline-none" onClick={toggleMenu} aria-label={isOpen ? 'Close Menu' : 'Open Menu'}>
          {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </div>

      <div className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                       ${isOpen ? 'max-h-[1000px] opacity-100 pt-4' : 'max-h-0 opacity-0 pt-0 pointer-events-none'}`}>
        <nav className="flex flex-col items-center space-y-4 text-base w-full">
          {navLinksData.map((link) => (
            <Link key={link.href} to={link.href} onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white transition-colors w-full text-center">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full">
          {loginButtonElement}
          {signupButtonElement}
        </div>
      </div>
    </header>
  );
}
