import { Card } from "@/components/ui/card";
import dreamsHero from "@/assets/dreams-hero.jpg";
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
  return <section id="features" className="py-24 features-section">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Sblocca il Potere dei Tuoi Sogni
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            I nostri strumenti intuitivi ti aiutano a documentare, analizzare e comprendere i tuoi sogni mentre 
            partecipi a ricerche rivoluzionarie sui sogni.
          </p>
          <div className="mt-12 mb-8">
            <img src={dreamsHero} alt="Una persona che dorme serenamente sotto un cielo stellato onirico" className="rounded-2xl shadow-2xl w-full max-w-4xl mx-auto" />
          </div>
        </div>
        
        
      </div>
    </section>;
};
export default FeaturesSection;