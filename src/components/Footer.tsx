import { Moon, Brain, Heart } from "lucide-react";
const Footer = () => {
  return <footer className="bg-secondary/5 border-t border-border">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">Dream Catcher</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Esplora l'universo dei tuoi sogni e contribuisci alla ricerca globale.
            </p>
          </div>

          {/* Prodotto */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Prodotto</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Funzionalità</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Ricerca</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Diario dei Sogni</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cerchie Oniriche</a></li>
            </ul>
          </div>

          {/* Risorse */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Risorse</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Guida</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Supporto</a></li>
            </ul>
          </div>

          {/* Legale */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legale</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Termini</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contatti</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2025 Interpreta i tuoi Sogni di Jessica Marin. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Fatto con</span>
            <Heart className="h-4 w-4 text-primary fill-primary" />
            <span>per il mio amore</span>
            <Brain className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;