import { motion, AnimatePresence } from "framer-motion";
import { AlchemicalPhase } from "@/utils/alchemical-phases";
import { Sparkles, Flame, Droplet, Moon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AlchemicalTransitionCelebrationProps {
  show: boolean;
  fromPhase: AlchemicalPhase;
  toPhase: AlchemicalPhase;
  onComplete: () => void;
}

const phaseIcons = {
  nigredo: Moon,
  albedo: Droplet,
  rubedo: Flame
};

const phaseColors = {
  nigredo: {
    gradient: "from-gray-900 via-gray-800 to-black",
    glow: "rgba(0, 0, 0, 0.8)",
    text: "text-white"
  },
  albedo: {
    gradient: "from-gray-100 via-white to-gray-50",
    glow: "rgba(255, 255, 255, 0.8)",
    text: "text-gray-900"
  },
  rubedo: {
    gradient: "from-red-500 via-amber-500 to-red-600",
    glow: "rgba(239, 68, 68, 0.8)",
    text: "text-white"
  }
};

const phaseNames = {
  nigredo: "Nigredo",
  albedo: "Albedo",
  rubedo: "Rubedo"
};

export const AlchemicalTransitionCelebration = ({
  show,
  fromPhase,
  toPhase,
  onComplete
}: AlchemicalTransitionCelebrationProps) => {
  const FromIcon = phaseIcons[fromPhase];
  const ToIcon = phaseIcons[toPhase];
  const toPhaseColor = phaseColors[toPhase];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onComplete}
        >
          {/* Effetti luminosi di sfondo */}
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: Math.random() * 100 + 50,
                  height: Math.random() * 100 + 50,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: `radial-gradient(circle, ${toPhaseColor.glow} 0%, transparent 70%)`,
                  filter: "blur(20px)"
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.5, 1],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.1,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              />
            ))}
          </motion.div>

          {/* Card centrale con animazione */}
          <motion.div
            initial={{ scale: 0, rotateY: -180 }}
            animate={{ scale: 1, rotateY: 0 }}
            exit={{ scale: 0, rotateY: 180 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              duration: 0.8 
            }}
            className="relative z-10 max-w-md mx-4"
          >
            <Card className={`border-4 shadow-2xl bg-gradient-to-br ${toPhaseColor.gradient} overflow-hidden`}>
              <CardContent className="pt-8 pb-6 px-6 text-center relative">
                {/* Sparkles animati */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        x: Math.cos((i * 30 * Math.PI) / 180) * 150,
                        y: Math.sin((i * 30 * Math.PI) / 180) * 150,
                      }}
                      transition={{
                        duration: 1.5,
                        delay: i * 0.05,
                        repeat: Infinity,
                        repeatDelay: 1
                      }}
                    >
                      <Sparkles className={`h-6 w-6 ${toPhaseColor.text}`} />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Contenuto principale */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative z-10"
                >
                  <Badge 
                    variant="secondary" 
                    className="mb-4 text-xs font-bold uppercase tracking-wider"
                  >
                    🎉 Transizione Completata!
                  </Badge>

                  <h2 className={`text-3xl font-bold mb-4 ${toPhaseColor.text}`}>
                    Nuova Fase Alchemica
                  </h2>

                  {/* Transizione visuale */}
                  <div className="flex items-center justify-center gap-4 my-6">
                    <motion.div
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 0.8, opacity: 0.4 }}
                      transition={{ duration: 0.5 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-muted/20 backdrop-blur-sm flex items-center justify-center mb-2">
                        <FromIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground/60">
                        {phaseNames[fromPhase]}
                      </span>
                    </motion.div>

                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      <span className={`text-2xl ${toPhaseColor.text}`}>→</span>
                    </motion.div>

                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        delay: 0.7, 
                        type: "spring",
                        stiffness: 300,
                        damping: 15
                      }}
                      className="flex flex-col items-center"
                    >
                      <motion.div
                        className="w-20 h-20 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center mb-2 border-4 border-background/50"
                        animate={{
                          boxShadow: [
                            `0 0 20px ${toPhaseColor.glow}`,
                            `0 0 40px ${toPhaseColor.glow}`,
                            `0 0 20px ${toPhaseColor.glow}`
                          ]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity
                        }}
                      >
                        <ToIcon className={`h-10 w-10 ${toPhaseColor.text}`} />
                      </motion.div>
                      <span className={`text-sm font-bold ${toPhaseColor.text}`}>
                        {phaseNames[toPhase]}
                      </span>
                    </motion.div>
                  </div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className={`text-sm ${toPhaseColor.text} opacity-90`}
                  >
                    Hai raggiunto una nuova fase del tuo percorso di trasformazione interiore!
                  </motion.p>

                  <motion.button
                    onClick={onComplete}
                    className="mt-6 px-6 py-2 bg-background/20 backdrop-blur-sm rounded-full text-sm font-medium hover:bg-background/30 transition-colors border-2 border-background/30"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Continua
                  </motion.button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
