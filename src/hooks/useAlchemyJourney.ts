import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppCache } from "@/contexts/AppCacheContext";
import { calculateUserJourney, type UserJourney } from "@/utils/alchemical-phases";
import { toast } from "sonner";

interface RefreshOptions {
  force?: boolean;
}

export const useAlchemyJourney = () => {
  const navigate = useNavigate();
  const {
    getAlchemyCache,
    setAlchemyCache,
    isStale,
    alchemyLastFetchedAt,
    isAlchemyRefreshing,
    setAlchemyRefreshing,
  } = useAppCache();

  const cached = getAlchemyCache();

  const [loading, setLoading] = useState(!cached);
  const [journey, setJourney] = useState<UserJourney | null>(cached?.journey ?? null);
  const [dreamsCount, setDreamsCount] = useState<number>(cached?.dreamsCount ?? 0);
  const [dreams, setDreams] = useState<any[]>(cached?.dreams ?? []);

  const fetchJourney = async (background = false) => {
    if (background) setAlchemyRefreshing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("dreams")
        .select("id, dream_date, content, mood, tags, interpretation, alchemical_phase")
        .eq("user_id", user.id)
        .order("dream_date", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const userJourney = calculateUserJourney(data);
        setJourney(userJourney);
        setDreamsCount(data.length);
        setDreams(data);
        setAlchemyCache({ journey: userJourney, dreamsCount: data.length, dreams: data });
      }
    } catch (error) {
      console.error("Error fetching dreams:", error);
      toast.error("Errore nel caricamento dei sogni");
    } finally {
      setLoading(false);
      if (background) setAlchemyRefreshing(false);
    }
  };

  const refresh = async (options?: RefreshOptions) => {
    // force=true: bypassa la cache e forza il refetch, mantenendo i dati visibili
    if (options?.force) {
      await fetchJourney(true);
      return;
    }
    const background = journey !== null;
    await fetchJourney(background);
  };

  useEffect(() => {
    if (cached && !isStale(alchemyLastFetchedAt)) {
      return;
    }
    fetchJourney(!!cached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    journey,
    dreamsCount,
    loading,
    isRefreshing: isAlchemyRefreshing,
    refresh,
  };
};
