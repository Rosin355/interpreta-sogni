import { Badge } from "@/components/ui/badge";
import { type AlchemicalPhase, type PhaseDistribution } from "@/utils/alchemical-phases";

interface AlchemicalJourneyMapProps {
  currentPhase: AlchemicalPhase;
  distribution: PhaseDistribution;
  compact?: boolean;
}

const phases: {
  id: AlchemicalPhase;
  name: string;
  icon: string;
  barColor: string;
  badgeClass: string;
}[] = [
  {
    id: 'nigredo',
    name: 'Nigredo',
    icon: '🌑',
    barColor: 'bg-gray-900',
    badgeClass: 'bg-gray-900 text-white border-gray-700',
  },
  {
    id: 'albedo',
    name: 'Albedo',
    icon: '🌕',
    barColor: 'bg-gray-300',
    badgeClass: 'bg-white text-gray-900 border-gray-300',
  },
  {
    id: 'rubedo',
    name: 'Rubedo',
    icon: '🔴',
    barColor: 'bg-red-500',
    badgeClass: 'bg-red-500 text-white border-red-400',
  },
];

export const AlchemicalJourneyMap = ({
  currentPhase,
  distribution,
  compact = false,
}: AlchemicalJourneyMapProps) => {
  return (
    <div className="w-full space-y-4">
      {/* Segmented Progress Bar */}
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className={`${phase.barColor} transition-all duration-500`}
            style={{ width: `${distribution[phase.id]}%` }}
          />
        ))}
      </div>

      {/* Phase Cards Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {phases.map((phase) => {
          const isActive = currentPhase === phase.id;
          const percentage = distribution[phase.id];

          return (
            <div
              key={phase.id}
              className={`
                flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-lg border text-center transition-all
                ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card'}
              `}
            >
              <span className="text-xl sm:text-2xl">{phase.icon}</span>
              <span className={`text-xs sm:text-sm font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                {phase.name}
              </span>
              <span className="text-lg sm:text-xl font-bold text-foreground">
                {percentage}%
              </span>
              {isActive && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  Fase attuale
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Info text (non-compact only) */}
      {!compact && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center">
          Il tuo percorso evolve con ogni sogno che registri
        </p>
      )}
    </div>
  );
};
