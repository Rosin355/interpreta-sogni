import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import UserMenu from "./UserMenu";
import { Plus, Menu, User as UserIcon, Settings, BookOpen, LayoutDashboard, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dreamAlchemistLogo from "@/assets/dreamalchemist_logo.png";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger } from
"@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";

const Navigation = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkUserAndAdmin = async () => {
      console.log("[Navigation] checkUserAndAdmin START");
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log("[Navigation] getUser result", { user, error });
      setUser(user);

      if (user) {
        // Carica profilo per avatar nel mobile menu
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(profileData);

        const { data: isAdminData, error: isAdminError } = await supabase.rpc('is_admin', { _user_id: user.id });
        console.log("[Navigation] is_admin (init) result", { isAdminData, isAdminError });
        setIsAdmin(!!isAdminData);

        const { data: isSuperAdminData, error: isSuperAdminError } = await supabase.rpc('is_super_admin', { _user_id: user.id });
        console.log("[Navigation] is_super_admin (init) result", { isSuperAdminData, isSuperAdminError });
        setIsSuperAdmin(!!isSuperAdminData);
      } else {
        console.log("[Navigation] no user on init, setting isAdmin = false");
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setProfile(null);
      }
    };

    checkUserAndAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[Navigation] onAuthStateChange", { event, hasSession: !!session });
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            console.log("[Navigation] checking is_admin after auth event for", session.user.id);

            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();
            setProfile(profileData);

            const { data: isAdminData, error: isAdminError } = await supabase.rpc('is_admin', { _user_id: session.user.id });
            console.log("[Navigation] is_admin (auth event) result", { isAdminData, isAdminError });
            setIsAdmin(!!isAdminData);

            const { data: isSuperAdminData, error: isSuperAdminError } = await supabase.rpc('is_super_admin', { _user_id: session.user.id });
            console.log("[Navigation] is_super_admin (auth event) result", { isSuperAdminData, isSuperAdminError });
            setIsSuperAdmin(!!isSuperAdminData);
          }, 0);
        } else {
          console.log("[Navigation] no session, setting isAdmin = false");
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const getInitials = () => {
    if (profile?.username) {
      const names = profile.username.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return profile.username.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleMobileLogout = async () => {
    setMobileMenuOpen(false);
    try {
      await supabase.auth.signOut();
      toast({ title: "Disconnesso", description: "Logout effettuato con successo." });
      navigate("/");
    } catch (err) {
      toast({ title: "Errore", description: "Impossibile disconnettersi. Riprova.", variant: "destructive" });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container mx-auto px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(user ? "/dashboard" : "/")}>
          <img src={dreamAlchemistLogo} alt="Dream Alchemist" className="w-16 h-16 object-contain" />
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="text-lg font-bodoni-heading uppercase tracking-[0.18em] text-foreground whitespace-nowrap sm:text-lg">
              Dream Alchemist
            </span>
            <div className="mt-1.5 flex items-center justify-center gap-2 w-full">
              <span className="h-px flex-1 bg-foreground/40 rounded-full" />
              <span className="text-foreground/60 text-xs sm:text-sm leading-none select-none">☾</span>
              <span className="h-px flex-1 bg-foreground/40 rounded-full" />
            </div>
          </div>
        </div>
        
        {user ?
        // Menu per utenti loggati
        <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-6">
              <button
              onClick={() => navigate("/explore")}
              className="text-muted-foreground hover:text-foreground transition-colors">
                Esplora
              </button>
              <button
              onClick={() => navigate("/my-dreams")}
              className="text-muted-foreground hover:text-foreground transition-colors">
                I Miei Sogni
              </button>
              <button
              onClick={() => navigate("/astrology")}
              className="text-muted-foreground hover:text-foreground transition-colors">
                Astrologia
              </button>
              <button
              onClick={() => navigate("/alchemy")}
              className="text-muted-foreground hover:text-foreground transition-colors">
                Alchimia
              </button>
              <button
              onClick={() => navigate("/shared-with-me")}
              className="text-muted-foreground hover:text-foreground transition-colors">
                Sogni Condivisi
              </button>
              <button
              onClick={() => navigate("/audio-library")}
              className="text-muted-foreground hover:text-foreground transition-colors">
                Percorsi Audio
              </button>
              <button
              onClick={() => navigate("/about")}
              className="text-muted-foreground hover:text-foreground transition-colors">
                Chi Siamo
              </button>
            </div>

            {isAdmin &&
          <div className="hidden md:flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 shadow-sm">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-primary">
                  {isSuperAdmin ? "👑 SUPER ADMIN" : "Modalità Admin"}
                </span>
                <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin")}
              className="h-7 px-2 text-[11px]">
                  Dashboard
                </Button>
              </div>
          }
            
            <Button
            size="sm"
            onClick={() => navigate("/dreams/new")}
            className="gap-2 hidden sm:flex">
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
              <SheetContent side="right" className="w-[300px] flex flex-col">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>

                {/* Profilo utente — cliccabile → naviga a /profile */}
                <button
                  onClick={() => {
                    navigate("/profile");
                    setMobileMenuOpen(false);
                  }}
                  className="mt-4 flex items-center gap-3 px-3 py-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors w-full text-left"
                >
                  <Avatar className="h-10 w-10 border-2 border-primary/20 shrink-0">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.username || user?.email} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {profile?.username || "Profilo"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </span>
                  </div>
                </button>

                {/* Badge Admin */}
                {isAdmin &&
                  <div className="mt-3 px-4 py-3 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                        {isSuperAdmin ? "👑 SUPER ADMIN" : "Modalità Admin"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isSuperAdmin ? "Accesso completo a tutti i dati" : "Stai usando l'app come amministratore."}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigate("/admin");
                        setMobileMenuOpen(false);
                      }}
                      className="ml-3 text-xs h-8 px-3">
                      Dashboard
                    </Button>
                  </div>
                }

                {/* Voci di navigazione */}
                <div className="flex flex-col space-y-1 mt-6 flex-1">
                  <button
                    onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => { navigate("/explore"); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                    <span className="h-4 w-4 shrink-0 text-center">🔭</span>
                    Esplora
                  </button>
                  <button
                    onClick={() => { navigate("/my-dreams"); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    I Miei Sogni
                  </button>
                  <button
                    onClick={() => { navigate("/astrology"); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                    <span className="h-4 w-4 shrink-0 text-center">♈</span>
                    Astrologia
                  </button>
                  <button
                    onClick={() => { navigate("/alchemy"); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                    <span className="h-4 w-4 shrink-0 text-center">⚗️</span>
                    Alchimia
                  </button>
                  <button
                    onClick={() => { navigate("/shared-with-me"); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                    <span className="h-4 w-4 shrink-0 text-center">🌙</span>
                    Sogni Condivisi
                  </button>
                  <button
                    onClick={() => { navigate("/audio-library"); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                    <span className="h-4 w-4 shrink-0 text-center">🎧</span>
                    Percorsi Audio
                  </button>
                  <button
                    onClick={() => { navigate("/about"); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                    <span className="h-4 w-4 shrink-0 text-center">ℹ️</span>
                    Chi Siamo
                  </button>

                  {/* Sezione Account */}
                  <div className="pt-2 border-t border-border mt-2 space-y-1">
                    <button
                      onClick={() => { navigate("/profile"); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors w-full">
                      <UserIcon className="h-4 w-4 shrink-0" />
                      Profilo
                    </button>
                    <button
                      onClick={() => { navigate("/settings"); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors w-full">
                      <Settings className="h-4 w-4 shrink-0" />
                      Impostazioni
                    </button>
                    <button
                      onClick={handleMobileLogout}
                      className="flex items-center gap-3 text-left px-4 py-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors w-full">
                      <LogOut className="h-4 w-4 shrink-0" />
                      Disconnetti
                    </button>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => { navigate("/dreams/new"); setMobileMenuOpen(false); }}
                      className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Nuovo Sogno
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div> :

        // Menu per utenti non loggati
        <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-8 mr-4">
              <button
              onClick={() => navigate("/explore")}
              className="text-muted-foreground hover:text-foreground transition-colors">
                Esplora
              </button>
              <button
              onClick={() => navigate("/about")}
              className="text-muted-foreground hover:text-foreground transition-colors">
                Chi Siamo
              </button>
            </div>
            <Button
            variant="outline-white"
            size="sm"
            className="h-9 px-3 sm:px-4 hidden sm:flex"
            onClick={() => navigate("/auth?mode=login")}>
              Accedi
            </Button>
            <RainbowButton
            className="h-9 px-3 sm:px-4 text-sm hidden sm:flex"
            onClick={() => navigate("/auth?mode=signup")}>
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
                  className="text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                    Esplora
                  </button>
                  <button
                  onClick={() => {
                    navigate("/about");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                    Chi Siamo
                  </button>
                  <div className="pt-4 border-t border-border space-y-3">
                    <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate("/auth?mode=login");
                      setMobileMenuOpen(false);
                    }}>
                      Accedi
                    </Button>
                    <RainbowButton
                    className="w-full"
                    onClick={() => {
                      navigate("/auth?mode=signup");
                      setMobileMenuOpen(false);
                    }}>
                      Inizia Ora
                    </RainbowButton>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        }
      </div>
    </nav>);

};

export default Navigation;
