import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
const dreamPatterns = ["Volare", "Cadere", "Inseguimento", "Perso", "Acqua", "Famiglia", "Infanzia", "Esame", "In Ritardo", "Denti"];
const ResearchSection = () => {
  return <section id="research" className="research-section bg-gradient-to-b from-secondary/10 to-background px-0 py-[61px]">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 research-content">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Mappare l'Universo Onirico Insieme
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
            La nostra iniziativa globale di ricerca sui sogni mira a mappare i pattern onirici collettivi, comprendere i contesti emotivi 
            e creare un atlante completo del panorama onirico umano. Partecipando, contribuisci a una ricerca rivoluzionaria 
            su come sogniamo.
          </p>
          <Button className="relative overflow-hidden group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all duration-300">
            <span className="relative z-10">Esplora le Scoperte della Ricerca</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Button>
        </div>
        
        
      </div>
    </section>;
};
export default ResearchSection;