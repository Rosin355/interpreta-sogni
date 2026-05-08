import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "launch_announcement_enabled";

export const useLaunchSettings = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFlag = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("app_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    if (!error) {
      // value is jsonb boolean
      const v = data?.value;
      setEnabled(v === true || v === "true" ? true : v === false ? false : true);
    } else {
      setEnabled(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFlag();
  }, [fetchFlag]);

  const setFlag = useCallback(async (next: boolean) => {
    const { error } = await (supabase as any)
      .from("app_settings")
      .upsert(
        { key: KEY, value: next, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (!error) setEnabled(next);
    return !error;
  }, []);

  return { enabled: enabled ?? true, loading, setFlag, refetch: fetchFlag };
};
