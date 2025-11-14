import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ctaDreamsImage from "@/assets/cta-dreams-universe.jpg";

const CTASection = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    // Simulate newsletter subscription
    setTimeout(() => {
      toast({
        title: "Iscrizione completata!",
        description: "Riceverai presto notizie dal mondo onirico.",
      });
      setEmail("");
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <section className="cta-section py-24 bg-gradient-to-b from-secondary/10 to-background relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 opacity-20">
        <img 
          src={ctaDreamsImage} 
          alt="Universo onirico" 
          className="w-full h-full object-cover"
        />
      </div>
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/80" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto cta-content">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Esplora l'Universo Onirico
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            Unisciti a migliaia di sognatori che documentano le loro esperienze oniriche e contribuiscono alla nostra comprensione della mente umana.
          </p>
          
          {/* Newsletter Form */}
          <div className="max-w-md mx-auto mb-8">
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="La tua email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-background/50 backdrop-blur-sm border-primary/30 focus:border-primary/50"
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              >
                {isSubmitting ? "Invio..." : "Iscriviti"}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-3">
              Ricevi insights settimanali sul mondo dei sogni
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <RainbowButton className="px-8 py-6 text-lg" onClick={() => navigate('/my-dreams')}>
              Inizia il Tuo Viaggio Onirico
            </RainbowButton>
            <Button variant="outline" size="lg" className="border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50 px-8 py-6 text-lg transition-all duration-300" onClick={() => navigate('/explore')}>
              Scopri di Più
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;