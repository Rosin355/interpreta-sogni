import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedValue: boolean | null = null;
let cachedUserId: string | null = null;

/** Ritorna true se l'utente loggato è super_admin. Cache in-memory. */
export const useIsSuperAdmin = (): boolean => {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(
    cachedValue ?? false
  );

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) setIsSuperAdmin(false);
        return;
      }
      if (cachedUserId === user.id && cachedValue !== null) {
        if (mounted) setIsSuperAdmin(cachedValue);
        return;
      }
      const { data, error } = await supabase.rpc("is_super_admin", {
        _user_id: user.id,
      });
      if (error) {
        console.warn("is_super_admin check failed", error);
        if (mounted) setIsSuperAdmin(false);
        return;
      }
      cachedUserId = user.id;
      cachedValue = !!data;
      if (mounted) setIsSuperAdmin(!!data);
    };
    check();
    return () => {
      mounted = false;
    };
  }, []);

  return isSuperAdmin;
};
