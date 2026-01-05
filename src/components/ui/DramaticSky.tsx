import { cn } from "@/lib/utils";

interface DramaticSkyProps {
  className?: string;
  variant?: "default" | "intense";
}

export const DramaticSky = ({ className, variant = "default" }: DramaticSkyProps) => {
  const isIntense = variant === "intense";
  
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)} aria-hidden="true">
      {/* Base gradient - deep black to dark magenta */}
      <div 
        className={cn(
          "absolute inset-0",
          isIntense 
            ? "bg-gradient-to-b from-black via-mystic-deep/80 to-black"
            : "bg-gradient-to-b from-background via-mystic-deep/40 to-background"
        )}
      />
      
      {/* Radial glow from center-top */}
      <div 
        className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[60%]",
          isIntense ? "opacity-40" : "opacity-25"
        )}
        style={{
          background: "radial-gradient(ellipse at center top, hsl(var(--mystic-magenta) / 0.3) 0%, transparent 70%)",
        }}
      />
      
      {/* Light rays */}
      <div className="absolute inset-0">
        {/* Left ray */}
        <div 
          className="absolute top-0 left-[20%] w-px h-[60%] light-ray"
          style={{ transform: "rotate(-15deg)", transformOrigin: "top" }}
        />
        {/* Center-left ray */}
        <div 
          className="absolute top-0 left-[40%] w-[2px] h-[70%] light-ray opacity-60"
          style={{ transform: "rotate(-5deg)", transformOrigin: "top" }}
        />
        {/* Center ray */}
        <div 
          className="absolute top-0 left-1/2 w-[3px] h-[80%] light-ray-intense"
          style={{ transform: "translateX(-50%)" }}
        />
        {/* Center-right ray */}
        <div 
          className="absolute top-0 right-[40%] w-[2px] h-[70%] light-ray opacity-60"
          style={{ transform: "rotate(5deg)", transformOrigin: "top" }}
        />
        {/* Right ray */}
        <div 
          className="absolute top-0 right-[20%] w-px h-[60%] light-ray"
          style={{ transform: "rotate(15deg)", transformOrigin: "top" }}
        />
      </div>
      
      {/* Fog/cloud layers */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 h-[40%]",
          isIntense ? "opacity-30" : "opacity-20"
        )}
        style={{
          background: "linear-gradient(to top, hsl(var(--mystic-violet) / 0.2) 0%, transparent 100%)",
        }}
      />
      
      {/* Horizontal mist band */}
      <div 
        className="absolute top-[30%] left-0 right-0 h-[20%] opacity-15"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(var(--mystic-magenta) / 0.15) 50%, transparent 100%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
};

export default DramaticSky;
