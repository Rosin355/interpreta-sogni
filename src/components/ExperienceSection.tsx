import { motion } from "framer-motion";

const ExperienceSection = () => {
  return (
    <section className="py-24 relative overflow-hidden experience-section">
      {/* Fog transition from Research */}
      <div 
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-[2]"
        style={{
          background: "linear-gradient(to bottom, hsl(280 60% 10% / 0.95) 0%, hsl(280 50% 12% / 0.5) 50%, transparent 100%)",
        }}
      />
      
      {/* Seamless gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-mystic-deep/30 to-transparent" />
      
      {/* Soft radial glow */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] h-[60%] opacity-15"
        style={{
          background: "radial-gradient(ellipse at center bottom, hsl(var(--mystic-violet) / 0.3) 0%, transparent 70%)",
        }}
      />
      
      {/* Fog transition to CTA */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-[1]"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(270 50% 8% / 0.6) 40%, hsl(280 60% 12% / 0.9) 100%)",
        }}
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground mystic-text section-title">
            LE QUATTRO FASI
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Il percorso della trasformazione onirica
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
            <div className="mystic-card rounded-3xl p-8 shadow-2xl dramatic-glow">
              <div className="bg-mystic-deep/50 rounded-2xl p-6 mb-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Dream Alchemist - I Miei Sogni</h3>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-mystic-magenta/60" />
                    <div className="w-3 h-3 rounded-full bg-mystic-violet/60" />
                    <div className="w-3 h-3 rounded-full bg-mystic-pink/60" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <motion.div 
                    className="bg-gradient-to-r from-mystic-violet/30 to-mystic-magenta/20 rounded-xl p-4 border border-mystic-violet/30 hover:border-mystic-magenta/50 transition-colors"
                    whileHover={{ scale: 1.02 }}
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
                    className="bg-gradient-to-r from-mystic-pink/20 to-mystic-violet/20 rounded-xl p-4 border border-mystic-pink/30 hover:border-mystic-magenta/50 transition-colors"
                    whileHover={{ scale: 1.02 }}
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
                    className="bg-gradient-to-r from-mystic-magenta/25 to-mystic-glow/15 rounded-xl p-4 border border-mystic-magenta/30 hover:border-mystic-glow/50 transition-colors"
                    whileHover={{ scale: 1.02 }}
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
            className="space-y-8 experience-content"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6">
              {[
                {
                  title: "Nigredo",
                  description: "La fase in cui tutto si fa più denso: confusione, discesa, materia scura. È il momento in cui il sogno porta alla luce ciò che non può più restare indistinto."
                },
                {
                  title: "Albedo",
                  description: "Dopo l'oscurità arriva una chiarezza sottile. Non è ancora risposta, ma un primo respiro interiore: qualcosa si separa dal caos e diventa finalmente visibile."
                },
                {
                  title: "Citrinitas",
                  description: "È la luce che torna senza abbagliare. Il senso inizia a orientarsi, le immagini si collegano, e ciò che era sparso comincia a trovare direzione."
                },
                {
                  title: "Rubedo",
                  description: "La trasformazione prende corpo. Quello che hai visto, sentito e compreso smette di restare solo simbolo, e diventa presenza viva dentro di te."
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
