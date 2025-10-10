import { Card } from "@/components/ui/card";

const features = [
  {
    icon: "🌙",
    title: "Diario dei Sogni",
    description: "Registra ed esplora i tuoi sogni in un diario digitale privato con analisi intelligente"
  },
  {
    icon: "🔄",
    title: "Pattern dei Sogni",
    description: "Scopri temi ed emozioni ricorrenti nella tua storia onirica con analisi visive"
  },
  {
    icon: "👥",
    title: "Cerchie dei Sogni",
    description: "Condividi i sogni con amici fidati o cerchie oniriche e ottieni nuove prospettive"
  },
  {
    icon: "🌍",
    title: "Iniziativa di Ricerca",
    description: "Contribuisci alla nostra ricerca globale sui sogni e aiuta a mappare il panorama onirico collettivo"
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Sblocca il Potere dei Tuoi Sogni
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            I nostri strumenti intuitivi ti aiutano a documentare, analizzare e comprendere i tuoi sogni mentre 
            partecipi a ricerche rivoluzionarie sui sogni.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 p-8 hover:scale-105 transition-transform duration-300">
              <div className="text-center space-y-4">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;