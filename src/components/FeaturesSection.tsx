import mysticPortal from "@/assets/mystic-portal.jpg";
import { MysticGlowOrb } from "@/components/ui/MysticGlowOrb";
import { MorphingImage } from "@/components/ui/MorphingImage";
import { motion } from "framer-motion";

const features = [{
  icon: "🌙",
  title: "Diario dei Sogni",
  description: "Registra ed esplora i tuoi sogni in un diario digitale privato con analisi intelligente"
}, {
  icon: "🔄",
  title: "Pattern dei Sogni",
  description: "Scopri temi ed emozioni ricorrenti nella tua storia onirica con analisi visive"
}, {
  icon: "👥",
  title: "Cerchie dei Sogni",
  description: "Condividi i sogni con amici fidati o cerchie oniriche e ottieni nuove prospettive"
}, {
  icon: "🌍",
  title: "Iniziativa di Ricerca",
  description: "Contribuisci alla nostra ricerca globale sui sogni e aiuta a mappare il panorama onirico collettivo"
}];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 features-section relative overflow-hidden">
      {/* Seamless gradient background - no hard edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-mystic-deep/30 to-transparent" />
      
      {/* Soft radial glow from center */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] opacity-20"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--mystic-magenta) / 0.3) 0%, transparent 70%)",
        }}
      />
      
      {/* Fog transition to Research */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-[1]"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(270 50% 8% / 0.6) 40%, hsl(280 60% 12% / 0.9) 100%)",
        }}
      />
      
      {/* Mystic glow orb decoration with parallax */}
      <MysticGlowOrb 
        size="lg" 
        intensity="low" 
        className="top-10 right-[5%] hidden lg:block"
        parallaxSpeed={0.2}
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground mystic-text section-title">
            Sblocca il Potere dei Tuoi Sogni
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            I nostri strumenti intuitivi ti aiutano a documentare, analizzare e comprendere i tuoi sogni mentre 
            partecipi a ricerche rivoluzionarie sui sogni.
          </p>
          
          <div className="mt-20 mb-20 px-4 lg:px-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-mystic-violet/20 via-mystic-magenta/20 to-mystic-violet/20 rounded-2xl blur-xl" />
            <MorphingImage 
              src={mysticPortal} 
              alt="Una persona che dorme serenamente sotto un cielo stellato onirico" 
              className="rounded-2xl shadow-2xl w-full max-w-3xl mx-auto relative dramatic-glow"
              morphType="glow"
              duration={1.4}
            />
          </div>
        </motion.div>
        
        {/* Feature cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="mystic-card p-6 rounded-2xl transition-all duration-500 feature-card hover:dramatic-card-glow"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
            >
              <div className="text-4xl mb-4 animate-mystic-float" style={{ animationDelay: `${index * 0.5}s` }}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
