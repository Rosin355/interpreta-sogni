import React from 'react';

interface CloudDividerProps {
  className?: string;
  flip?: boolean;
  variant?: 'default' | 'mystic';
}

const CloudDivider: React.FC<CloudDividerProps> = ({ 
  className = "", 
  flip = false,
  variant = 'mystic'
}) => {
  const isMystic = variant === 'mystic';
  
  return (
    <div className={`absolute left-0 right-0 w-full overflow-hidden leading-none ${flip ? 'top-0 rotate-180' : 'bottom-0'} ${className}`}>
      <svg
        className="relative block w-full h-[80px] md:h-[120px]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <defs>
          {isMystic ? (
            <>
              <linearGradient id="mysticCloudGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: 'hsl(280 70% 45% / 0.3)', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: 'hsl(320 80% 50% / 0.2)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'hsl(280 70% 45% / 0.3)', stopOpacity: 1 }} />
              </linearGradient>
              <linearGradient id="mysticCloudGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'hsl(var(--background))', stopOpacity: 0 }} />
                <stop offset="100%" style={{ stopColor: 'hsl(var(--background))', stopOpacity: 1 }} />
              </linearGradient>
            </>
          ) : (
            <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--background))', stopOpacity: 0 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--background))', stopOpacity: 1 }} />
            </linearGradient>
          )}
        </defs>
        
        {isMystic ? (
          <>
            {/* Mystic gradient layer */}
            <path
              d="M0,50 C150,80 350,0 600,50 C850,100 1050,20 1200,50 L1200,120 L0,120 Z"
              fill="url(#mysticCloudGradient)"
              opacity="0.5"
            />
            {/* Fade to background layer */}
            <path
              d="M0,60 C200,100 400,20 600,60 C800,100 1000,40 1200,70 L1200,120 L0,120 Z"
              fill="url(#mysticCloudGradient2)"
              opacity="0.6"
            />
            {/* Solid background layer */}
            <path
              d="M0,80 C300,110 500,50 700,80 C900,110 1100,70 1200,90 L1200,120 L0,120 Z"
              fill="hsl(var(--background))"
            />
            {/* Star dots */}
            <circle cx="150" cy="40" r="1" fill="hsl(330 100% 90%)" opacity="0.8" />
            <circle cx="400" cy="25" r="1.5" fill="hsl(280 100% 85%)" opacity="0.7" />
            <circle cx="700" cy="35" r="1" fill="hsl(320 100% 80%)" opacity="0.9" />
            <circle cx="950" cy="45" r="1.2" fill="hsl(300 100% 90%)" opacity="0.6" />
            <circle cx="1100" cy="30" r="0.8" fill="hsl(270 100% 85%)" opacity="0.8" />
          </>
        ) : (
          <>
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
          </>
        )}
      </svg>
    </div>
  );
};

export default CloudDivider;
