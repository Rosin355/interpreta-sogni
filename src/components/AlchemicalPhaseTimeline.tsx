import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  alchemicalPhases,
  type AlchemicalPhase,
  type PhaseDistribution,
} from "@/utils/alchemical-phases";

interface AlchemicalPhaseTimelineProps {
  currentPhase: AlchemicalPhase;
  distribution: PhaseDistribution;
  compact?: boolean;
}

const phaseOrder: AlchemicalPhase[] = ["nigredo", "albedo", "rubedo"];

const phaseStyles: Record<
  AlchemicalPhase,
  {
    accentClass: string;
    lineClass: string;
    markerClass: string;
    badgeClass: string;
    surfaceClass: string;
  }
> = {
  nigredo: {
    accentClass: "text-foreground",
    lineClass: "bg-border",
    markerClass: "border-foreground/30 bg-card text-foreground",
    badgeClass: "border-border bg-secondary text-secondary-foreground",
    surfaceClass: "bg-card/70 border-border",
  },
  albedo: {
    accentClass: "text-accent",
    lineClass: "bg-accent/30",
    markerClass: "border-accent/30 bg-accent/10 text-accent",
    badgeClass: "border-accent/30 bg-accent/10 text-accent",
    surfaceClass: "bg-accent/5 border-accent/20",
  },
  rubedo: {
    accentClass: "text-primary",
    lineClass: "bg-primary/30",
    markerClass: "border-primary/30 bg-primary/10 text-primary",
    badgeClass: "border-primary/30 bg-primary/10 text-primary",
    surfaceClass: "bg-primary/5 border-primary/20",
  },
};

export const AlchemicalPhaseTimeline = ({
  currentPhase,
  distribution,
  compact = false,
}: AlchemicalPhaseTimelineProps) => {
  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      {phaseOrder.map((phaseId, index) => {
        const phase = alchemicalPhases[phaseId];
        const percentage = distribution[phaseId];
        const isActive = currentPhase === phaseId;
        const styles = phaseStyles[phaseId];

        return (
          <div key={phaseId} className="grid grid-cols-[auto_1fr] gap-4 sm:gap-6">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold tracking-[0.24em]",
                  styles.markerClass,
                  isActive && "shadow-[0_0_0_1px_hsl(var(--ring)/0.25)]",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              {index < phaseOrder.length - 1 && (
                <div className={cn("mt-2 h-full min-h-16 w-px", styles.lineClass)} />
              )}
            </div>

            <Card
              className={cn(
                "overflow-hidden border transition-colors",
                styles.surfaceClass,
                isActive && "ring-1 ring-ring/40",
              )}
            >
              <CardContent className={cn("p-5", compact && "p-4")}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">
                        {phase.icon}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold tracking-tight">{phase.name}</h3>
                          {isActive && (
                            <Badge variant="outline" className={styles.badgeClass}>
                              Fase attuale
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                          {phase.latinName}
                        </p>
                      </div>
                    </div>

                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      {phase.psychologicalMeaning}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Presenza
                    </p>
                    <p className={cn("text-4xl font-semibold tracking-tight", styles.accentClass)}>
                      {percentage}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};
