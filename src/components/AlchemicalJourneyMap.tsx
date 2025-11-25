import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type AlchemicalPhase, type PhaseDistribution } from "@/utils/alchemical-phases";
import { Info } from "lucide-react";

interface AlchemicalJourneyMapProps {
  currentPhase: AlchemicalPhase;
  distribution: PhaseDistribution;
  compact?: boolean;
}

export const AlchemicalJourneyMap = ({ 
  currentPhase, 
  distribution,
  compact = false 
}: AlchemicalJourneyMapProps) => {
  
  const phases = [
    {
      id: 'nigredo' as AlchemicalPhase,
      name: 'Nigredo',
      shortName: 'Opera al Nero',
      icon: '🌑',
      color: 'hsl(0, 0%, 15%)',
      bgGradient: 'from-gray-900 to-gray-800',
      position: 0,
      description: 'Fase della dissoluzione e dell\'ombra'
    },
    {
      id: 'albedo' as AlchemicalPhase,
      name: 'Albedo',
      shortName: 'Opera al Bianco',
      icon: '🌕',
      color: 'hsl(0, 0%, 95%)',
      bgGradient: 'from-gray-100 to-white',
      borderColor: 'border-gray-300',
      position: 1,
      description: 'Fase della purificazione e della chiarezza'
    },
    {
      id: 'rubedo' as AlchemicalPhase,
      name: 'Rubedo',
      shortName: 'Opera al Rosso',
      icon: '🔴',
      color: 'hsl(0, 70%, 50%)',
      bgGradient: 'from-red-500 to-amber-500',
      position: 2,
      description: 'Fase della realizzazione e dell\'integrazione'
    }
  ];

  const getCurrentPhaseIndex = () => {
    return phases.findIndex(p => p.id === currentPhase);
  };

  const getPhaseSize = (phaseId: AlchemicalPhase) => {
    const percentage = distribution[phaseId];
    const baseSize = compact ? 60 : 100;
    const maxSize = compact ? 100 : 160;
    const minSize = compact ? 50 : 80;
    
    // Scale between minSize and maxSize based on percentage
    return minSize + (percentage / 100) * (maxSize - minSize);
  };

  const getPhaseOpacity = (phaseId: AlchemicalPhase) => {
    return currentPhase === phaseId ? 1 : 0.6;
  };

  return (
    <TooltipProvider>
      <div className="w-full overflow-x-auto">
        {/* Horizontal Journey Map */}
        <div className="relative flex items-center justify-between gap-2 sm:gap-4 md:gap-8 px-2 sm:px-4 py-6 sm:py-8 min-w-[320px]">
          {/* Connection Lines */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-gray-900 via-gray-200 to-red-500 -translate-y-1/2 opacity-30 z-0" />
          
          {/* Phase Nodes */}
          {phases.map((phase, index) => {
            const size = getPhaseSize(phase.id);
            const isActive = currentPhase === phase.id;
            const percentage = distribution[phase.id];
            
            return (
              <Tooltip key={phase.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    className="relative flex flex-col items-center z-10 flex-1"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: getPhaseOpacity(phase.id), 
                      scale: isActive ? 1.1 : 1 
                    }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.1,
                      scale: { duration: 0.3 }
                    }}
                    whileHover={{ scale: isActive ? 1.15 : 1.05 }}
                  >
                    {/* Phase Circle */}
                    <motion.div
                      className={`
                        relative rounded-full bg-gradient-to-br ${phase.bgGradient}
                        ${phase.borderColor ? `border-4 ${phase.borderColor}` : ''}
                        flex items-center justify-center cursor-pointer
                        shadow-lg
                      `}
                      style={{ 
                        width: size, 
                        height: size,
                        boxShadow: isActive 
                          ? `0 0 30px ${phase.color}, 0 0 60px ${phase.color}40`
                          : `0 4px 12px rgba(0,0,0,0.15)`
                      }}
                      animate={{
                        boxShadow: isActive
                          ? [
                              `0 0 20px ${phase.color}, 0 0 40px ${phase.color}40`,
                              `0 0 30px ${phase.color}, 0 0 60px ${phase.color}40`,
                              `0 0 20px ${phase.color}, 0 0 40px ${phase.color}40`,
                            ]
                          : `0 4px 12px rgba(0,0,0,0.15)`,
                      }}
                      transition={{
                        boxShadow: {
                          duration: 2,
                          repeat: isActive ? Infinity : 0,
                          ease: "easeInOut"
                        }
                      }}
                    >
                      {/* Icon */}
                      <span 
                        className="text-3xl md:text-4xl"
                        style={{
                          filter: phase.id === 'albedo' ? 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' : 'none'
                        }}
                      >
                        {phase.icon}
                      </span>
                      
                      {/* Active Indicator */}
                      {isActive && (
                        <motion.div
                          className="absolute -top-3 -right-3"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <Badge 
                            variant="default" 
                            className="bg-primary text-primary-foreground shadow-md"
                          >
                            Qui
                          </Badge>
                        </motion.div>
                      )}
                      
                      {/* Percentage Badge */}
                      <motion.div
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 + 0.3 }}
                      >
                        <Badge 
                          variant="secondary" 
                          className="text-xs font-bold shadow-sm"
                        >
                          {percentage}%
                        </Badge>
                      </motion.div>
                    </motion.div>
                    
                    {/* Phase Name */}
                    {!compact && (
                      <motion.div
                        className="mt-3 sm:mt-4 text-center space-y-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 + 0.4 }}
                      >
                        <p className={`text-xs sm:text-sm font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          {phase.name}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                          {phase.shortName}
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{phase.icon}</span>
                      <p className="font-semibold">{phase.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {phase.description}
                    </p>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Badge variant="outline" className="text-xs">
                        {percentage}% dei tuoi sogni
                      </Badge>
                      {isActive && (
                        <Badge variant="default" className="text-xs">
                          Fase Corrente
                        </Badge>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Progress Indicator */}
        {!compact && (
          <motion.div
            className="mt-6 sm:mt-8 flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Info className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <p className="text-center">
              Il tuo percorso evolve con ogni sogno che registri
            </p>
          </motion.div>
        )}
        
        {/* Legend for Compact Mode */}
        {compact && (
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            {phases.map((phase) => (
              <div key={phase.id} className="flex items-center gap-1">
                <span>{phase.icon}</span>
                <span className={currentPhase === phase.id ? 'font-bold text-primary' : ''}>
                  {phase.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
