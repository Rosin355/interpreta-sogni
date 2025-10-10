import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-6 pt-24 pb-16 h-[700px] flex items-center">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left side - Text content */}
          <div className="space-y-8 hero-content">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Esplora l'{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
                  Universo
                </span>{" "}
                dei Tuoi Sogni
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                Registra, analizza e scopri i pattern nei tuoi sogni mentre contribuisci a una ricerca rivoluzionaria sui sogni.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 hero-buttons">
              <RainbowButton className="px-8 py-6 text-lg">
                Il Mio Diario dei Sogni
              </RainbowButton>
              <Button variant="outline" size="lg" className="border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50 px-8 py-6 text-lg transition-all duration-300">
                Esplora i Sogni
              </Button>
            </div>
          </div>
          
          {/* Right side - Dream Journal UI Preview */}
          <div className="relative">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Diario dei Sogni</h3>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Registra i tuoi sogni con dettagli ricchi e contesto emotivo
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/30 rounded-lg p-4 h-24 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
                    <span className="text-xs text-muted-foreground relative z-10">Volare</span>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-4 h-24 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-foreground">Bianco e Nero</span>
                    <span className="text-xs text-muted-foreground">Vivido</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 bg-green-500/30 rounded-full" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Scena Naturale</span>
                      <p className="text-xs text-muted-foreground">Prato pacifico con acqua corrente</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;