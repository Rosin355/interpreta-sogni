import { cn } from "@/lib/utils";

interface MysticGlowOrbProps {
  size?: "sm" | "md" | "lg" | "xl";
  intensity?: "low" | "medium" | "high";
  className?: string;
}

const sizeClasses = {
  sm: "w-32 h-32",
  md: "w-48 h-48",
  lg: "w-72 h-72",
  xl: "w-96 h-96",
};

const intensityOpacity = {
  low: "opacity-30",
  medium: "opacity-50",
  high: "opacity-70",
};

export const MysticGlowOrb = ({
  size = "md",
  intensity = "medium",
  className,
}: MysticGlowOrbProps) => {
  return (
    <div
      className={cn(
        "absolute pointer-events-none",
        sizeClasses[size],
        intensityOpacity[intensity],
        className
      )}
      aria-hidden="true"
    >
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full mystic-orb-outer animate-orb-pulse" />
      
      {/* Middle glow ring */}
      <div className="absolute inset-[15%] rounded-full mystic-orb-middle animate-orb-pulse-delayed" />
      
      {/* Inner core */}
      <div className="absolute inset-[35%] rounded-full mystic-orb-core" />
      
      {/* Particle dots */}
      <div className="absolute inset-0">
        <div className="absolute top-[20%] left-[30%] w-1 h-1 rounded-full bg-mystic-magenta/60 blur-[1px]" />
        <div className="absolute top-[40%] right-[25%] w-1.5 h-1.5 rounded-full bg-mystic-violet/50 blur-[1px]" />
        <div className="absolute bottom-[30%] left-[40%] w-1 h-1 rounded-full bg-mystic-pink/40 blur-[1px]" />
        <div className="absolute top-[60%] left-[20%] w-0.5 h-0.5 rounded-full bg-white/30 blur-[0.5px]" />
        <div className="absolute bottom-[20%] right-[35%] w-1 h-1 rounded-full bg-mystic-magenta/50 blur-[1px]" />
      </div>
    </div>
  );
};

export default MysticGlowOrb;
