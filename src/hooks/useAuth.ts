import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

let globalUser: User | null = null;
let globalLoading = true;
let listeners: Array<(user: User | null, loading: boolean) => void> = [];

const notify = () => {
  listeners.forEach(l => l(globalUser, globalLoading));
};

// Initial check
supabase.auth.getSession().then(({ data: { session } }) => {
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
});

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
});

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(globalUser);
  const [loading, setLoading] = useState(globalLoading);

  useEffect(() => {
    const handler = (u: User | null, l: boolean) => {
      setUser(u);
      setLoading(l);
    };
    
    listeners.push(handler);
    return () => {
      listeners = listeners.filter(l => l !== handler);
    };
  }, []);

  return { user, loading };
};
