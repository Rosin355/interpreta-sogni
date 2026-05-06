/**
 * Prefetch dei chunk lazy delle route più probabili dopo l'idle del browser.
 *
 * Strategia:
 * - Usa requestIdleCallback (fallback setTimeout) per non competere con il render iniziale.
 * - Importa dinamicamente i moduli: Vite/Rollup carica i chunk in cache HTTP +
 *   il module registry, così il successivo navigate è istantaneo.
 * - Silenzioso: errori ignorati (offline, chunk hash cambiato, ecc.).
 */

type Importer = () => Promise<unknown>;

const ROUTE_IMPORTERS: Record<string, Importer> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/my-dreams": () => import("@/pages/MyDreams"),
  "/dreams/new": () => import("@/pages/NewDream"),
  "/astrology": () => import("@/pages/Astrology"),
  "/alchemy": () => import("@/pages/Alchemy"),
  "/shared-with-me": () => import("@/pages/SharedDreamsReceived"),
  "/audio-library": () => import("@/pages/AudioLibrary"),
  "/about": () => import("@/pages/About"),
  "/explore": () => import("@/pages/Explore"),
  "/auth": () => import("@/pages/Auth"),
};

// Route ad alta probabilità di navigazione subito dopo l'apertura dell'app.
const HIGH_PRIORITY: Importer[] = [
  ROUTE_IMPORTERS["/dashboard"],
  ROUTE_IMPORTERS["/my-dreams"],
  ROUTE_IMPORTERS["/astrology"],
  ROUTE_IMPORTERS["/alchemy"],
  ROUTE_IMPORTERS["/shared-with-me"],
  ROUTE_IMPORTERS["/audio-library"],
  ROUTE_IMPORTERS["/about"],
];

// Route secondarie ma comuni nel flusso utente.
const MEDIUM_PRIORITY: Importer[] = [
  ROUTE_IMPORTERS["/dreams/new"],
  ROUTE_IMPORTERS["/explore"],
  ROUTE_IMPORTERS["/auth"],
  () => import("@/pages/Profile"),
];

const idle = (cb: () => void, timeout = 2000) => {
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(cb, { timeout });
  } else {
    window.setTimeout(cb, timeout);
  }
};

const runBatch = (batch: Importer[]) => {
  batch.forEach((imp) => {
    imp().catch(() => {
      /* silent: prefetch best-effort */
    });
  });
};

export const prefetchRoute = (href: string) => {
  ROUTE_IMPORTERS[href]?.().catch(() => {
    /* silent: prefetch best-effort */
  });
};

let started = false;

export const startRoutePrefetch = (immediate = false) => {
  if (started) return;
  started = true;

  if (typeof navigator !== "undefined") {
    // Rispetta connessioni lente / data saver.
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return;
  }

  const prefetch = () => {
    runBatch(HIGH_PRIORITY);
    idle(() => runBatch(MEDIUM_PRIORITY), immediate ? 700 : 1200);
  };

  if (immediate) {
    prefetch();
    return;
  }

  idle(prefetch, 350);
};
