// Get Astrology Profile — read-only normalizer for the iOS Celeste tab (Phase 1).
//
// Reads ONLY the authenticated user's row from public.profiles and returns a
// safe, normalized minimal shape (Big Three / Planets / profile completion).
//
// This function:
//   * does NOT call the Astrologer API (or any provider) — it only reads the
//     cached `natal_chart_data` already on the profile.
//   * does NOT mutate the database.
//   * never accepts a client-supplied user_id — it always uses auth.user.id.
//   * never returns the raw provider payload (natal_chart_data) or natal_context.
//
// Privacy: birth date/time/place, coordinates, raw chart JSON, natal_context,
// JWTs and secrets are NEVER logged. Logs carry only userIdPrefix + booleans.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const prefix = (id: string) => (id ?? "").slice(0, 8);

// ---- Sign / element / modality reference ---------------------------------

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;
type Sign = typeof SIGNS[number];

// Tolerant aliases → canonical English sign. Covers 3-letter abbreviations,
// lowercase, and Italian names that may appear in older/alternate payloads.
const SIGN_ALIASES: Record<string, Sign> = {
  ari: "Aries", tau: "Taurus", gem: "Gemini", can: "Cancer", leo: "Leo",
  vir: "Virgo", lib: "Libra", sco: "Scorpio", sag: "Sagittarius",
  cap: "Capricorn", aqu: "Aquarius", pis: "Pisces",
  ariete: "Aries", toro: "Taurus", gemelli: "Gemini", cancro: "Cancer",
  leone: "Leo", vergine: "Virgo", bilancia: "Libra", scorpione: "Scorpio",
  sagittario: "Sagittarius", capricorno: "Capricorn", acquario: "Aquarius",
  pesci: "Pisces",
};

const ELEMENT_BY_SIGN: Record<Sign, string> = {
  Aries: "Fuoco", Leo: "Fuoco", Sagittarius: "Fuoco",
  Taurus: "Terra", Virgo: "Terra", Capricorn: "Terra",
  Gemini: "Aria", Libra: "Aria", Aquarius: "Aria",
  Cancer: "Acqua", Scorpio: "Acqua", Pisces: "Acqua",
};

const MODALITY_BY_SIGN: Record<Sign, string> = {
  Aries: "Cardinale", Cancer: "Cardinale", Libra: "Cardinale", Capricorn: "Cardinale",
  Taurus: "Fisso", Leo: "Fisso", Scorpio: "Fisso", Aquarius: "Fisso",
  Gemini: "Mobile", Virgo: "Mobile", Sagittarius: "Mobile", Pisces: "Mobile",
};

const SIGN_SUMMARY: Record<Sign, string> = {
  Aries: "Slancio e coraggio iniziatico",
  Taurus: "Radici, sensi e costanza",
  Gemini: "Curiosità, parola e scambio",
  Cancer: "Memoria, cura e profondità emotiva",
  Leo: "Calore, espressione e dignità",
  Virgo: "Discernimento e cura del dettaglio",
  Libra: "Armonia, relazione e misura",
  Scorpio: "Intensità e trasformazione",
  Sagittarius: "Ricerca, senso e orizzonti",
  Capricorn: "Struttura, tempo e responsabilità",
  Aquarius: "Visione, libertà e originalità",
  Pisces: "Sensibilità, sogno e compassione",
};

const PLANET_GLYPH: Record<string, string> = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂",
  jupiter: "♃", saturn: "♄", uranus: "♅", neptune: "♆", pluto: "♇",
};

const PLANET_SUMMARY: Record<string, string> = {
  sun: "Identità, vitalità e direzione del Sé",
  moon: "Emozioni, memoria e bisogni profondi",
  mercury: "Mente, comunicazione e percezione",
  venus: "Amore, valore e ciò che ci attrae",
  mars: "Azione, desiderio e spinta vitale",
  jupiter: "Significato, espansione e fiducia",
  saturn: "Limite, tempo e maturazione",
  uranus: "Rottura, libertà e risveglio",
  neptune: "Sogno, mistica e dissoluzione",
  pluto: "Morte-rinascita e potere profondo",
};

// Display order for the Celeste planets module.
const PLANET_ORDER = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
];

// Personal points weighed for dominant element/modality.
const DOMINANCE_KEYS = ["sun", "moon", "mercury", "venus", "mars", "ascendant"];

// ---- Tolerant helpers (never throw) --------------------------------------

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** Normalize any sign representation to a canonical English sign, or null. */
function normalizeSignName(raw: unknown): Sign | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  const tc = titleCase(v);
  if ((SIGNS as readonly string[]).includes(tc)) return tc as Sign;
  const alias = SIGN_ALIASES[v.toLowerCase()];
  return alias ?? null;
}

const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Pull a single planet/point node from a chart, tolerating object- or
 * array-keyed shapes and a few alternate field names. Returns null safely. */
// deno-lint-ignore no-explicit-any
function pickNode(chart: any, key: string): any | null {
  if (!chart || typeof chart !== "object") return null;
  const planets = chart.planets ?? chart;
  if (planets && typeof planets === "object" && !Array.isArray(planets)) {
    if (planets[key] && typeof planets[key] === "object") return planets[key];
  }
  if (Array.isArray(planets)) {
    const hit = planets.find(
      (p) => typeof p?.name === "string" && p.name.toLowerCase() === key,
    );
    if (hit) return hit;
  }
  // Top-level fallbacks (e.g. chart.sun, chart.ascendant).
  if (chart[key] && typeof chart[key] === "object") return chart[key];
  return null;
}

// deno-lint-ignore no-explicit-any
function signOf(chart: any, key: string): Sign | null {
  const node = pickNode(chart, key);
  return normalizeSignName(node?.sign ?? node?.sign_name ?? node?.signName);
}

// deno-lint-ignore no-explicit-any
function degreeOf(chart: any, key: string): number | null {
  const node = pickNode(chart, key);
  return numOrNull(node?.degree ?? node?.deg ?? node?.position);
}

// deno-lint-ignore no-explicit-any
function extractSunSign(chart: any): Sign | null { return signOf(chart, "sun"); }
// deno-lint-ignore no-explicit-any
function extractMoonSign(chart: any): Sign | null { return signOf(chart, "moon"); }
// deno-lint-ignore no-explicit-any
function extractAscendantSign(chart: any): Sign | null {
  return signOf(chart, "ascendant") ?? signOf(chart, "rising") ?? signOf(chart, "asc")
    ?? normalizeSignName(chart?.ascendant?.sign)
    ?? normalizeSignName(Array.isArray(chart?.houses) ? chart.houses[0]?.sign : null);
}

// deno-lint-ignore no-explicit-any
function extractPlanetList(chart: any): Array<Record<string, unknown>> {
  if (!chart || typeof chart !== "object") return [];
  return PLANET_ORDER.map((key) => {
    const node = pickNode(chart, key);
    if (!node) return null;
    const sign = normalizeSignName(node.sign ?? node.sign_name);
    return {
      name: titleCase(key),
      glyph: PLANET_GLYPH[key] ?? "",
      sign,
      degree: numOrNull(node.degree ?? node.deg),
      house: numOrNull(node.house),
      retrograde: typeof node.retrograde === "boolean" ? node.retrograde : null,
      summary: PLANET_SUMMARY[key] ?? null,
    };
  }).filter(Boolean) as Array<Record<string, unknown>>;
}

// deno-lint-ignore no-explicit-any
function tallyDominant(chart: any, table: Record<Sign, string>): string | null {
  const counts: Record<string, number> = {};
  for (const key of DOMINANCE_KEYS) {
    const sign = signOf(chart, key);
    if (!sign) continue;
    const bucket = table[sign];
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  let best: string | null = null;
  let max = 0;
  for (const [k, n] of Object.entries(counts)) {
    if (n > max) { best = k; max = n; }
  }
  return best;
}

// deno-lint-ignore no-explicit-any
const inferDominantElement = (chart: any) => tallyDominant(chart, ELEMENT_BY_SIGN);
// deno-lint-ignore no-explicit-any
const inferDominantModality = (chart: any) => tallyDominant(chart, MODALITY_BY_SIGN);

const signSummary = (sign: Sign | null): string | null =>
  sign ? SIGN_SUMMARY[sign] : null;

// deno-lint-ignore no-explicit-any
function housesAvailable(chart: any): boolean {
  if (Array.isArray(chart?.houses) && chart.houses.length > 0) return true;
  return PLANET_ORDER.some((k) => numOrNull(pickNode(chart, k)?.house) !== null);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorizzato" }, 401);

    // Validate the JWT and resolve the user (never trust a client-sent id).
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Non autorizzato" }, 401);

    // Service role read, hard-filtered to the authenticated user's own row only.
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select(
        "birth_date, birth_time, birth_place_name, birth_latitude, birth_longitude, birth_timezone, natal_chart_data, updated_at",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      console.error(`[get-astrology-profile] read error code=${profErr.code ?? "unknown"}`);
      return json({ error: "Errore lettura profilo" }, 500);
    }

    const hasBirthDate = !!profile?.birth_date;
    const hasBirthTime = !!profile?.birth_time;
    const hasBirthPlace = !!profile?.birth_place_name;
    const hasCoordinates =
      typeof profile?.birth_latitude === "number" &&
      typeof profile?.birth_longitude === "number";

    const chart = profile?.natal_chart_data ?? null;
    const chartAvailable = !!chart && typeof chart === "object";

    const sunSign = chartAvailable ? extractSunSign(chart) : null;
    const moonSign = chartAvailable ? extractMoonSign(chart) : null;
    const risingSign = chartAvailable ? extractAscendantSign(chart) : null;
    const planets = chartAvailable ? extractPlanetList(chart) : [];

    const profileComplete = hasBirthDate && hasBirthTime && hasCoordinates;

    console.log(
      `[get-astrology-profile] userIdPrefix=${prefix(user.id)} profileComplete=${profileComplete} natalChartAvailable=${chartAvailable}`,
    );

    return json({
      profile_complete: profileComplete,
      birth_profile: {
        has_birth_date: hasBirthDate,
        has_birth_time: hasBirthTime,
        has_birth_place: hasBirthPlace,
        has_coordinates: hasCoordinates,
        timezone: profile?.birth_timezone ?? null,
        birth_place_name: profile?.birth_place_name ?? null,
      },
      big_three: {
        sun: { sign: sunSign, degree: chartAvailable ? degreeOf(chart, "sun") : null, label: "Sun Sign", summary: signSummary(sunSign) },
        moon: { sign: moonSign, degree: chartAvailable ? degreeOf(chart, "moon") : null, label: "Moon Sign", summary: signSummary(moonSign) },
        rising: { sign: risingSign, degree: chartAvailable ? (degreeOf(chart, "ascendant") ?? degreeOf(chart, "rising")) : null, label: "Rising", summary: signSummary(risingSign) },
      },
      natal_chart: {
        available: chartAvailable,
        dominant_element: chartAvailable ? inferDominantElement(chart) : null,
        dominant_modality: chartAvailable ? inferDominantModality(chart) : null,
        houses_available: chartAvailable ? housesAvailable(chart) : false,
        last_updated: profile?.updated_at ?? null,
        stale: false,
      },
      planets,
      current_sky: {
        available: false,
        moon_phase: null,
        moon_day: null,
        moon_cycle_length: null,
        planet_positions: [],
        last_updated: null,
        stale: true,
      },
      provider: { name: "astrologer_api", cached: true },
    });
  } catch (e) {
    // Truncated message only — never payloads/birth data.
    console.error(
      `[get-astrology-profile] unhandled: ${String((e as Error)?.message ?? e).slice(0, 100)}`,
    );
    return json({ error: "Errore interno" }, 500);
  }
});
