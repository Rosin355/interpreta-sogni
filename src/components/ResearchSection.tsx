import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useNavigate } from "react-router-dom";

const dreamPatterns = ["Volare", "Cadere", "Inseguimento", "Perso", "Acqua", "Famiglia", "Infanzia", "Esame", "In Ritardo", "Denti"];
const ResearchSection = () => {
  const navigate = useNavigate();
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
          <RainbowButton onClick={() => navigate('/explore')}>
            Esplora le Scoperte della Ricerca
          </RainbowButton>
        </div>
        
        
      </div>
    </section>;
};
export default ResearchSection;