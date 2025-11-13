import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GlobalNotificationManagerProps {
  children: React.ReactNode;
}

export const GlobalNotificationManager = ({ children }: GlobalNotificationManagerProps) => {
  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          toast({
            title: "Accesso effettuato",
            description: "Benvenuto! Sei ora connesso.",
          });
          break;
        case 'SIGNED_OUT':
          toast({
            title: "Disconnesso",
            description: "Sei stato disconnesso con successo.",
          });
          break;
        case 'PASSWORD_RECOVERY':
          toast({
            title: "Recupero password",
            description: "Controlla la tua email per reimpostare la password.",
          });
          break;
        case 'USER_UPDATED':
          toast({
            title: "Profilo aggiornato",
            description: "Le tue informazioni sono state aggiornate con successo.",
          });
          break;
      }
    });

    // Listen for network changes
    const handleOnline = () => {
      toast({
        title: "Connessione ripristinata",
        description: "Sei di nuovo online.",
      });
    };

    const handleOffline = () => {
      toast({
        title: "Connessione persa",
        description: "Sei offline. Alcune funzionalità potrebbero non essere disponibili.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if offline on mount
    if (!navigator.onLine) {
      toast({
        title: "Modalità offline",
        description: "Non sei connesso a Internet.",
        variant: "destructive",
      });
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return <>{children}</>;
};
