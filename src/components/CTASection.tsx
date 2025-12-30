import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ctaDreamsImage from "@/assets/cta-dreams-universe.jpg";
import { FallingStars } from "@/components/ui/FallingStars";
import { NebulaOverlay } from "@/components/ui/NebulaOverlay";
import { GlowingStar } from "@/components/ui/GlowingStar";
import { MorphingImage } from "@/components/ui/MorphingImage";
import { motion } from "framer-motion";

const CTASection = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
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
    <section className="cta-section py-24 relative overflow-hidden min-h-[700px]">
      {/* Background image with enhanced overlay */}
      <div className="absolute inset-0">
        <MorphingImage 
          src={ctaDreamsImage} 
          alt="Universo onirico" 
          className="w-full h-full object-cover"
          morphType="blur"
          duration={1.8}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-mystic-deep/60 to-background/90" />
      </div>
      
      {/* Nebula overlay */}
      <NebulaOverlay intensity="medium" />
      
      {/* Falling stars effect */}
      <FallingStars 
        starCount={15} 
        speed={0.8}
        colors={['#a855f7', '#ec4899', '#f472b6', '#c084fc', '#e879f9']}
      />
      
      {/* Decorative glowing stars */}
      <GlowingStar 
        size="xl" 
        color="white" 
        className="absolute top-16 right-[20%] opacity-70" 
      />
      <GlowingStar 
        size="lg" 
        color="pink" 
        className="absolute top-32 left-[15%] opacity-60" 
      />
      <GlowingStar 
        size="md" 
        color="purple" 
        className="absolute bottom-40 right-[10%] opacity-50" 
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          className="text-center max-w-4xl mx-auto cta-content"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground mystic-text section-title">
            Esplora l'Universo Onirico
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            Unisciti a migliaia di sognatori che documentano le loro esperienze oniriche e contribuiscono alla nostra comprensione della mente umana.
          </p>
          
          {/* Newsletter Form */}
          <motion.div 
            className="max-w-md mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="La tua email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-background/30 backdrop-blur-md border-mystic-violet/40 focus:border-mystic-magenta/60 text-foreground placeholder:text-muted-foreground"
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-mystic-violet hover:bg-mystic-magenta text-white px-8 transition-all duration-300"
              >
                {isSubmitting ? "Invio..." : "Iscriviti"}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-3">
              Ricevi insights settimanali sul mondo dei sogni
            </p>
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <RainbowButton className="px-8 py-6 text-lg" onClick={() => navigate('/my-dreams')}>
              Inizia il Tuo Viaggio Onirico
            </RainbowButton>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-mystic-violet/50 text-foreground hover:bg-mystic-violet/20 hover:border-mystic-magenta/60 px-8 py-6 text-lg transition-all duration-300 backdrop-blur-sm" 
              onClick={() => navigate('/explore')}
            >
              Scopri di Più
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
