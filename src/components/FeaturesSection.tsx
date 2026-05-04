import { motion } from "framer-motion";

const chapters = [
  {
    n: "i.",
    title: "Il diario",
    em: "intimo",
    sub: "ANNOTA IL SOGNO",
    body: "Scrivi ciò che ricordi appena ti svegli. Anche poche parole possono bastare per conservare qualcosa di importante.",
    meta: "",
  },
  {
    n: "ii.",
    title: "Il simbolo",
    em: "rivelato",
    sub: "LETTURA SIMBOLICA",
    body: "Alcune immagini tornano nei sogni più volte. Qui puoi fermarti a guardarle meglio e iniziare a capire cosa evocano.",
    meta: "",
  },
  {
    n: "iii.",
    title: "Il cielo",
    em: "che orienta",
    sub: "TEMA NATALE",
    body: "Il tema natale è una mappa simbolica della nascita. In questo spazio può offrire un contesto in più per leggere i tuoi sogni.",
    meta: "",
  },
  {
    n: "iv.",
    title: "L'opera",
    em: "interiore",
    sub: "INTEGRAZIONE",
    body: "Il sogno non finisce quando ti svegli. Il lavoro interiore comincia quando qualcosa di quel sogno resta con te e prende senso nel tempo.",
    meta: "",
  },
];

const FeaturesSection = () => {
  return (
    <section
      id="features"
      className="relative py-20 lg:py-28 overflow-hidden"
    >
      {/* Sfondo profondo viola/blu */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-mystic-deep/30 to-background" />
      <div
        className="absolute top-1/4 right-0 w-[60%] h-[60%] opacity-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(var(--mystic-violet) / 0.35) 0%, transparent 70%)",
        }}
      />

      <div className="container mx-auto px-6 lg:px-10 relative z-10 max-w-6xl">
        {/* Header sezione */}
        <motion.div
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10 mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div>
            <div className="ed-eyebrow">
              <span className="ed-num">ii.</span>
              <span className="ed-dot" />
              <span>IL LAVORO INTERIORE</span>
            </div>
            <h2 className="ed-h1 mt-7 max-w-[18ch] text-foreground">
              Un modo semplice per avvicinarti ai sogni.
            </h2>
          </div>
          <p className="ed-lead max-w-[36ch]">
            Dream Alchemist ti aiuta a ricordare, osservare e comprendere ciò che arriva nella notte, con strumenti simbolici e astrologici resi accessibili.
          </p>
        </motion.div>

        {/* Lista capitoli */}
        <div className="ed-divider" />
        <div>
          {chapters.map((c, i) => (
            <motion.article
              key={c.n}
              className="grid grid-cols-1 md:grid-cols-[80px_minmax(0,1.1fr)_minmax(0,1.4fr)] gap-6 md:gap-12 py-12 md:py-16 border-b border-mystic-violet/15 transition-colors hover:bg-mystic-violet/[0.03]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true, margin: "-50px" }}
            >
              <div
                className="font-editorial italic font-light text-3xl"
                style={{ color: "hsl(var(--mystic-glow))" }}
              >
                {c.n}
              </div>

              <div>
                <h3 className="ed-h2 text-foreground">
                  {c.title} <em>{c.em}</em>
                </h3>
                <div className="ed-meta mt-5 flex items-center gap-3">
                  <span>{c.sub}</span>
                  {c.meta && (
                    <>
                      <span
                        className="inline-block w-[3px] h-[3px] rounded-full"
                        style={{ background: "hsl(var(--mystic-magenta))" }}
                      />
                      <span>{c.meta}</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="ed-body max-w-[50ch]">{c.body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
