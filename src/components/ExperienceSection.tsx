const ExperienceSection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-secondary/10 experience-section">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Prova Dream's Alchemist
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Documenta, analizza e condividi i tuoi sogni con la nostra interfaccia intuitiva
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left side - App Interface Preview */}
          <div className="relative experience-mockup">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border border-border/50 rounded-3xl p-8 shadow-2xl">
              <div className="bg-secondary/30 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Dream's Alchemist - I Miei Sogni</h3>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center">
                        <span className="text-blue-200 text-sm">🌊</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Viaggio nell'Oceano</h4>
                        <p className="text-sm text-muted-foreground">Nuotando con i delfini in acqua cristallina...</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/30 rounded-full flex items-center justify-center">
                        <span className="text-green-200 text-sm">🌳</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Avventura nella Foresta</h4>
                        <p className="text-sm text-muted-foreground">Camminando attraverso una foresta incantata...</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center">
                        <span className="text-purple-200 text-sm">✨</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Sogno di Volo</h4>
                        <p className="text-sm text-muted-foreground">Volteggiando sopra le nuvole in completa libertà...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - Features */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Diario dei Sogni Dettagliato</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Registra ogni dettaglio dei tuoi sogni con etichettatura emotiva, riconoscimento delle persone e formattazione ricca del contenuto.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Analisi dei Pattern</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Identifica temi, emozioni e pattern ricorrenti nella tua storia onirica con analisi visive.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Condivisione dei Sogni</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Condividi i sogni selettivamente con amici o cerchie oniriche per ottenere nuove prospettive.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;