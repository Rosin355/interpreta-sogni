import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { UserJourney } from "@/utils/alchemical-phases";

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minuti

interface DreamsCachePayload {
  dreams: any[];
  offset: number;
  hasMore: boolean;
  totalCount: number;
}

interface AlchemyCachePayload {
  journey: UserJourney;
  dreamsCount: number;
  dreams?: any[];
}

interface CacheEntry<T> {
  data: T | null;
  fetchedAt: number | null;
}

interface AppCacheContextValue {
  // Dreams
  setDreamsCache: (payload: DreamsCachePayload) => void;
  getDreamsCache: () => DreamsCachePayload | null;
  invalidateDreamsCache: () => void;
  isDreamsRefreshing: boolean;
  setDreamsRefreshing: (v: boolean) => void;
  dreamsLastFetchedAt: number | null;

  // Alchemy
  setAlchemyCache: (payload: AlchemyCachePayload) => void;
  getAlchemyCache: () => AlchemyCachePayload | null;
  invalidateAlchemyCache: () => void;
  isAlchemyRefreshing: boolean;
  setAlchemyRefreshing: (v: boolean) => void;
  alchemyLastFetchedAt: number | null;

  isStale: (fetchedAt: number | null, ttlMs?: number) => boolean;
}

const AppCacheContext = createContext<AppCacheContextValue | null>(null);

export const AppCacheProvider = ({ children }: { children: ReactNode }) => {
  // Useref per evitare re-render quando il valore cambia (la cache è letta on-demand)
  const dreamsRef = useRef<CacheEntry<DreamsCachePayload>>({ data: null, fetchedAt: null });
  const alchemyRef = useRef<CacheEntry<AlchemyCachePayload>>({ data: null, fetchedAt: null });

  const [isDreamsRefreshing, setDreamsRefreshing] = useState(false);
  const [isAlchemyRefreshing, setAlchemyRefreshing] = useState(false);
  const [dreamsLastFetchedAt, setDreamsLastFetchedAt] = useState<number | null>(null);
  const [alchemyLastFetchedAt, setAlchemyLastFetchedAt] = useState<number | null>(null);

  const setDreamsCache = useCallback((payload: DreamsCachePayload) => {
    const now = Date.now();
    dreamsRef.current = { data: payload, fetchedAt: now };
    setDreamsLastFetchedAt(now);
  }, []);

  const getDreamsCache = useCallback(() => dreamsRef.current.data, []);

  const invalidateDreamsCache = useCallback(() => {
    dreamsRef.current = { data: null, fetchedAt: null };
    setDreamsLastFetchedAt(null);
  }, []);

  const setAlchemyCache = useCallback((payload: AlchemyCachePayload) => {
    const now = Date.now();
    alchemyRef.current = { data: payload, fetchedAt: now };
    setAlchemyLastFetchedAt(now);
  }, []);

  const getAlchemyCache = useCallback(() => alchemyRef.current.data, []);

  const invalidateAlchemyCache = useCallback(() => {
    alchemyRef.current = { data: null, fetchedAt: null };
    setAlchemyLastFetchedAt(null);
  }, []);

  const isStale = useCallback((fetchedAt: number | null, ttlMs: number = DEFAULT_TTL_MS) => {
    if (!fetchedAt) return true;
    return Date.now() - fetchedAt > ttlMs;
  }, []);

  return (
    <AppCacheContext.Provider
      value={{
        setDreamsCache,
        getDreamsCache,
        invalidateDreamsCache,
        isDreamsRefreshing,
        setDreamsRefreshing,
        dreamsLastFetchedAt,
        setAlchemyCache,
        getAlchemyCache,
        invalidateAlchemyCache,
        isAlchemyRefreshing,
        setAlchemyRefreshing,
        alchemyLastFetchedAt,
        isStale,
      }}
    >
      {children}
    </AppCacheContext.Provider>
  );
};

export const useAppCache = () => {
  const ctx = useContext(AppCacheContext);
  if (!ctx) throw new Error("useAppCache deve essere usato dentro AppCacheProvider");
  return ctx;
};

/**
 * Helper per formattare percentuali in modo stabile e leggibile.
 * Massimo 1 decimale, senza zeri inutili (es. 33 → "33", 33.33 → "33.3").
 */
export const formatPercentage = (value: number, decimals: 0 | 1 = 0): string => {
  if (!Number.isFinite(value)) return "0";
  const rounded = decimals === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(decimals);
};
