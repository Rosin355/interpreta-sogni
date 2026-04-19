import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppCache } from "@/contexts/AppCacheContext";

const PAGE_SIZE = 12;
const SELECT_FIELDS =
  "id, title, dream_date, mood, tags, image_url, alchemical_phase, content";

interface RefreshOptions {
  force?: boolean;
}

export const useDreamsList = () => {
  const navigate = useNavigate();
  const {
    getDreamsCache,
    setDreamsCache,
    isStale,
    dreamsLastFetchedAt,
    isDreamsRefreshing,
    setDreamsRefreshing,
  } = useAppCache();

  const cached = getDreamsCache();

  const [dreams, setDreams] = useState<any[]>(cached?.dreams ?? []);
  const [loading, setLoading] = useState(!cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(cached?.offset ?? 0);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? false);
  const [totalCount, setTotalCount] = useState(cached?.totalCount ?? 0);

  const fetchInitial = async (background = false) => {
    if (background) setDreamsRefreshing(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?mode=login");
      return;
    }

    const [countRes, pageRes] = await Promise.all([
      supabase
        .from("dreams")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("dreams")
        .select(SELECT_FIELDS)
        .eq("user_id", user.id)
        .order("dream_date", { ascending: false })
        .range(0, PAGE_SIZE - 1),
    ]);

    if (pageRes.error) {
      console.error("Errore nel caricamento dei sogni:", pageRes.error);
    } else {
      const data = pageRes.data || [];
      const newOffset = data.length;
      const newHasMore = data.length === PAGE_SIZE;
      const newTotal = countRes.error ? totalCount : countRes.count || 0;

      setDreams(data);
      setOffset(newOffset);
      setHasMore(newHasMore);
      setTotalCount(newTotal);

      setDreamsCache({
        dreams: data,
        offset: newOffset,
        hasMore: newHasMore,
        totalCount: newTotal,
      });
    }

    setLoading(false);
    if (background) setDreamsRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?mode=login");
      return;
    }

    const { data, error } = await supabase
      .from("dreams")
      .select(SELECT_FIELDS)
      .eq("user_id", user.id)
      .order("dream_date", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Errore nel caricamento ulteriore:", error);
    } else {
      const batch = data || [];
      const merged = [...dreams, ...batch];
      const newOffset = offset + batch.length;
      const newHasMore = batch.length === PAGE_SIZE;
      setDreams(merged);
      setOffset(newOffset);
      setHasMore(newHasMore);
      setDreamsCache({
        dreams: merged,
        offset: newOffset,
        hasMore: newHasMore,
        totalCount,
      });
    }
    setLoadingMore(false);
  };

  const refresh = async (options?: RefreshOptions) => {
    const background = !options?.force && dreams.length > 0;
    await fetchInitial(background);
  };

  useEffect(() => {
    if (cached && !isStale(dreamsLastFetchedAt)) {
      return;
    }
    fetchInitial(!!cached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    dreams,
    loading,
    loadingMore,
    isRefreshing: isDreamsRefreshing,
    totalCount,
    hasMore,
    loadMore,
    refresh,
  };
};
