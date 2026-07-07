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

// ---- Body registry (core planets + additional bodies/points) --------------
// `name` is stable ENGLISH (iOS maps display names to Italian). Glyphs use safe
// symbols with short text fallbacks where a symbol may render poorly on iOS.
// `isAngle` marks time/ascendant-dependent points that must be OMITTED for
// unknown-time (noon-fallback) charts.
interface BodyDef {
  name: string;
  glyph: string;
  summary: string | null;
  isAngle: boolean;
  aliases: string[]; // matched case/space/underscore-insensitively
}

const normalizeKey = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, "");

// Core planets reuse the existing glyph/summary maps and order.
const CORE_BODY_DEFS: BodyDef[] = PLANET_ORDER.map((key) => ({
  name: titleCase(key),
  glyph: PLANET_GLYPH[key] ?? "",
  summary: PLANET_SUMMARY[key] ?? null,
  isAngle: false,
  aliases: [key],
}));

// Additional bodies/points in the required stable display order (rank 11+).
const EXTRA_BODY_DEFS: BodyDef[] = [
  { name: "Chiron", glyph: "⚷", summary: "Ferita e guarigione profonda", isAngle: false,
    aliases: ["chiron", "chirone"] },
  { name: "Lilith", glyph: "Lil", summary: "Ombra, istinto e desiderio autentico", isAngle: false,
    aliases: ["lilith", "meanlilith", "blackmoonlilith", "lilithmean", "meanblackmoon"] },
  { name: "North Node", glyph: "☊", summary: "Direzione evolutiva e crescita", isAngle: false,
    aliases: ["northnode", "nodonord", "truenode", "meannode", "truenorthnode", "meannorthnode",
              "northlunarnode", "truenorthlunarnode", "meannorthlunarnode", "nnode"] },
  { name: "South Node", glyph: "☋", summary: "Doni innati e schemi da lasciare", isAngle: false,
    aliases: ["southnode", "nodosud", "truesouthnode", "meansouthnode", "southlunarnode",
              "truesouthlunarnode", "meansouthlunarnode", "snode"] },
  { name: "Ascendant", glyph: "ASC", summary: "Maschera, corpo e primo impatto", isAngle: true,
    aliases: ["ascendant", "ascendente", "asc", "rising", "risingsign"] },
  { name: "Descendant", glyph: "DSC", summary: "Relazioni e proiezione sull'altro", isAngle: true,
    aliases: ["descendant", "discendente", "dsc", "desc"] },
  { name: "Midheaven", glyph: "MC", summary: "Vocazione, ruolo e immagine pubblica", isAngle: true,
    aliases: ["midheaven", "mediocielo", "mc", "mediumcoeli"] },
  { name: "Imum Coeli", glyph: "IC", summary: "Radici, casa e mondo interiore", isAngle: true,
    aliases: ["imumcoeli", "ic", "fondocielo"] },
  { name: "Ceres", glyph: "⚳", summary: "Nutrimento, cura e accudimento", isAngle: false,
    aliases: ["ceres", "cerere"] },
  { name: "Pallas", glyph: "⚴", summary: "Intelligenza creativa e strategia", isAngle: false,
    aliases: ["pallas", "pallade", "pallasathena"] },
  { name: "Juno", glyph: "⚵", summary: "Legami, patti e impegno", isAngle: false,
    aliases: ["juno", "giunone"] },
  { name: "Vesta", glyph: "⚶", summary: "Dedizione, fuoco interiore e focus", isAngle: false,
    aliases: ["vesta"] },
  { name: "Part of Fortune", glyph: "⊗", summary: "Punto di gioia e fluidità", isAngle: true,
    aliases: ["partoffortune", "partofortune", "fortune", "partedifortuna", "parsfortunae", "pof"] },
  { name: "Vertex", glyph: "Vx", summary: "Incontri fatali e svolte", isAngle: true,
    aliases: ["vertex", "vertice"] },
];

const ALL_BODY_DEFS: BodyDef[] = [...CORE_BODY_DEFS, ...EXTRA_BODY_DEFS];

// Every known alias (normalized) → keeps unknown-body discovery from re-adding a
// known body (e.g. an angle omitted for unknown-time charts).
const KNOWN_ALIAS_SET = new Set<string>(
  ALL_BODY_DEFS.flatMap((b) => b.aliases.map(normalizeKey)),
);

// Keys in natal_chart_data that are NOT placements — never treated as bodies.
const METADATA_KEYS = new Set<string>([
  "houses", "aspects", "housesystem", "housesystemname", "calculationdetails",
  "planets", "midheaven",
]);

/** Does a value look like a placement (a sign or a numeric degree/position)? */
// deno-lint-ignore no-explicit-any
function looksLikePlacement(v: any): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const hasSign = typeof v.sign === "string" || typeof v.sign_name === "string";
  const hasDeg = numOrNull(v.degree ?? v.deg ?? v.position ?? v.abs_pos) !== null;
  return hasSign || hasDeg;
}

/** Find a body node by any of its aliases across object-keyed, array, and
 * top-level shapes. Returns the node + the normalized source key it matched. */
// deno-lint-ignore no-explicit-any
function findBodyNode(chart: any, aliases: string[]): { node: any; srcKey: string } | null {
  const want = new Set(aliases.map(normalizeKey));
  // deno-lint-ignore no-explicit-any
  const containers: Array<[string, any]> = [];
  const planets = chart?.planets;
  if (planets && typeof planets === "object" && !Array.isArray(planets)) {
    for (const [k, v] of Object.entries(planets)) containers.push([k, v]);
  }
  if (Array.isArray(planets)) {
    for (const v of planets) {
      const nm = (v && typeof v === "object" && typeof v.name === "string") ? v.name : "";
      containers.push([nm, v]);
    }
  }
  if (chart && typeof chart === "object") {
    for (const [k, v] of Object.entries(chart)) {
      if (k === "planets") continue;
      containers.push([k, v]);
    }
  }
  for (const [k, v] of containers) {
    if (!looksLikePlacement(v)) continue;
    const nk = normalizeKey(k);
    const nn = typeof v.name === "string" ? normalizeKey(v.name) : "";
    if (want.has(nk) || (nn && want.has(nn))) return { node: v, srcKey: nk || nn };
  }
  return null;
}

/**
 * Build planets[]: core planets Sun→Pluto, then additional bodies/points that
 * are PRESENT in the cached chart, in a stable order, then any remaining unknown
 * placement-like bodies alphabetically. Never throws; never duplicates a body;
 * omits time-dependent angles when includeAngles is false (unknown-time charts).
 */
// deno-lint-ignore no-explicit-any
function extractPlanetList(chart: any, includeAngles: boolean): Array<Record<string, unknown>> {
  if (!chart || typeof chart !== "object") return [];
  const out: Array<Record<string, unknown>> = [];
  const usedSrc = new Set<string>();

  // deno-lint-ignore no-explicit-any
  const toPlacement = (def: BodyDef, node: any) => ({
    name: def.name,
    glyph: def.glyph,
    sign: normalizeSignName(node.sign ?? node.sign_name ?? node.signName),
    degree: numOrNull(node.degree ?? node.deg ?? node.position),
    house: numOrNull(node.house),
    retrograde: typeof node.retrograde === "boolean" ? node.retrograde : null,
    summary: def.summary,
  });

  // 1) Known bodies in stable order.
  for (const def of ALL_BODY_DEFS) {
    // Reserve aliases so unknown-discovery can never resurrect them.
    for (const a of def.aliases) usedSrc.add(normalizeKey(a));
    if (def.isAngle && !includeAngles) continue; // omit noon-fallback angles
    const hit = findBodyNode(chart, def.aliases);
    if (!hit) continue;
    usedSrc.add(hit.srcKey);
    out.push(toPlacement(def, hit.node));
  }

  // 2) Unknown bodies: remaining placement-like nodes not metadata/known.
  const unknown: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  // deno-lint-ignore no-explicit-any
  const consider = (k: string, v: any) => {
    const nk = normalizeKey(k || "");
    const nn = (v && typeof v.name === "string") ? normalizeKey(v.name) : "";
    if (!looksLikePlacement(v)) return;
    if ((nk && (METADATA_KEYS.has(nk) || KNOWN_ALIAS_SET.has(nk) || usedSrc.has(nk))) ||
        (nn && (KNOWN_ALIAS_SET.has(nn) || usedSrc.has(nn)))) return;
    const dedupe = nk || nn;
    if (!dedupe || seen.has(dedupe)) return;
    seen.add(dedupe);
    const src = (typeof v.name === "string" && v.name.trim()) ? v.name : k;
    const display = src.replace(/[_\-]+/g, " ").trim()
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
    unknown.push({
      name: display,
      glyph: "",
      sign: normalizeSignName(v.sign ?? v.sign_name),
      degree: numOrNull(v.degree ?? v.deg ?? v.position),
      house: numOrNull(v.house),
      retrograde: typeof v.retrograde === "boolean" ? v.retrograde : null,
      summary: null,
    });
  };
  const p = chart.planets;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    for (const [k, v] of Object.entries(p)) consider(k, v);
  }
  if (Array.isArray(p)) {
    for (const v of p) consider(typeof v?.name === "string" ? v.name : "", v);
  }
  for (const [k, v] of Object.entries(chart)) {
    if (k === "planets") continue;
    consider(k, v);
  }
  unknown.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return [...out, ...unknown];
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

    // Best-effort read of precision columns. The migration may not be applied
    // yet → tolerate "column does not exist" and treat as legacy (null).
    let accuracy: string | null = null;
    let precisionCol: string | null = null;
    let notesCol: string[] = [];
    try {
      const { data: prec } = await admin
        .from("profiles")
        .select("birth_time_accuracy, natal_chart_precision, natal_chart_notes")
        .eq("id", user.id)
        .maybeSingle();
      if (prec) {
        accuracy = (prec.birth_time_accuracy as string | null) ?? null;
        precisionCol = (prec.natal_chart_precision as string | null) ?? null;
        if (Array.isArray(prec.natal_chart_notes)) {
          notesCol = (prec.natal_chart_notes as unknown[]).filter((n) => typeof n === "string") as string[];
        }
      }
    } catch {
      // Precision columns not present yet — legacy profile, keep nulls.
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

    const profileComplete = hasBirthDate && hasBirthTime && hasCoordinates;

    // Effective precision: explicit column wins; otherwise infer from legacy data
    // (a chart with a real birth_time + coordinates is treated as "complete").
    const precision: string | null = precisionCol
      ?? (chartAvailable ? (hasBirthTime && hasCoordinates ? "complete" : "approximate") : null);
    const unknownTime = accuracy === "unknown" || precision === "symbolic" || precision === "partial";
    const ascendantReliable = chartAvailable && precision === "complete";
    const housesReliable = ascendantReliable;
    // A noon-fallback ascendant is not meaningful → omit the rising for unknown/
    // symbolic charts rather than present a misleading value.
    const showRising = chartAvailable && !unknownTime;

    // Additional bodies included when present; angles omitted for unknown-time.
    const planets = chartAvailable ? extractPlanetList(chart, !unknownTime) : [];

    const profileLevel = !hasBirthDate ? "missing"
      : (!hasBirthPlace || !hasCoordinates) ? "date_only"
      : accuracy === "unknown" ? "partial"
      : accuracy === "approximate" ? "approximate"
      : (accuracy === "exact" || hasBirthTime) ? "complete"
      : "partial";

    const notes = notesCol.length > 0 ? notesCol
      : precision === "approximate"
        ? ["Ora di nascita approssimativa: ascendente e case sono indicativi."]
      : (precision === "symbolic" || precision === "partial")
        ? ["Ora di nascita sconosciuta: ascendente e case non sono affidabili."]
      : [];

    console.log(
      `[get-astrology-profile] userIdPrefix=${prefix(user.id)} profileLevel=${profileLevel} precision=${precision ?? "none"} natalChartAvailable=${chartAvailable}`,
    );

    return json({
      profile_complete: profileComplete,
      profile_level: profileLevel,
      birth_profile: {
        has_birth_date: hasBirthDate,
        has_birth_time: hasBirthTime,
        has_birth_place: hasBirthPlace,
        has_coordinates: hasCoordinates,
        timezone: profile?.birth_timezone ?? null,
        birth_place_name: profile?.birth_place_name ?? null,
        birth_time_accuracy: accuracy,
      },
      big_three: {
        sun: { sign: sunSign, degree: chartAvailable ? degreeOf(chart, "sun") : null, label: "Sun Sign", summary: signSummary(sunSign) },
        moon: { sign: moonSign, degree: chartAvailable ? degreeOf(chart, "moon") : null, label: "Moon Sign", summary: signSummary(moonSign) },
        rising: { sign: showRising ? risingSign : null, degree: showRising ? (degreeOf(chart, "ascendant") ?? degreeOf(chart, "rising")) : null, label: "Rising", summary: showRising ? signSummary(risingSign) : null },
      },
      natal_chart: {
        available: chartAvailable,
        precision,
        dominant_element: chartAvailable ? inferDominantElement(chart) : null,
        dominant_modality: chartAvailable ? inferDominantModality(chart) : null,
        houses_available: chartAvailable ? housesAvailable(chart) : false,
        houses_reliable: housesReliable,
        ascendant_reliable: ascendantReliable,
        last_updated: profile?.updated_at ?? null,
        stale: false,
        notes,
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
