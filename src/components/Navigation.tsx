import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useNavigate } from "react-router-dom";

const Navigation = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">🌙</span>
          </div>
          <span className="text-xl font-bold text-foreground">Interpreta i tuoi Sogni</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-8">
          <a href="#explore" className="text-muted-foreground hover:text-foreground transition-colors">
            Esplora
          </a>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline-white" 
            size="sm"
            onClick={() => navigate("/auth?mode=login")}
          >
            Login
          </Button>
          <RainbowButton 
            className="h-9 px-4 text-sm"
            onClick={() => navigate("/auth?mode=signup")}
          >
            Get Started
          </RainbowButton>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;