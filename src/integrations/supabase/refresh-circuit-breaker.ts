/**
 * Refresh-token circuit breaker.
 *
 * Why this exists:
 * supabase-js (auth-js) runs an auto-refresh ticker every 30s. On failure it
 * retries *within* each tick with backoff, but the backoff RESETS every tick —
 * so during a backend outage it keeps firing
 * `POST /auth/v1/token?grant_type=refresh_token` roughly every ~20-30s,
 * indefinitely, with no cross-outage backoff and no circuit breaker. On an
 * Android/Capacitor WebView this was observed hammering an already-struggling
 * backend.
 *
 * What this does:
 * Wraps the global `fetch` and applies a circuit breaker ONLY to the refresh
 * endpoint. Everything else passes through untouched.
 *   - Exponential backoff + jitter, capped (cross-tick, unlike auth-js).
 *   - A single in-flight promise so concurrent refreshes share one request
 *     (multiple components/tabs can't each fire their own).
 *   - While the circuit is open, refresh requests are short-circuited locally
 *     (a synthetic 503) and never reach the backend, so repeated attempts
 *     during an outage stop hammering it. auth-js treats 5xx as retryable and
 *     keeps the session, so the UI degrades gracefully (guest shell) instead of
 *     signing the user out.
 *   - 400/401 (invalid/expired refresh token) is passed straight through and
 *     resets the breaker, so genuine sign-out still works. Only network / 5xx /
 *     429 open the circuit.
 *
 * Must be installed BEFORE the Supabase client is created so the client
 * captures the wrapped fetch (auth-js binds `fetch` at client-creation time).
 * See src/main.tsx — this module is imported first, and self-installs on import.
 *
 * No tokens or secrets are ever read or logged here.
 */

// Matches only the refresh grant (not password / pkce / id_token / web3 grants).
const REFRESH_GRANT = "grant_type=refresh_token";

const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 5 * 60_000; // hard cap: at most one refresh attempt / 5 min
const MAX_BACKOFF_STEPS = 8; // caps the exponent (2s, 4s, ... up to the cap)

let consecutiveFailures = 0;
let openUntil = 0; // epoch ms; circuit is "open" while Date.now() < openUntil
let inFlight: Promise<Response> | null = null;
let installed = false;

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url ?? "";
};

const isRefreshRequest = (input: RequestInfo | URL): boolean =>
  urlOf(input).includes(REFRESH_GRANT);

const backoffDelayMs = (failures: number): number => {
  const step = Math.min(failures, MAX_BACKOFF_STEPS);
  const base = Math.min(BASE_DELAY_MS * 2 ** (step - 1), MAX_DELAY_MS);
  const jitter = Math.random() * base * 0.3; // full-positive jitter: 100%–130%
  return Math.min(base + jitter, MAX_DELAY_MS);
};

const openCircuit = (): void => {
  consecutiveFailures += 1;
  const delay = backoffDelayMs(consecutiveFailures);
  openUntil = Date.now() + delay;
  // Safe log only: no tokens, no URLs with query, no response body.
  console.warn(
    `[auth-refresh] token refresh failing; pausing refresh for ~${Math.round(
      delay / 1000,
    )}s (attempt ${consecutiveFailures}).`,
  );
};

const closeCircuit = (): void => {
  if (consecutiveFailures > 0) {
    console.warn("[auth-refresh] token refresh recovered.");
  }
  consecutiveFailures = 0;
  openUntil = 0;
};

// Synthetic response returned while the circuit is open. 5xx so auth-js treats
// it as retryable (keeps the session) rather than clearing it.
const pausedResponse = (): Response =>
  new Response(
    JSON.stringify({
      error: "server_error",
      error_description: "Auth token refresh paused by client backoff.",
    }),
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json" },
    },
  );

export function installRefreshTokenCircuitBreaker(): void {
  if (installed) return;
  if (typeof globalThis === "undefined" || typeof globalThis.fetch !== "function") return;
  installed = true;

  const originalFetch: typeof fetch = globalThis.fetch.bind(globalThis);

  const wrapped: typeof fetch = (input, init) => {
    if (!isRefreshRequest(input)) {
      return originalFetch(input, init);
    }

    // Circuit OPEN → short-circuit locally; never touch the backend.
    if (Date.now() < openUntil) {
      return Promise.resolve(pausedResponse());
    }

    // Deduplicate concurrent refreshes: a single in-flight request is shared.
    if (inFlight) {
      return inFlight.then((r) => r.clone());
    }

    inFlight = (async () => {
      try {
        const res = await originalFetch(input, init);
        if (res.ok) {
          closeCircuit();
        } else if (res.status >= 500 || res.status === 429) {
          openCircuit(); // outage / rate limit → back off across ticks
        } else {
          // 4xx (e.g. 400/401 invalid_grant): not an outage. Reset so the
          // client can sign the user out normally on the next attempt.
          closeCircuit();
        }
        return res;
      } catch (err) {
        openCircuit(); // network failure → back off
        throw err;
      } finally {
        inFlight = null;
      }
    })();

    return inFlight.then((r) => r.clone());
  };

  globalThis.fetch = wrapped;
}

// Self-install on import so the client (imported afterwards) captures the
// wrapped fetch. Idempotent.
installRefreshTokenCircuitBreaker();
