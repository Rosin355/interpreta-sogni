import { Badge } from "@/components/ui/badge";
import { Flame, Droplet, Moon } from "lucide-react";
import { AlchemicalPhase } from "@/utils/alchemical-phases";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
    className: "border-border bg-secondary text-secondary-foreground",
    description: "Opera al Nero - Fase della dissoluzione e dell'ombra. Rappresenta sogni oscuri, difficili o di trasformazione profonda.",
  },
  albedo: {
    label: "Albedo",
    icon: Droplet,
    className: "border-accent/30 bg-accent/10 text-accent",
    description: "Opera al Bianco - Fase della purificazione e chiarezza. Indica sogni di pulizia, serenità e consapevolezza crescente.",
  },
  rubedo: {
    label: "Rubedo",
    icon: Flame,
    className: "border-primary/30 bg-primary/10 text-primary",
    description: "Opera al Rosso - Fase della realizzazione e integrazione. Simboleggia sogni di gioia, amore, creatività e compimento.",
  },
};

export const AlchemicalBadge = ({
  phase,
  size = "md",
  showIcon = true,
  className = "",
}: AlchemicalBadgeProps) => {
  const config = phaseConfig[phase];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-[11px] px-2.5 py-1",
    md: "text-xs px-3 py-1.5",
    lg: "text-sm px-4 py-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              "cursor-help rounded-full border font-medium uppercase tracking-[0.16em] transition-colors",
              config.className,
              sizeClasses[size],
              className,
            )}
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
