import { RainbowButton } from "@/components/ui/rainbow-button";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { StarsCanvas } from "@/components/ui/stars-canvas";

const HomeHero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Starfield persistent layer */}
      <div className="absolute inset-0">
        <StarsCanvas maxStars={350} hue={270} brightness={8} transparent={false} />
      </div>

      {/* Atmospheric gradient overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, hsl(var(--mystic-violet) / 0.15) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, hsl(var(--mystic-magenta) / 0.1) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 container mx-auto px-6 text-center max-w-5xl" style={{ paddingTop: "calc(7rem + var(--safe-area-inset-top, 0px))" }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8 text-foreground"
            style={{
              textShadow:
                "0 0 40px hsl(var(--mystic-glow) / 0.2), 0 0 80px hsl(var(--mystic-violet) / 0.1)",
            }}
          >
            Dove il cielo incontra l'inconscio
          </h1>
        </motion.div>

        <motion.p
          className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        >
          Un percorso che intreccia astrologia, alchimia e simbolismo profondo per leggere i sogni
          alla luce del tema natale, della posizione dei pianeti alla nascita e dei linguaggi della
          psiche, trasformando ciò che emerge in consapevolezza interiore.
        </motion.p>

        <motion.p
          className="text-sm sm:text-base text-muted-foreground/70 italic max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        >
          Dal tema natale ai sogni, dai simboli della psiche all'alchimia della trasformazione.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
        >
          <RainbowButton className="px-8 py-6 text-lg" onClick={() => navigate("/my-dreams")}>
            Inizia il viaggio
          </RainbowButton>
          <Button
            variant="outline"
            size="lg"
            className="border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50 px-8 py-6 text-lg transition-all duration-300"
            onClick={() => navigate("/explore")}
          >
            Esplora i tuoi sogni
          </Button>
        </motion.div>
      </div>

      {/* Bottom fade to next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, hsl(var(--background)))",
        }}
      />
    </section>
  );
};

export default HomeHero;
