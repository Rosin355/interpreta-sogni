import { motion } from "framer-motion";
import { useMemo } from "react";

const ExperienceSection = () => {
  // starfield decorativa silenziosa
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        opacity: Math.random() * 0.6 + 0.2,
        size: Math.random() * 1.6 + 0.4,
      })),
    []
  );

  return (
    <section className="relative min-h-[640px] flex items-center justify-center overflow-hidden border-y border-mystic-violet/15">
      {/* Sfondo cinematico viola/blu profondo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, hsl(var(--mystic-magenta) / 0.18) 0%, transparent 45%), radial-gradient(ellipse at 30% 70%, hsl(var(--mystic-violet) / 0.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 30%, hsl(var(--mystic-deep)) 0%, transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--mystic-deep)) 50%, hsl(var(--background)) 100%)",
        }}
      />

      {/* Stelle */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-foreground"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>

      {/* Vignettatura */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, hsl(var(--background) / 0.85) 100%)",
        }}
      />

      <motion.div
        className="relative z-10 text-center px-6 lg:px-10 max-w-4xl mx-auto py-32"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <p
          className="font-editorial italic font-light leading-[1.18] tracking-[-0.018em] text-foreground"
          style={{ fontSize: "clamp(28px, 4.4vw, 60px)" }}
        >
          <span
            className="block text-[1.3em] leading-none mb-6 font-normal"
            style={{ color: "hsl(var(--mystic-glow))" }}
          >
            “
          </span>
          Il sogno è la piccola{" "}
          <em style={{ color: "hsl(var(--mystic-glow))" }}>porta nascosta</em>{" "}
          nel più profondo e intimo santuario dell'anima.
        </p>

        <div
          className="mt-12 ed-meta"
          style={{ color: "hsl(var(--mystic-glow))" }}
        >
          Dal colofone
        </div>
        <div className="font-editorial italic text-foreground mt-2 text-base">
          — Carl Gustav Jung
        </div>
      </motion.div>
    </section>
  );
};

export default ExperienceSection;
