import React from 'react';

interface CloudDividerProps {
  className?: string;
  flip?: boolean;
}

const CloudDivider: React.FC<CloudDividerProps> = ({ className = "", flip = false }) => {
  return (
    <div className={`absolute left-0 right-0 w-full overflow-hidden leading-none ${flip ? 'top-0 rotate-180' : 'bottom-0'} ${className}`}>
      <svg
        className="relative block w-full h-[80px] md:h-[120px]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--background))', stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--background))', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path
          d="M0,50 C150,80 350,0 600,50 C850,100 1050,20 1200,50 L1200,120 L0,120 Z"
          fill="url(#cloudGradient)"
          opacity="0.3"
        />
        <path
          d="M0,60 C200,100 400,20 600,60 C800,100 1000,40 1200,70 L1200,120 L0,120 Z"
          fill="url(#cloudGradient)"
          opacity="0.5"
        />
        <path
          d="M0,80 C300,110 500,50 700,80 C900,110 1100,70 1200,90 L1200,120 L0,120 Z"
          fill="hsl(var(--background))"
        />
      </svg>
    </div>
  );
};

export default CloudDivider;
