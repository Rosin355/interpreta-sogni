import { motion } from "framer-motion";

const phases = [
  {
    key: "nigredo",
    latin: "Nigredo",
    roman: "I · L'oscuramento",
    desc: "La discesa nell'ignoto. Il sogno che inquieta è il sogno che dà inizio all'opera.",
    gradient:
      "radial-gradient(circle at 30% 30%, hsl(280 60% 25%) 0%, hsl(232 71% 8%) 80%)",
  },
  {
    key: "albedo",
    latin: "Albedo",
    roman: "II · La purificazione",
    desc: "Una prima luce lucida. L'immagine viene lavata e vista per ciò che è — senza giudizio.",
    gradient:
      "radial-gradient(circle at 30% 30%, hsl(245 80% 78%) 0%, hsl(245 40% 45%) 100%)",
  },
  {
    key: "citrinitas",
    latin: "Citrinitas",
    roman: "III · L'illuminazione",
    desc: "L'intuizione matura. Ciò che il sogno ripeteva da settimane finalmente trova senso.",
    gradient:
      "radial-gradient(circle at 30% 30%, hsl(45 90% 70%) 0%, hsl(280 50% 40%) 100%)",
  },
  {
    key: "rubedo",
    latin: "Rubedo",
    roman: "IV · L'integrazione",
    desc: "Il simbolo lascia la pagina e diventa un piccolo cambiamento nella vita di veglia.",
    gradient:
      "radial-gradient(circle at 30% 30%, hsl(330 80% 65%) 0%, hsl(280 70% 30%) 100%)",
  },
];

const ResearchSection = () => {
  return (
    <section
      id="research"
      className="relative py-32 lg:py-40 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background via-mystic-deep/40 to-background" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] opacity-15 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(var(--mystic-magenta) / 0.45) 0%, transparent 60%)",
        }}
      />

      <div className="container mx-auto px-6 lg:px-10 relative z-10 max-w-6xl">
        {/* Header centrale */}
        <motion.div
          className="text-center mb-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="ed-eyebrow justify-center">
            <span className="ed-num">iii.</span>
            <span className="ed-dot" />
            <span>La grande opera</span>
          </div>
          <h2 className="ed-h1 mt-7 mx-auto max-w-[18ch] text-foreground">
            Le quattro fasi <em>del fuoco interiore.</em>
          </h2>
          <p className="ed-lead mt-8 mx-auto max-w-[52ch]">
            Una sequenza antica, percorsa al ritmo del tuo sognare.
          </p>
        </motion.div>

        {/* Linea sottile orizzontale (visibile solo desktop) */}
        <div className="relative">
          <div
            className="hidden lg:block absolute top-[64px] left-[12.5%] right-[12.5%] h-px opacity-50"
            style={{
              background:
                "linear-gradient(to right, transparent 0%, hsl(var(--mystic-magenta) / 0.6) 20%, hsl(var(--mystic-glow) / 0.7) 50%, hsl(var(--mystic-magenta) / 0.6) 80%, transparent 100%)",
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-0 relative">
            {phases.map((p, i) => (
              <motion.div
                key={p.key}
                className="flex flex-col items-center text-center px-4 lg:px-6"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                viewport={{ once: true }}
              >
                {/* Orb */}
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center mb-8 relative transition-all duration-500"
                  style={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--mystic-violet) / 0.4)",
                    boxShadow: "0 0 40px hsl(var(--mystic-violet) / 0.2)",
                  }}
                >
                  <div
                    className="w-[56%] h-[56%] rounded-full"
                    style={{ background: p.gradient }}
                  />
                </div>

                <div className="font-editorial italic text-3xl text-foreground leading-tight mb-2">
                  {p.latin}
                </div>
                <div
                  className="text-[11px] uppercase tracking-[0.32em] mb-5"
                  style={{ color: "hsl(var(--mystic-glow))" }}
                >
                  {p.roman}
                </div>
                <p className="ed-body max-w-[24ch] text-sm">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResearchSection;
