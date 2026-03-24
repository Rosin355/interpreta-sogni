import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Registra il tuo sogno",
    description: "Scrivi o registra a voce il tuo sogno appena sveglio. Ogni dettaglio conta.",
  },
  {
    number: "02",
    title: "Interpretazione simbolica",
    description:
      "Il sogno viene analizzato attraverso archetipi, simboli e il tuo tema natale personale.",
  },
  {
    number: "03",
    title: "Trasformazione interiore",
    description:
      "Ciò che emerge diventa consapevolezza: un percorso di crescita e integrazione personale.",
  },
];

const TransformationSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-mystic-deep/20 to-background" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-4">
            Come funziona
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Dal sogno alla consapevolezza, un percorso in tre passi.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-16">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="flex gap-8 items-start"
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div
                className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border border-border/40"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--mystic-violet) / 0.15), hsl(var(--mystic-magenta) / 0.1))",
                  color: "hsl(var(--mystic-glow))",
                  textShadow: "0 0 20px hsl(var(--mystic-glow) / 0.4)",
                }}
              >
                {step.number}
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TransformationSection;
