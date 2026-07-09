import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { MiniNavbar } from "./ui/mini-navbar";
import { LaunchAnnouncementBar } from "./LaunchAnnouncementBar";

const Navigation = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial check. Must never leave `loading` stuck true: if the auth
    // network call fails (e.g. Supabase 522 / CORS "Load failed"), treat the
    // visitor as a guest and still render the public navbar/login CTA.
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[Navigation] auth check failed, showing guest navbar:", message);
        setUser(null);
      } finally {
        setLoading(false);
      }
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
  return (
    <>
      <LaunchAnnouncementBar />
      <MiniNavbar />
    </>
  );
};

export default Navigation;
