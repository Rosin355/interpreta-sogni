import { Button } from "@/components/ui/button";

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
            <Button size="lg" className="relative overflow-hidden group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium px-8 py-6 text-lg shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all duration-300">
              <span className="relative z-10">Inizia il Tuo Viaggio Onirico</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Button>
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