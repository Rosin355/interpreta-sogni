import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

let globalUser: User | null = null;
let globalLoading = true;
let listeners: Array<(user: User | null, loading: boolean) => void> = [];

const notify = () => {
  listeners.forEach(l => l(globalUser, globalLoading));
};

const handleAuthError = async (error: any) => {
  console.error("[useAuth] Critical Auth Error:", error);
  if (error?.message?.includes("Refresh Token") || error?.status === 400 || error?.status === 401) {
    console.warn("[useAuth] Invalid session detected, clearing...");
    await supabase.auth.signOut();
    globalUser = null;
    globalLoading = false;
    notify();
  }
};

// Initial check
supabase.auth.getSession().then(({ data: { session }, error }) => {
  if (error) {
    handleAuthError(error);
    return;
  }
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}).catch(handleAuthError);

// Listen for auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log("[useAuth] Auth Event:", event, !!session);
  
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    globalUser = null;
  } else if (session) {
    globalUser = session.user;
  }

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
