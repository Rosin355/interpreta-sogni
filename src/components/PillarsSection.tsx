import { motion } from "framer-motion";
import { Star, Brain, Flame } from "lucide-react";

const pillars = [
  {
    icon: Star,
    title: "Il cielo della tua nascita",
    label: "Astrologia",
    description:
      "Leggi il tuo tema natale attraverso la posizione dei pianeti al momento della nascita e scopri le forze simboliche che accompagnano il tuo percorso interiore.",
    color: "mystic-violet",
  },
  {
    icon: Brain,
    title: "I simboli della psiche",
    label: "Inconscio",
    description:
      "Sogni, immagini, archetipi ed emozioni emergono dal profondo come linguaggio dell'inconscio e rivelano ciò che cerca ascolto, integrazione e comprensione.",
    color: "mystic-magenta",
  },
  {
    icon: Flame,
    title: "La trasformazione interiore",
    label: "Alchimia",
    description:
      "Ciò che emerge non viene solo interpretato: viene trasmutato in consapevolezza, crescita e trasformazione personale.",
    color: "mystic-pink",
  },
];

const PillarsSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-mystic-deep/40 to-background" />

      {/* Subtle glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] opacity-15 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(var(--mystic-violet) / 0.25) 0%, transparent 70%)",
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-4">
            Tre pilastri, un unico viaggio
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Astrologia, inconscio e alchimia si intrecciano per rivelare il linguaggio profondo dei tuoi sogni.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.label}
                className="group relative p-8 rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm hover:border-border/60 transition-all duration-500"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                {/* Glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at center, hsl(var(--${pillar.color}) / 0.1) 0%, transparent 70%)`,
                  }}
                />

                <div className="relative z-10">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                    style={{
                      background: `linear-gradient(135deg, hsl(var(--${pillar.color}) / 0.2), hsl(var(--${pillar.color}) / 0.05))`,
                      border: `1px solid hsl(var(--${pillar.color}) / 0.3)`,
                    }}
                  >
                    <Icon className="w-7 h-7" style={{ color: `hsl(var(--${pillar.color}))` }} />
                  </div>

                  <span
                    className="text-xs uppercase tracking-[0.2em] font-medium mb-2 block"
                    style={{ color: `hsl(var(--${pillar.color}))` }}
                  >
                    {pillar.label}
                  </span>

                  <h3 className="text-xl font-bold text-foreground mb-4">{pillar.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{pillar.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PillarsSection;
