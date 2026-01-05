import { cn } from "@/lib/utils";

interface DramaticSkyProps {
  className?: string;
  variant?: "default" | "intense";
}

export const DramaticSky = ({ className, variant = "default" }: DramaticSkyProps) => {
  const isIntense = variant === "intense";
  
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)} aria-hidden="true">
      {/* Base gradient - deep black to dark magenta - seamless blend */}
      <div 
        className={cn(
          "absolute inset-0",
          isIntense 
            ? "bg-gradient-to-b from-transparent via-mystic-deep/60 to-transparent"
            : "bg-gradient-to-b from-transparent via-mystic-deep/30 to-transparent"
        )}
      />
      
      {/* Radial glow from center */}
      <div 
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[80%]",
          isIntense ? "opacity-30" : "opacity-20"
        )}
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--mystic-magenta) / 0.25) 0%, transparent 60%)",
        }}
      />
      
      {/* Subtle vertical gradient overlay for depth */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: "linear-gradient(180deg, transparent 0%, hsl(var(--mystic-violet) / 0.1) 50%, transparent 100%)",
        }}
      />
    </div>
  );
};

export default DramaticSky;
