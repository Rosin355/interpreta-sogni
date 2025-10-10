import { Button } from "@/components/ui/button";

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">🌙</span>
          </div>
          <span className="text-xl font-bold text-foreground">Dream Catcher</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-8">
          <a href="#explore" className="text-muted-foreground hover:text-foreground transition-colors">
            Esplora
          </a>
          <a href="#research" className="text-muted-foreground hover:text-foreground transition-colors">
            Ricerca
          </a>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Funzionalità
          </a>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm">
            Accedi
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium">
            Inizia
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;