import { type AlchemicalPhase, type PhaseDistribution } from "@/utils/alchemical-phases";
import { AlchemicalPhaseTimeline } from "@/components/AlchemicalPhaseTimeline";

interface AlchemicalJourneyMapProps {
  currentPhase: AlchemicalPhase;
  distribution: PhaseDistribution;
  compact?: boolean;
}

export const AlchemicalJourneyMap = ({
  currentPhase,
  distribution,
  compact = false,
}: AlchemicalJourneyMapProps) => {
  return (
    <div className="w-full space-y-4">
      <AlchemicalPhaseTimeline
        currentPhase={currentPhase}
        distribution={distribution}
        compact={compact}
      />

      {!compact && (
        <p className="text-xs sm:text-sm text-muted-foreground">
          Il tuo percorso evolve con ogni sogno registrato, rendendo più chiara la fase che stai attraversando.
        </p>
      )}
    </div>
  );
};
