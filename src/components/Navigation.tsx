import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import UserMenu from "./UserMenu";
import { Plus, Menu, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Navigation = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <span className="text-xl font-bold text-foreground">Dream's Alchemist</span>
        </div>
        
        {user ? (
          // Menu per utenti loggati
          <div className="flex items-center space-x-4">
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
                onClick={() => navigate("/astrology")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Astrologia
              </button>
              <button
                onClick={() => navigate("/about")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Chi Siamo
              </button>
            </div>
            
            <Button 
              size="sm"
              onClick={() => navigate("/dreams/new")}
              className="gap-2 hidden sm:flex"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuovo Sogno</span>
            </Button>
            
            <div className="hidden md:block">
              <UserMenu />
            </div>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  <button
                    onClick={() => {
                      navigate("/explore");
                      setMobileMenuOpen(false);
                    }}
                    className="text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    Esplora
                  </button>
                  <button
                    onClick={() => {
                      navigate("/my-dreams");
                      setMobileMenuOpen(false);
                    }}
                    className="text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    I Miei Sogni
                  </button>
                  <button
                    onClick={() => {
                      navigate("/collections");
                      setMobileMenuOpen(false);
                    }}
                    className="text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    Collezioni
                  </button>
                  <button
                    onClick={() => {
                      navigate("/astrology");
                      setMobileMenuOpen(false);
                    }}
                    className="text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    Astrologia
                  </button>
                  <button
                    onClick={() => {
                      navigate("/about");
                      setMobileMenuOpen(false);
                    }}
                    className="text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    Chi Siamo
                  </button>
                  <div className="pt-4 border-t border-border">
                    <Button 
                      onClick={() => {
                        navigate("/dreams/new");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Nuovo Sogno
                    </Button>
                  </div>
                  <div className="pt-4">
                    <UserMenu />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
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
              <button
                onClick={() => navigate("/about")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Chi Siamo
              </button>
            </div>
            <Button 
              variant="outline-white" 
              size="sm"
              className="h-9 px-3 sm:px-4 hidden sm:flex"
              onClick={() => navigate("/auth?mode=login")}
            >
              Accedi
            </Button>
            <RainbowButton 
              className="h-9 px-3 sm:px-4 text-sm hidden sm:flex"
              onClick={() => navigate("/auth?mode=signup")}
            >
              Inizia Ora
            </RainbowButton>

            {/* Mobile Menu for non-logged users */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="sm:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  <button
                    onClick={() => {
                      navigate("/explore");
                      setMobileMenuOpen(false);
                    }}
                    className="text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    Esplora
                  </button>
                  <button
                    onClick={() => {
                      navigate("/about");
                      setMobileMenuOpen(false);
                    }}
                    className="text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    Chi Siamo
                  </button>
                  <div className="pt-4 border-t border-border space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        navigate("/auth?mode=login");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Accedi
                    </Button>
                    <RainbowButton 
                      className="w-full"
                      onClick={() => {
                        navigate("/auth?mode=signup");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Inizia Ora
                    </RainbowButton>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;