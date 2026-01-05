import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import Hero from "@/components/ui/animated-shader-hero";
import { useNavigate } from "react-router-dom";
import { DreamPulsingCircle } from "@/components/DreamPulsingCircle";

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <div className="relative">
      <Hero
        headline={{
          line1: "Esplora l'",
          specialWord: "Universo",
          line2: "dei Tuoi Sogni"
        }}
        subtitle="Registra, analizza e scopri i pattern nei tuoi sogni mentre contribuisci a una ricerca rivoluzionaria sui sogni."
        buttons={
          <>
            <RainbowButton className="px-8 py-6 text-lg" onClick={() => navigate('/my-dreams')}>
              Il Mio Diario dei Sogni
            </RainbowButton>
            <Button variant="outline" size="lg" className="border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50 px-8 py-6 text-lg transition-all duration-300" onClick={() => navigate('/explore')}>
              Esplora i Sogni
            </Button>
          </>
        }
      />
      <DreamPulsingCircle />
    </div>
  );
};

export default HeroSection;