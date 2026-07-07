import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

let globalUser: User | null = null;
let globalLoading = true;
let listeners: Array<(user: User | null, loading: boolean) => void> = [];
let bootResolved = false;

const notify = () => {
  listeners.forEach((l) => l(globalUser, globalLoading));
};

const resolveBoot = (user: User | null) => {
  bootResolved = true;
  globalUser = user;
  globalLoading = false;
  notify();
};

const isInvalidSessionError = (error: any): boolean => {
  const status = error?.status;
  const msg: string = error?.message ?? "";
  return (
    status === 400 ||
    status === 401 ||
    /Refresh Token|Invalid Refresh|not_found|refresh_token/i.test(msg)
  );
};

const handleAuthError = async (error: any) => {
  // Never log tokens/session payloads. Log only class + message.
  console.warn(
    "[useAuth] Auth boot error:",
    error?.name ?? "Error",
    error?.message ?? String(error),
  );

  if (isInvalidSessionError(error)) {
    // Stale refresh token: clear session so UI shows public/login page.
    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.warn(
        "[useAuth] signOut failed (ignored):",
        (signOutErr as any)?.message ?? signOutErr,
      );
    }
    resolveBoot(null);
    return;
  }

  // Network error / 5xx (e.g. Cloudflare 522) — do NOT wipe local session.
  // The stored token may still be valid; autoRefreshToken will retry later.
  // Just unblock the UI so the app renders instead of a blank screen.
  resolveBoot(null);
};

// Initial session check
supabase.auth
  .getSession()
  .then(({ data: { session }, error }) => {
    if (error) {
      void handleAuthError(error);
      return;
    }
    resolveBoot(session?.user ?? null);
  })
  .catch((err) => {
    void handleAuthError(err);
  });

// Safety timeout: never leave the app stuck on a blank loading screen.
// If neither getSession() nor onAuthStateChange resolved within 4s
// (e.g. Supabase edge is timing out with 522), unblock the UI.
setTimeout(() => {
  if (!bootResolved) {
    console.warn("[useAuth] Boot timeout — rendering app without session.");
    resolveBoot(null);
  }
}, 4000);

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log("[useAuth] Auth Event:", event, !!session);

  if (event === "SIGNED_OUT") {
    globalUser = null;
  } else if (session) {
    globalUser = session.user;
  }

  bootResolved = true;
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
    // Sync immediately in case boot already resolved before mount.
    handler(globalUser, globalLoading);

    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  return { user, loading };
};
