import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { ModernDashboardLayout } from "./ModernDashboardLayout";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Public routes that should NEVER have the dashboard layout (e.g., Auth, Landing)
  // Actually, Index (Landing) should probably redirect to Dashboard if logged in,
  // but if the user stays on Index, maybe they want the guest view?
  // User said: "cambiarla come visuale quando uno è loggato" -> implies universal change.
  
  const isAuthPage = location.pathname === "/auth";
  const isPublicSharedDream = location.pathname.startsWith("/dream/shared/");

  if (loading) return null;

  // If logged in AND not on a "pure" public page like Auth or Public Shared Dream
  if (user && !isAuthPage && !isPublicSharedDream) {
    return <ModernDashboardLayout>{children}</ModernDashboardLayout>;
  }

  // Guest view (or Auth/Shared Dream view)
  return <>{children}</>;
};
