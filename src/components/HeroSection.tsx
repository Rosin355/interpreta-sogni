import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import Hero from "@/components/ui/animated-shader-hero";
import { useNavigate } from "react-router-dom";

const HERO_PHRASES = [
  "Attraverso l'Alchimia della trasformazione, intrecciamo",
  "il tuo Tema Natale ai simboli onirici della psiche.",
  "Impara a decifrare come i pianeti al momento della tua nascita si riflettono nel tuo mondo interiore,",
  "trasformando ogni visione notturna in pura consapevolezza.",
  "🌙 Inizia ora ad annotare i tuoi sogni e lascia che L'Alchimista li interpreti. Continua la conversazione ed estrai la formula dell'oro filosofale! ⚗️✨",
] as const;

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <Hero
      animatedPhrases={HERO_PHRASES}
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
  );
};

export default HeroSection;
