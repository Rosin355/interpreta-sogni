import { motion } from "framer-motion";

const ManifestoSection = () => {
  return (
    <section className="relative py-32 lg:py-44 overflow-hidden">
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 80% 20%, hsl(var(--mystic-violet) / 0.4) 0%, transparent 55%)",
        }}
      />

      <div className="container mx-auto px-6 lg:px-10 relative z-10 max-w-6xl">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-start"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          viewport={{ once: true }}
        >
          <div className="lg:sticky lg:top-32">
            <div className="ed-eyebrow text-lg lg:text-xl">
              <span className="ed-num">i.</span>
              <span className="ed-dot" />
              <span>Introduzione</span>
            </div>
          </div>

          <div>
            <p
              className="font-editorial font-light text-foreground"
              style={{
                fontSize: "clamp(24px, 2.8vw, 42px)",
                lineHeight: 1.3,
                letterSpacing: "-0.012em",
                margin: "0 0 40px",
              }}
            >
              Dream Alchemist è uno spazio silenzioso dedicato ai sogni — un luogo in cui annotare ciò che arriva nella notte, osservarlo alla luce del tema natale e seguirlo, con calma, attraverso le quattro fasi dell’opera interiore.
            </p>
            <p
              className="font-editorial font-light text-foreground/85"
              style={{
                fontSize: "clamp(21px, 2.2vw, 32px)",
                lineHeight: 1.4,
                letterSpacing: "-0.01em",
                margin: "0 0 40px",
              }}
            >
              Non è un’app di produttività. È più simile a una{" "}
              <em
                className="italic"
                style={{ color: "hsl(var(--mystic-glow))" }}
              >
                biblioteca privata
              </em>{" "}
              — fatta di pagine, tempo e attenzione. Ogni sogno può diventare una traccia; ogni traccia, col tempo, un passaggio di trasformazione.
            </p>
            <p
              className="font-editorial italic font-light"
              style={{
                fontSize: "clamp(20px, 2vw, 28px)",
                lineHeight: 1.5,
                color: "hsl(var(--mystic-glow))",
              }}
            >
              Dal cielo natale al sogno — dal simbolo alla coscienza.
            </p>

            
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ManifestoSection;
