import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden py-32 lg:py-44 flex items-center justify-center">
      {/* Sfondo: viola/blu profondo + bagliore centrale magenta */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, hsl(var(--mystic-magenta) / 0.18) 0%, transparent 50%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--mystic-deep)) 50%, hsl(var(--background)) 100%)",
        }}
      />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-12 text-center max-w-3xl mx-auto px-6 lg:px-10"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        viewport={{ once: true }}
      >
        {/* "Luna" mark */}
        <div
          className="w-[72px] h-[72px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, hsl(var(--mystic-pink)) 0%, hsl(var(--mystic-violet)) 75%, transparent 100%)",
            boxShadow: "0 0 80px hsl(var(--mystic-magenta) / 0.5)",
          }}
        />

        <div className="ed-eyebrow">
          <span>Comincia il viaggio</span>
        </div>

        <h2
          className="font-editorial font-light leading-[1.04] tracking-[-0.025em] text-foreground"
          style={{ fontSize: "clamp(36px, 6vw, 84px)" }}
        >
          Stasera, <em style={{ color: "hsl(var(--mystic-glow))" }}>annota</em>{" "}
          ciò che resta.
        </h2>

        <p className="ed-lead max-w-[44ch]">
          Non serve ricordare tutto. Basta un dettaglio, un’emozione, una scena rimasta accesa al risveglio: da lì comincia il dialogo con il sogno.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <RainbowButton
            className="px-8 py-6 text-base"
            onClick={() => navigate("/my-dreams")}
          >
            Inizia dal primo frammento.
          </RainbowButton>
          <Button
            variant="outline"
            size="lg"
            className="border-mystic-violet/40 text-foreground hover:bg-mystic-violet/15 hover:border-mystic-magenta/60 px-8 py-6 text-base transition-all duration-300 backdrop-blur-sm rounded-full"
            onClick={() => navigate("/explore")}
          >
            Ascolta una riflessione
          </Button>
        </div>

        <div className="ed-asterism mt-8">
          <span className="ed-line" />
          <span>※</span>
          <span className="ed-line" />
        </div>
      </motion.div>
    </section>
  );
};

export default CTASection;
