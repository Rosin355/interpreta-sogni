import { Badge } from "@/components/ui/badge";
import { Flame, Droplet, Moon } from "lucide-react";
import { AlchemicalPhase } from "@/utils/alchemical-phases";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AlchemicalBadgeProps {
  phase: AlchemicalPhase;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const phaseConfig = {
  nigredo: {
    label: "Nigredo",
    icon: Moon,
    className: "bg-gradient-to-r from-gray-900 to-black text-white border-gray-700 shadow-[0_0_15px_rgba(0,0,0,0.5)]",
    description: "Opera al Nero - Fase della dissoluzione e dell'ombra. Rappresenta sogni oscuri, difficili o di trasformazione profonda."
  },
  albedo: {
    label: "Albedo",
    icon: Droplet,
    className: "bg-gradient-to-r from-gray-100 to-white text-gray-900 border-gray-300 shadow-[0_0_15px_rgba(255,255,255,0.5)]",
    description: "Opera al Bianco - Fase della purificazione e chiarezza. Indica sogni di pulizia, serenità e consapevolezza crescente."
  },
  rubedo: {
    label: "Rubedo",
    icon: Flame,
    className: "bg-gradient-to-r from-red-600 to-amber-600 text-white border-amber-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]",
    description: "Opera al Rosso - Fase della realizzazione e integrazione. Simboleggia sogni di gioia, amore, creatività e compimento."
  }
};

export const AlchemicalBadge = ({ 
  phase, 
  size = "md", 
  showIcon = true,
  className = "" 
}: AlchemicalBadgeProps) => {
  const config = phaseConfig[phase];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`
              ${config.className} 
              ${sizeClasses[size]} 
              font-semibold 
              border-2 
              transition-all 
              duration-300 
              hover:scale-105 
              cursor-help
              ${className}
            `}
          >
            <div className="flex items-center gap-1.5">
              {showIcon && <Icon className={iconSizes[size]} />}
              <span>{config.label}</span>
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
