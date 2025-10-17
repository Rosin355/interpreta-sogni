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
import { BookOpen, User as UserIcon, Settings, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const UserMenu = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile disconnettersi. Riprova.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Disconnesso",
        description: "Logout effettuato con successo.",
      });
      navigate("/");
    }
  };

  const getInitials = () => {
    if (profile?.username) {
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
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnetti</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
