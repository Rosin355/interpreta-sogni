import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
const HeroSection = () => {
  return <section className="relative overflow-hidden">
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
            
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;