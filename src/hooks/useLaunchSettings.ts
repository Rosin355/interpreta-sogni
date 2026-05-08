import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "launch_announcement_enabled";
const EVENT = "launch-settings-changed";

const parseValue = (v: unknown): boolean =>
  v === true || v === "true" ? true : v === false || v === "false" ? false : true;

export const useLaunchSettings = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFlag = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("app_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    setEnabled(error ? true : parseValue(data?.value));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFlag();

    // Local cross-component sync (same tab)
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === "boolean") setEnabled(detail);
    };
    window.addEventListener(EVENT, onLocal);

    // Supabase realtime sync (other tabs / users)
    const channel = supabase
      .channel("app_settings_launch")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "app_settings", filter: `key=eq.${KEY}` },
        (payload: any) => {
          const v = payload?.new?.value;
          if (v !== undefined) setEnabled(parseValue(v));
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener(EVENT, onLocal);
      supabase.removeChannel(channel);
    };
  }, [fetchFlag]);

  const setFlag = useCallback(async (next: boolean) => {
    const { error } = await (supabase as any)
      .from("app_settings")
      .upsert(
        { key: KEY, value: next, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (!error) {
      setEnabled(next);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
    }
    return !error;
  }, []);

  return { enabled: enabled ?? true, loading, setFlag, refetch: fetchFlag };
};
