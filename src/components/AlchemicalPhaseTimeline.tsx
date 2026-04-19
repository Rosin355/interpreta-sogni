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
    glowClass: string;
  }
> = {
  nigredo: {
    accentClass: "text-foreground",
    lineClass: "from-border via-border to-border/0",
    markerClass: "border-foreground/30 bg-card text-foreground",
    badgeClass: "border-border bg-secondary text-secondary-foreground",
    surfaceClass: "bg-card/70 border-border",
    glowClass: "bg-foreground/12",
  },
  albedo: {
    accentClass: "text-accent",
    lineClass: "from-accent/50 via-accent/20 to-accent/0",
    markerClass: "border-accent/30 bg-accent/10 text-accent",
    badgeClass: "border-accent/30 bg-accent/10 text-accent",
    surfaceClass: "bg-accent/5 border-accent/20",
    glowClass: "bg-accent/10",
  },
  rubedo: {
    accentClass: "text-primary",
    lineClass: "from-primary/50 via-primary/20 to-primary/0",
    markerClass: "border-primary/30 bg-primary/10 text-primary",
    badgeClass: "border-primary/30 bg-primary/10 text-primary",
    surfaceClass: "bg-primary/5 border-primary/20",
    glowClass: "bg-primary/10",
  },
};

export const AlchemicalPhaseTimeline = ({
  currentPhase,
  distribution,
  compact = false,
}: AlchemicalPhaseTimelineProps) => {
  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {phaseOrder.map((phaseId, index) => {
        const phase = alchemicalPhases[phaseId];
        const percentage = distribution[phaseId];
        const isActive = currentPhase === phaseId;
        const styles = phaseStyles[phaseId];

        return (
          <div
            key={phaseId}
            className={cn(
              "grid grid-cols-[72px_1fr] gap-4 sm:grid-cols-[88px_1fr] sm:gap-6",
              compact && "grid-cols-[64px_1fr]",
            )}
          >
            <div className="relative flex flex-col items-center">
              <div className={cn("absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b", styles.lineClass)} />
              <div className={cn("absolute left-1/2 top-12 h-[calc(100%-3rem)] w-10 -translate-x-1/2 rounded-full blur-2xl", styles.glowClass)} />

              <div
                className={cn(
                  "relative z-10 flex h-14 w-14 items-center justify-center rounded-full border text-sm font-semibold tracking-[0.26em] backdrop-blur-sm",
                  styles.markerClass,
                  isActive && "shadow-[0_0_0_1px_hsl(var(--ring)/0.25),0_0_36px_hsl(var(--ring)/0.18)]",
                  compact && "h-12 w-12",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="relative z-10 mt-3 flex flex-col items-center gap-2">
                <span className="text-lg" aria-hidden="true">
                  ✦
                </span>
                <div className={cn("h-2 w-2 rounded-full", isActive ? styles.accentClass.replace("text-", "bg-") : "bg-muted-foreground/30")} />
              </div>

              {index < phaseOrder.length - 1 && (
                <div className="relative z-10 mt-4 flex flex-col items-center gap-3">
                  <span className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground/70">
                    ∴
                  </span>
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-px w-4 bg-border/70" />
                    <span className="text-xs text-muted-foreground/70">✦</span>
                    <span className="h-px w-4 bg-border/70" />
                  </div>
                </div>
              )}
            </div>

            <Card
              className={cn(
                "relative overflow-hidden border transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-border/60",
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
                        <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
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
                      {formatPercentage(percentage)}%
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
