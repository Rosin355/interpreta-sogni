import { RainbowButton } from "@/components/ui/rainbow-button";
import { useNavigate } from "react-router-dom";
import { MysticGlowOrb } from "@/components/ui/MysticGlowOrb";
import { motion } from "framer-motion";

const dreamPatterns = ["Volare", "Cadere", "Inseguimento", "Perso", "Acqua", "Famiglia", "Infanzia", "Esame", "In Ritardo", "Denti"];

const ResearchSection = () => {
  const navigate = useNavigate();
  
  return (
    <section id="research" className="research-section relative overflow-hidden px-0 py-24">
      {/* Seamless gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-mystic-deep/40 to-background" />
      
      {/* Radial glow from center - softer */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] opacity-15"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--mystic-magenta) / 0.4) 0%, transparent 60%)",
        }}
      />
      
      {/* Central decorative orb with parallax */}
      <MysticGlowOrb 
        size="xl" 
        intensity="low" 
        className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        parallaxSpeed={0.1}
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          className="text-center mb-16 research-content"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground mystic-text section-title">
            Mappare l'Universo Onirico Insieme
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
            La nostra iniziativa globale di ricerca sui sogni mira a mappare i pattern onirici collettivi, comprendere i contesti emotivi 
            e creare un atlante completo del panorama onirico umano. Partecipando, contribuisci a una ricerca rivoluzionaria 
            su come sogniamo.
          </p>
          
          {/* Dream pattern tags with enhanced glow */}
          <motion.div 
            className="flex flex-wrap justify-center gap-3 mb-10 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            {dreamPatterns.map((pattern, index) => (
              <motion.span
                key={pattern}
                className="px-4 py-2 rounded-full text-sm font-medium bg-mystic-violet/20 border border-mystic-violet/40 text-foreground transition-all duration-300 cursor-default research-pattern hover:bg-mystic-magenta/30 hover:border-mystic-magenta/60 hover:shadow-[0_0_20px_hsl(var(--mystic-magenta)/0.4)]"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
              >
                {pattern}
              </motion.span>
            ))}
          </motion.div>
          
          <RainbowButton onClick={() => navigate('/explore')}>
            Esplora le Scoperte della Ricerca
          </RainbowButton>
        </motion.div>
      </div>
    </section>
  );
};

export default ResearchSection;
