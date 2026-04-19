import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

interface RouteLoadingContextValue {
  /** True quando almeno una pagina ha dichiarato di essere in caricamento dati. */
  isAnyPageLoading: boolean;
  /** Registra/aggiorna lo stato di caricamento di una pagina (per chiave). */
  setPageLoading: (key: string, loading: boolean) => void;
}

const RouteLoadingContext = createContext<RouteLoadingContextValue | null>(null);

export const RouteLoadingProvider = ({ children }: { children: ReactNode }) => {
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(() => new Set());

  const setPageLoading = useCallback((key: string, loading: boolean) => {
    setLoadingKeys((prev) => {
      const has = prev.has(key);
      if (loading && has) return prev;
      if (!loading && !has) return prev;
      const next = new Set(prev);
      if (loading) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const value = useMemo<RouteLoadingContextValue>(
    () => ({
      isAnyPageLoading: loadingKeys.size > 0,
      setPageLoading,
    }),
    [loadingKeys, setPageLoading],
  );

  return <RouteLoadingContext.Provider value={value}>{children}</RouteLoadingContext.Provider>;
};

export const useRouteLoading = () => {
  const ctx = useContext(RouteLoadingContext);
  if (!ctx) {
    // Fallback no-op per evitare crash se usato fuori dal provider
    return { isAnyPageLoading: false, setPageLoading: () => {} } as RouteLoadingContextValue;
  }
  return ctx;
};

/**
 * Hook helper: dichiara che la pagina corrente è in caricamento dati.
 * Si auto-pulisce allo smontaggio.
 */
export const usePageLoading = (loading: boolean, key?: string) => {
  const autoKey = useId();
  const finalKey = key ?? autoKey;
  const { setPageLoading } = useRouteLoading();
  const keyRef = useRef(finalKey);
  keyRef.current = finalKey;

  useEffect(() => {
    setPageLoading(keyRef.current, loading);
  }, [loading, setPageLoading]);

  useEffect(() => {
    return () => {
      setPageLoading(keyRef.current, false);
    };
  }, [setPageLoading]);
};
