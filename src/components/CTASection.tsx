import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";

const CTASection = () => {
  return (
    <section className="cta-section py-24 bg-gradient-to-b from-secondary/10 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,hsl(var(--accent)/0.15),transparent_50%)] animate-pulse-glow" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto cta-content">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Esplora l'Universo Onirico
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            Unisciti a migliaia di sognatori che documentano le loro esperienze oniriche e contribuiscono alla nostra comprensione della mente umana.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <RainbowButton className="px-8 py-6 text-lg">
              Inizia il Tuo Viaggio Onirico
            </RainbowButton>
            <Button variant="outline" size="lg" className="border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50 px-8 py-6 text-lg transition-all duration-300">
              Scopri di Più
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;