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

// Route ad alta probabilità di navigazione subito dopo l'apertura dell'app.
const HIGH_PRIORITY: Importer[] = [
  () => import("@/pages/Dashboard"),
  () => import("@/pages/MyDreams"),
  () => import("@/pages/Auth"),
];

// Route secondarie ma comuni nel flusso utente.
const MEDIUM_PRIORITY: Importer[] = [
  () => import("@/pages/NewDream"),
  () => import("@/pages/Alchemy"),
  () => import("@/pages/Astrology"),
  () => import("@/pages/Profile"),
  () => import("@/pages/Explore"),
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
