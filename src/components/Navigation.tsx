import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { MiniNavbar } from "./ui/mini-navbar";

const Navigation = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial check
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  // If user is logged in, we don't render the top navigation bar here
  // because the ModernDashboardLayout handles the navigation (sidebar/topbar).
  if (user) return null;

  // If user is guest, show the premium mini-navbar
  return <MiniNavbar />;
};

export default Navigation;
