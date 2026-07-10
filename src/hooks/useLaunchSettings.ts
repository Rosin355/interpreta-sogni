import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "launch_announcement_enabled";
const EVENT = "launch-settings-changed";

export type LaunchSettingsRow = {
  enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
  updated_by_email?: string | null;
};

const parseValue = (v: unknown): boolean =>
  v === true || v === "true" ? true : v === false || v === "false" ? false : true;

export const useLaunchSettings = ({ realtime = false }: { realtime?: boolean } = {}) => {
  const [data, setData] = useState<LaunchSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastGoodRef = useRef<LaunchSettingsRow | null>(null);

  const enrichEmail = useCallback(async (row: LaunchSettingsRow) => {
    if (!row.updated_by) return row;
    const { data: prof } = await (supabase as any)
      .from("profiles")
      .select("username")
      .eq("id", row.updated_by)
      .maybeSingle();
    return { ...row, updated_by_email: prof?.username ?? null };
  }, []);

  const fetchFlag = useCallback(async () => {
    setError(null);
    const { data: row, error: err } = await (supabase as any)
      .from("app_settings")
      .select("value, updated_at, updated_by")
      .eq("key", KEY)
      .maybeSingle();
    if (err) {
      setError(err.message || "Errore nel recupero dell'impostazione");
      // Keep last good state if available
      if (!lastGoodRef.current) {
        setData({ enabled: true, updated_at: null, updated_by: null });
      }
    } else {
      const next: LaunchSettingsRow = {
        enabled: parseValue(row?.value),
        updated_at: row?.updated_at ?? null,
        updated_by: row?.updated_by ?? null,
      };
      // Only admin/realtime callers need updated_by's email (a 2nd query on
      // `profiles`). App-wide "lite" clients only need the boolean `enabled`,
      // so keep the profiles lookup off the hot path.
      const finalRow = realtime ? await enrichEmail(next) : next;
      lastGoodRef.current = finalRow;
      setData(finalRow);
    }
    setLoading(false);
  }, [enrichEmail, realtime]);

  useEffect(() => {
    fetchFlag();

    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<LaunchSettingsRow>).detail;
      if (detail) {
        lastGoodRef.current = detail;
        setData(detail);
      }
    };
    window.addEventListener(EVENT, onLocal);

    // App-wide "lite" clients must NOT keep an app-wide Realtime subscription:
    // it amplifies load on an already-struggling backend. Realtime is opt-in
    // (admin only). By default the hook does a one-time fetch on mount plus the
    // same-tab CustomEvent listener above.
    if (!realtime) {
      return () => {
        window.removeEventListener(EVENT, onLocal);
      };
    }

    const channel = supabase
      .channel("app_settings_launch")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "app_settings", filter: `key=eq.${KEY}` },
        () => {
          // Realtime hint received → refetch authoritative state (also resolves auth/RLS)
          fetchFlag();
        },
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Do NOT refetch here. The Supabase client auto-reconnects on its
          // own; piling REST calls on top of a struggling backend caused a
          // retry storm. Surface the error only.
          setError("Connessione realtime interrotta — aggiornamento manuale necessario");
        }
      });

    return () => {
      window.removeEventListener(EVENT, onLocal);
      supabase.removeChannel(channel);
    };
  }, [fetchFlag, realtime]);

  const setFlag = useCallback(
    async (next: boolean): Promise<{ ok: boolean; error?: string }> => {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await (supabase as any)
        .from("app_settings")
        .upsert(
          {
            key: KEY,
            value: next,
            updated_at: new Date().toISOString(),
            updated_by: user?.id ?? null,
          },
          { onConflict: "key" },
        );
      if (err) {
        const msg = err.message || "Errore durante il salvataggio";
        setError(msg);
        // Refetch to revert UI to authoritative state
        await fetchFlag();
        return { ok: false, error: msg };
      }
      // Refetch to load updated_by/updated_at exactly as DB stored them
      await fetchFlag();
      const fresh = lastGoodRef.current ?? {
        enabled: next,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      };
      window.dispatchEvent(new CustomEvent(EVENT, { detail: fresh }));
      return { ok: true };
    },
    [fetchFlag],
  );

  return {
    enabled: data?.enabled ?? true,
    updatedAt: data?.updated_at ?? null,
    updatedBy: data?.updated_by ?? null,
    updatedByLabel: data?.updated_by_email ?? null,
    loading,
    error,
    setFlag,
    refetch: fetchFlag,
  };
};
