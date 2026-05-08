import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useLaunchAcknowledgment = () => {
  const { user, loading: authLoading } = useAuth();
  const [needsAck, setNeedsAck] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("launch_announcement_acknowledgments")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!error && !data) setNeedsAck(true);
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const markAcknowledged = () => setNeedsAck(false);

  return { needsAck: needsAck && !!user, checked, markAcknowledged, userId: user?.id };
};
