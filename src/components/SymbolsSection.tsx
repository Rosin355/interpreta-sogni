import { motion } from "framer-motion";

const symbols = [
  { g: "☽", name: "Luna", m: "riflesso" },
  { g: "⌖", name: "Soglia", m: "passaggio" },
  { g: "☉", name: "Sole", m: "coscienza" },
  { g: "❦", name: "Giardino", m: "vita interiore" },
  { g: "⚱", name: "Vaso", m: "contenimento" },
  { g: "✶", name: "Stella", m: "guida" },
];

const SymbolsSection = () => {
  return (
    <section className="relative py-32 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-mystic-deep/20 to-background" />

      <div className="container mx-auto px-6 lg:px-10 relative z-10 max-w-6xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="ed-eyebrow justify-center">
            <span className="ed-num">v.</span>
            <span className="ed-dot" />
            <span>Il lessico onirico</span>
          </div>
          <h2 className="ed-h1 mt-7 mx-auto max-w-[18ch] text-foreground">
            Alcuni simboli <em>dal lessico.</em>
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 overflow-hidden rounded-2xl border border-mystic-violet/15"
          style={{ background: "hsl(var(--mystic-violet) / 0.1)", gap: 1 }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {symbols.map((s) => (
            <div
              key={s.name}
              className="flex flex-col items-center text-center gap-3 px-5 py-10 transition-colors cursor-default"
              style={{ background: "hsl(var(--background) / 0.95)" }}
            >
              <span
                className="font-editorial font-light leading-none"
                style={{
                  fontSize: 40,
                  color: "hsl(var(--mystic-glow))",
                }}
              >
                {s.g}
              </span>
              <span className="font-editorial italic text-base text-foreground">
                {s.name}
              </span>
              <span
                className="text-[10px] uppercase tracking-[0.22em]"
                style={{ color: "hsl(var(--foreground) / 0.5)" }}
              >
                {s.m}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SymbolsSection;
