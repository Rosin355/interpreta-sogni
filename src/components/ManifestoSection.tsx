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
            <div className="ed-eyebrow">
              <span>L'apertura</span>
              <span className="ed-num">i.</span>
            </div>
          </div>

          <div>
            <p
              className="font-editorial font-light text-foreground"
              style={{
                fontSize: "clamp(22px, 2.4vw, 36px)",
                lineHeight: 1.35,
                letterSpacing: "-0.012em",
                margin: "0 0 32px",
              }}
            >
              Dream Alchemist è un santuario silenzioso per la vita onirica —
              un luogo per annotare ciò che arriva nella notte, leggerlo alla
              luce del tema natale e accompagnarlo, lentamente, attraverso le
              quattro fasi dell'opera interiore.
            </p>
            <p
              className="font-editorial font-light text-foreground/85"
              style={{
                fontSize: "clamp(20px, 2vw, 30px)",
                lineHeight: 1.4,
                letterSpacing: "-0.01em",
                margin: "0 0 32px",
              }}
            >
              Non siamo un'app di produttività. Siamo più simili a una{" "}
              <em
                className="italic"
                style={{ color: "hsl(var(--mystic-glow))" }}
              >
                biblioteca privata
              </em>{" "}
              — pelle, carta, candela, misura. Ogni sogno diventa una pagina;
              ogni pagina, col tempo, un capitolo; ogni capitolo, una
              trasformazione.
            </p>
            <p
              className="font-editorial italic font-light"
              style={{
                fontSize: "clamp(18px, 1.8vw, 26px)",
                lineHeight: 1.5,
                color: "hsl(var(--mystic-glow))",
              }}
            >
              Dal cielo natale al sogno — dal simbolo alla coscienza.
            </p>

            <div className="ed-meta mt-12">※&nbsp;&nbsp;Nota dell'editore</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ManifestoSection;
