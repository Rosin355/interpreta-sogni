import { RainbowButton } from "@/components/ui/rainbow-button";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const HomeCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-32 relative overflow-hidden">
      {/* Atmospheric glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, hsl(var(--mystic-violet) / 0.12) 0%, transparent 60%)",
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2
            className="text-3xl lg:text-5xl font-bold text-foreground mb-6"
            style={{
              textShadow: "0 0 30px hsl(var(--mystic-glow) / 0.15)",
            }}
          >
            Il viaggio inizia da un sogno
          </h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Registra i tuoi sogni, scopri cosa rivelano i pianeti e inizia il tuo percorso di
            trasformazione interiore.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <RainbowButton className="px-8 py-6 text-lg" onClick={() => navigate("/my-dreams")}>
              Inizia il viaggio
            </RainbowButton>
            <Button
              variant="outline"
              size="lg"
              className="border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50 px-8 py-6 text-lg transition-all duration-300"
              onClick={() => navigate("/explore")}
            >
              Esplora i sogni
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HomeCTA;
