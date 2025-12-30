import { NebulaOverlay } from "@/components/ui/NebulaOverlay";
import { GlowingStar } from "@/components/ui/GlowingStar";
import { motion } from "framer-motion";

const ExperienceSection = () => {
  return (
    <section className="py-24 relative overflow-hidden experience-section">
      {/* Mystic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-mystic-deep/30 to-background" />
      <NebulaOverlay intensity="light" />
      
      {/* Decorative stars */}
      <GlowingStar 
        size="md" 
        color="purple" 
        className="absolute top-24 right-[25%] opacity-40 hidden lg:block" 
      />
      <GlowingStar 
        size="sm" 
        color="pink" 
        className="absolute bottom-32 left-[10%] opacity-30 hidden md:block" 
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground mystic-text">
            Prova Dream's Alchemist
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Documenta, analizza e condividi i tuoi sogni con la nostra interfaccia intuitiva
          </p>
        </motion.div>
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left side - App Interface Preview */}
          <motion.div 
            className="relative experience-mockup"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="mystic-card rounded-3xl p-8 shadow-2xl">
              <div className="bg-mystic-deep/50 rounded-2xl p-6 mb-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Dream's Alchemist - I Miei Sogni</h3>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-mystic-magenta/60" />
                    <div className="w-3 h-3 rounded-full bg-mystic-violet/60" />
                    <div className="w-3 h-3 rounded-full bg-mystic-pink/60" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <motion.div 
                    className="bg-gradient-to-r from-mystic-violet/30 to-mystic-magenta/20 rounded-xl p-4 border border-mystic-violet/20"
                    whileHover={{ scale: 1.02, borderColor: 'hsl(var(--mystic-magenta) / 0.4)' }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-mystic-violet/40 rounded-full flex items-center justify-center">
                        <span className="text-sm">🌊</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Viaggio nell'Oceano</h4>
                        <p className="text-sm text-muted-foreground">Nuotando con i delfini in acqua cristallina...</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-gradient-to-r from-mystic-pink/20 to-mystic-violet/20 rounded-xl p-4 border border-mystic-pink/20"
                    whileHover={{ scale: 1.02, borderColor: 'hsl(var(--mystic-pink) / 0.4)' }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-mystic-pink/40 rounded-full flex items-center justify-center">
                        <span className="text-sm">🌳</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Avventura nella Foresta</h4>
                        <p className="text-sm text-muted-foreground">Camminando attraverso una foresta incantata...</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-gradient-to-r from-mystic-magenta/25 to-mystic-glow/15 rounded-xl p-4 border border-mystic-magenta/20"
                    whileHover={{ scale: 1.02, borderColor: 'hsl(var(--mystic-glow) / 0.4)' }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-mystic-magenta/40 rounded-full flex items-center justify-center">
                        <span className="text-sm">✨</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Sogno di Volo</h4>
                        <p className="text-sm text-muted-foreground">Volteggiando sopra le nuvole in completa libertà...</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Right side - Features */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6">
              {[
                {
                  title: "Diario dei Sogni Dettagliato",
                  description: "Registra ogni dettaglio dei tuoi sogni con etichettatura emotiva, riconoscimento delle persone e formattazione ricca del contenuto."
                },
                {
                  title: "Analisi dei Pattern",
                  description: "Identifica temi, emozioni e pattern ricorrenti nella tua storia onirica con analisi visive."
                },
                {
                  title: "Condivisione dei Sogni",
                  description: "Condividi i sogni selettivamente con amici o cerchie oniriche per ottenere nuove prospettive."
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-2xl font-bold text-foreground mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
