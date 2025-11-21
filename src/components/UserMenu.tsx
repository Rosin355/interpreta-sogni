import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { BookOpen, User as UserIcon, Settings, LogOut, LayoutDashboard } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const UserMenu = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const loadUserAndProfile = async () => {
      try {
        console.log("[UserMenu] loadUserAndProfile START");
        console.log("[UserMenu] calling supabase.auth.getUser()...");
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        console.log("[UserMenu] getUser completed", { 
          hasUser: !!user, 
          userId: user?.id,
          userEmail: user?.email,
          error: error?.message 
        });
        
        setUser(user);
        
        if (user) {
          console.log("[UserMenu] fetching profile for user:", user.id);
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          
          console.log("[UserMenu] profile fetch completed", { 
            hasProfile: !!data,
            username: data?.username,
            error: profileError?.message 
          });
          
          setProfile(data);
        } else {
          console.log("[UserMenu] no user found, clearing profile");
          setProfile(null);
        }
      } catch (err) {
        console.error("[UserMenu] loadUserAndProfile ERROR:", err);
      }
    };

    loadUserAndProfile();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[UserMenu] onAuthStateChange", { event, hasSession: !!session });
      setUser(session?.user ?? null);
      
      // CRITICAL: Use setTimeout to avoid deadlock
      // Never call Supabase functions directly inside onAuthStateChange
      if (session?.user) {
        setTimeout(async () => {
          console.log("[UserMenu] fetching profile after auth event", { userId: session.user.id });
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          console.log("[UserMenu] profile fetch result (auth event)", { data, error });
          setProfile(data);
        }, 0);
      } else {
        console.log("[UserMenu] no session in onAuthStateChange, clearing profile");
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    console.log("[UserMenu] handleLogout START");
    
    // Aggiornamento immediato dello stato UI
    setUser(null);
    setProfile(null);
    
    try {
      const { error } = await supabase.auth.signOut();
      console.log("[UserMenu] signOut completed", { error: error?.message });
      
      if (error) {
        console.error("[UserMenu] signOut ERROR:", error);
        toast({
          title: "Errore",
          description: "Impossibile disconnettersi. Riprova.",
          variant: "destructive",
        });
      } else {
        console.log("[UserMenu] logout successful, navigating to /");
        toast({
          title: "Disconnesso",
          description: "Logout effettuato con successo.",
        });
        navigate("/");
      }
    } catch (err) {
      console.error("[UserMenu] handleLogout EXCEPTION:", err);
      toast({
        title: "Errore",
        description: "Si è verificato un errore inatteso durante il logout.",
        variant: "destructive",
      });
    }
  };

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none">
          <Avatar className="h-9 w-9 border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
            <AvatarImage src={profile?.avatar_url} alt={profile?.username || user?.email} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.username || "Utente"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          <span>Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/my-dreams")} className="cursor-pointer">
          <BookOpen className="mr-2 h-4 w-4" />
          <span>I Miei Sogni</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profilo</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Impostazioni</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            handleLogout();
          }}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnetti</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
