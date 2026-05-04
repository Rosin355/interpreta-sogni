import { motion } from "framer-motion";

const chapters = [
  {
    n: "i.",
    title: "Il diario",
    em: "intimo",
    sub: "Annota il sogno",
    body: "Scrivi ciò che resta al risveglio: un’immagine, una frase, una sensazione. Anche il frammento più piccolo può diventare una traccia da seguire.",
    meta: "Capitolo uno · il diario",
  },
  {
    n: "ii.",
    title: "Il simbolo",
    em: "rivelato",
    sub: "Lettura simbolica",
    body: "Alcune immagini ritornano senza spiegarsi subito. Qui impari a fermarti davanti a ciò che insiste, finché il simbolo comincia a prendere voce.",
    meta: "Capitolo due · il simbolo",
  },
  {
    n: "iii.",
    title: "Il cielo",
    em: "sotteso",
    sub: "Tema natale & risonanze",
    body: "Il tema natale non dà risposte automatiche, ma offre una cornice sottile. A volte il cielo non spiega il sogno: lo mette semplicemente in una luce più chiara.",
    meta: "Capitolo tre · il cielo",
  },
  {
    n: "iv.",
    title: "L'opera",
    em: "alchemica",
    sub: "Nigredo, Albedo, Rubedo",
    body: "Ogni sogno lascia un piccolo resto da integrare nella vita vigile. L’opera comincia quando riconosci quella traccia e scegli di non perderla.",
    meta: "Capitolo quattro · la trasformazione",
  },
];

const FeaturesSection = () => {
  return (
    <section
      id="features"
      className="relative py-32 lg:py-40 overflow-hidden"
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
              <span>Il lavoro interiore</span>
            </div>
            <h2 className="ed-h1 mt-7 max-w-[14ch] text-foreground">
              Quattro stanze <em>silenziose</em>, una sola casa.
            </h2>
          </div>
          <p className="ed-lead max-w-[36ch]">
            Ogni capitolo è una soglia. Aprine una stasera; le altre sapranno attendere.
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
                  <span
                    className="inline-block w-[3px] h-[3px] rounded-full"
                    style={{ background: "hsl(var(--mystic-magenta))" }}
                  />
                  <span>{c.meta}</span>
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
