import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import UserMenu from "./UserMenu";
import { Plus } from "lucide-react";

const Navigation = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Controlla se l'utente è loggato
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Ascolta i cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate(user ? "/dashboard" : "/")}>
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">🌙</span>
          </div>
          <span className="text-xl font-bold text-foreground">Interpreta i tuoi Sogni</span>
        </div>
        
        {user ? (
          // Menu per utenti loggati
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => navigate("/explore")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Esplora
              </button>
              <button
                onClick={() => navigate("/my-dreams")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                I Miei Sogni
              </button>
              <button
                onClick={() => navigate("/collections")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Collezioni
              </button>
              <button
                onClick={() => navigate("/timeline")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Timeline
              </button>
            </div>
            
            <Button 
              size="sm"
              onClick={() => navigate("/dreams/new")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuovo Sogno</span>
            </Button>
            
            <UserMenu />
          </div>
        ) : (
          // Menu per utenti non loggati
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-8 mr-4">
              <button
                onClick={() => navigate("/explore")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Esplora
              </button>
            </div>
            <Button 
              variant="outline-white" 
              size="sm"
              onClick={() => navigate("/auth?mode=login")}
            >
              Accedi
            </Button>
            <RainbowButton 
              className="h-9 px-4 text-sm"
              onClick={() => navigate("/auth?mode=signup")}
            >
              Inizia Ora
            </RainbowButton>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;