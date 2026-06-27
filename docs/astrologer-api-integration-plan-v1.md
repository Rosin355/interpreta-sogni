# Astrologer API Integration — Plan v1

Planning doc for backend-fed astrology data powering the iOS **Celeste** tab.
**Planning only** — no runtime code, no migrations, no provider calls.

## 1. Current state (audit)

**The Astrologer API is ALREADY integrated server-side** (RapidAPI provider
`astrologer.p.rapidapi.com`, v5). This is a refactor/extension, not greenfield.

Existing Edge Functions (`supabase/functions/`):

| Function | `verify_jwt` | Role today |
|----------|--------------|-----------|
| `calculate-natal-chart` | true | iOS-facing: input birth data → Astrologer birth-chart → caches on `profiles` |
| `check-astrological-transits` | false | cron/push: reads `profiles` → Astrologer `context/transit` → drives notifications |
| `interpret-dream-with-astrology` | false | dream interpretation + transit/moon-phase context + Lovable AI |

`calculate-natal-chart` input: `{ birthDate, birthTime, birthPlace: { latitude,
longitude, placeName, timezone } }`. It cache-hits when birth data is unchanged,
else calls Astrologer (`chart-data/birth-chart`, `context/birth-chart`,
`birth-chart`) and writes back to `profiles`.

**Birth + natal data live on `public.profiles`** (no dedicated tables):
`birth_date`, `birth_time`, `birth_latitude`, `birth_longitude`,
`birth_place_name`, `birth_timezone`, `natal_chart_data` (jsonb cache),
`natal_chart_svg`, `natal_context`.

**Env var names (existing, values never shown):** `RAPIDAPI_KEY` (in use),
`FREE_ASTROLOGY_API_KEY` (referenced; appears legacy/alternate — verify before relying).

### Gaps vs. the Celeste vision

- No clean **read-only** iOS endpoint returning a *normalized* profile/chart
  (today iOS must POST birth data to recompute).
- No **transits cache** for users (transits are notification-driven, not cached
  per user for read).
- No **normalized minimal** shape (raw provider JSON sits in `natal_chart_data`).
- No `dominant_element` / `dominant_modality` precomputed.
- No `astrology-insight` function yet (listed as planned).

## 2. Answers to audit questions

- **Already integrated?** Yes — server-side via `RAPIDAPI_KEY`, three functions.
- **Env names?** `RAPIDAPI_KEY`, `FREE_ASTROLOGY_API_KEY` (names only).
- **Birth-data / profile tables?** Birth data + cached chart are columns on
  `profiles`. No dedicated astrology tables yet.
- **Reusable functions?** `calculate-natal-chart` (normalization logic, zodiac/
  house math) and the transit-fetch code in `check-astrological-transits`.
- **iOS contract documented?** Not formally — see
  [`ai-edge-functions-contract-v1.md`](./ai-edge-functions-contract-v1.md) (KB only).
  This doc proposes the Celeste contract.

## 3. Proposed architecture

```
iOS (auth only, no keys)
  → Supabase Edge Function (JWT validated)
    → cache lookup (Postgres)  ──hit──► normalized result → iOS
    → on miss/expiry: Astrologer API (server-side, RAPIDAPI_KEY)
      → normalize to minimal shape → upsert cache → return
```

Principles:
- **No API keys in iOS.** iOS only ever calls Supabase with its JWT.
- **Auth required** on every function (`supabase.auth.getUser()`), `auth.uid()`
  ownership for all per-user reads/writes via RLS.
- **Cache-first**: serve cached normalized data; refresh server-side on
  miss/expiry only. Charts rarely change (birth data fixed) → long TTL; transits
  change daily → short TTL (e.g. same-day).
- **Fail-open for reads**: if the provider is down, return the last cached value
  (with `stale: true`) rather than erroring the Celeste screen.
- **usage_ledger**: one row per *real* Astrologer call (`feature =
  astrology_natal_refresh` / `astrology_transits_refresh`), safe metadata only.
- **Rate limiting**: reuse the existing `RateLimiter` for refresh endpoints
  (provider quota protection); reads from cache are cheap and need none.
- **Safe logging**: never log birth data, coordinates, place, or provider bodies
  — only `userIdPrefix`, cache hit/miss, provider status code, counts.

## 4. Data model proposal (NOT created yet)

Target dedicated tables (migrate the `profiles` columns into these over time;
keep `profiles` working until cutover). RLS: owner-only (`auth.uid() = user_id`);
writes via service role in Edge Functions.

**`user_astrology_profiles`** — birth data (sensitive):
`user_id` (pk/fk), `birth_date`, `birth_time`, `birth_place_name`, `latitude`,
`longitude`, `timezone`, `consent_astrology` (bool), `consent_at`, `created_at`,
`updated_at`.

**`user_astrology_charts`** — normalized natal chart cache:
`user_id`, `provider` (`astrologer`), `provider_version` (`v5`),
`normalized_chart` jsonb, `sun_sign`, `moon_sign`, `ascendant_sign`,
`dominant_element`, `dominant_modality`, `cached_at`, `expires_at`,
`created_at`, `updated_at`.

**`user_astrology_transits`** — current-sky cache:
`user_id`, `transit_date`, `provider`, `normalized_transits` jsonb, `moon_sign`,
`major_transits` jsonb, `cached_at`, `expires_at`.

**`dream_astrology_links`** (optional, later):
`dream_id`, `user_id`, `matched_planets` text[], `matched_signs` text[],
`matched_elements` text[], `metadata` jsonb.

Notes: store **normalized minimal** results, not raw provider payloads. Keep raw
SVG out of read endpoints. Birth data is sensitive → owner-only RLS + consent flag.

## 5. Edge Function proposal

All: POST, JWT validated in code, CORS, safe logs, fail-open reads.

**1. `save-astrology-profile`** — save/update birth data.
- In: `{ birth_date, birth_time, birth_place_name, latitude, longitude, timezone, consent }`.
- Out: `{ saved: true, profile_complete: bool }`.
- Auth: user. Cache: writes profile; invalidates chart cache (`expires_at=now`).
- Provider: none. Errors: 400 invalid/missing, 401. Log: no birth values.

**2. `get-astrology-profile`** — read profile + cached chart.
- In: `{}`. Out: normalized profile + chart (sun/moon/asc, dominant element/
  modality, personal planets, houses if present) + `profile_complete`,
  `chart_cached`, `stale?`.
- Auth: user. Cache: read-only; never calls provider. Errors: 401. Fail-open.

**3. `refresh-astrology-profile`** — recompute natal chart.
- In: `{ force?: bool }`. Out: normalized chart + `cached_at`/`expires_at`.
- Auth: user + rate limit. Cache: skip if fresh & `!force`.
- Provider: Astrologer birth-chart (server-side). usage_ledger on real call.
  Errors: 400 (no birth data), 429 (quota → notify admins), 502 (provider). On
  provider failure return last cached chart with `stale:true` when available.

**4. `get-current-transits`** — current sky for the user.
- In: `{}`. Out: `{ moon_sign, major_transits[], summary, last_updated, stale? }`.
- Auth: user + rate limit on refresh path. Cache: same-day cache; refresh on
  miss/expiry. Provider: Astrologer `context/transit` + `moon-phase/context`.
  usage_ledger on real call. Fail-open to cache.

**5. `build-dream-astrology-context`** (optional, later) — compact astrology
context block for `interpret-dream`.
- In: `{ dream_id }`. Out: `{ context_text, matched_planets, matched_signs,
  matched_elements }`. Auth: user (dream ownership). Provider: none (uses cached
  chart/transits). Writes optional `dream_astrology_links`. Fail-open (empty
  context never blocks interpretation, mirroring KB retrieval).

## UI direction: preserve Celeste, enrich with natal chart

**The current iOS Celeste tab stays as the base.** The user likes its current
visual direction — this plan does **not** replace it. The backend-fed astrology
layer **enriches** the existing local symbolic dashboard; it does not redesign it.

The Claude Design mockup is **inspiration for specific modules only**, not a full
redesign. Treat it as a menu of optional, additive modules to slot into the
existing Celeste structure as real data arrives:

1. **Big Three** — Sun sign, Moon sign, Ascendant/Rising, each with a short
   symbolic subtitle (e.g. "Steadfast & sensual").
2. **Current Sky** — current planet positions; current moon sign/phase if
   available; `last_updated` timestamp; cached/`stale` state.
3. **Planets** — Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus,
   Neptune, Pluto: sign, degree, house (if available), retrograde flag (if
   available), short symbolic meaning.
4. **Planet detail** — selected planet in sign + degree with a short symbolic
   explanation. **No raw provider payload exposed.**
5. **Dream resonance** — keep the existing iOS-local dream archetype logic for
   now; later combine natal chart + dream symbols + transits server-side.

Modules render only when their data exists; until then the existing
local/coming-soon UI remains. Nothing here forces a visual rewrite.

## Astrologer API capability matrix

A guide for scoping; the real provider payload must be inspected before relying
on any "verify" row (do not call it as part of this planning task).

**Likely supported by the existing integration** (already used by
`calculate-natal-chart` / `check-astrological-transits` /
`interpret-dream-with-astrology`): natal chart · sun sign · moon sign ·
ascendant/rising · planet positions · sign placements · degrees ·
transits / current sky · moon/transit context.

**Needs payload verification**: houses · retrograde flags · aspects ·
dominant element · dominant modality · dominant planet · moon phase ·
chart SVG suitability for iOS · exact planet naming/schema.

**Can be derived server-side if missing**: dominant element · dominant modality ·
simplified planet meanings · Big Three subtitles · normalized iOS-safe planet
list · stale/cache flags.

## 6. iOS contract proposal (Celeste)

iOS consumes only normalized, safe fields (additive; no provider payloads):

**Astrology profile** (`get-astrology-profile`):
`profile_complete`, `sun_sign`, `moon_sign`, `ascendant_sign`,
`dominant_element`, `dominant_modality`, `personal_planets[]` (name+sign),
`houses[]` (optional).

**Current sky / transits** (`get-current-transits`):
`current_moon_sign`, `major_transits[]`, `transit_summary` (short symbolic),
`last_updated`, `stale`.

**Dream resonance**: stays **local on iOS** for now (archetype/element mapping
from cached dreams). Later, backend may add `dream_astrology_links`.

Celeste maps these to its existing placeholders: profile section → profile;
*Elementi dominanti* → `dominant_element` (+ local symbols); *Risonanza astrale*
→ personal planets/archetypes; *Cielo del momento* → transits (coming-soon until
endpoints ship).

### Proposed normalized response (future, module-aligned)

Shape for `get-astrology-profile` once it serves the Big Three / Planets / Current
Sky modules. **Proposed only** — adapt after inspecting the real provider payload.

```jsonc
{
  "profile_complete": true,
  "big_three": {
    "sun":    { "sign": "Taurus", "degree": 26, "label": "Sun Sign", "summary": "Steadfast & sensual" },
    "moon":   { "sign": "Pisces", "degree": 14, "label": "Moon Sign", "summary": "Deeply intuitive" },
    "rising": { "sign": "Scorpio", "degree": null, "label": "Rising", "summary": "Magnetic presence" }
  },
  "planets": [
    { "name": "Mercury", "glyph": "☿", "sign": "Gemini", "degree": 3,
      "house": null, "retrograde": false,
      "summary": "Mind, communication, and perception patterns." }
  ],
  "current_sky": {
    "available": true, "moon_phase": "Waxing Gibbous", "moon_day": 19,
    "moon_cycle_length": 29, "planet_positions": [],
    "last_updated": "...", "stale": false
  }
}
```

Nulls are expected when a field isn't in the cached chart (e.g. `rising.degree`,
`house`). `current_sky` may be sourced from `get-current-transits` once it ships;
until then `available:false` keeps the module in coming-soon state.

## 7. Privacy & compliance

- **Birth date/time/place are sensitive** personal data → owner-only RLS,
  explicit `consent_astrology` flag stored with timestamp.
- **Never log raw birth data**, coordinates, place names, or provider payloads.
  Logs: `userIdPrefix`, cache hit/miss, provider status, counts only.
- **Never expose provider JSON to clients** — return normalized minimal results.
- **API keys only in Supabase secrets** (`RAPIDAPI_KEY`); iOS must **never** call
  Astrologer directly and ships no keys.
- **No raw provider payload returned to iOS** — only the normalized shape.
- **Every provider call is logged with safe metadata only** (feature,
  `userIdPrefix`, status, counts) — never birth data or response bodies.
- Store the **minimum** needed; keep raw SVG/`natal_chart_data` server-side.

## 8. Phased rollout

**Phase 1 — fastest path: read-only normalized profile over `public.profiles`.**
- **No schema change** and **no provider call** first.
- **No iOS key** — iOS calls only Supabase with its JWT.
- `get-astrology-profile` reads the existing `natal_chart_data` (+ birth fields)
  and returns the safe normalized shape above.
- iOS can immediately fill **Big Three / Planets** when data exists; modules with
  no data stay in their current coming-soon state.

**Phase 2 — `refresh-astrology-profile`**: provider call server-side
(Astrologer), usage_ledger entry, cache update; skip when fresh unless `force`.

**Phase 3 — `get-current-transits`**: current-sky/transit cache feeding Celeste
*"Cielo del momento"*; fail-open to last cache (`stale:true`).

**Phase 4 — dedicated astrology tables**: add `user_astrology_*`, migrate away
from the `profiles` cache columns.

**Phase 5 — dream astrology context**: `build-dream-astrology-context` wired into
`interpret-dream` (tester-gated, like KB retrieval).

## 9. Proposed env var names (names only)

Existing: `RAPIDAPI_KEY`, `FREE_ASTROLOGY_API_KEY`. Optional additions:
`ASTROLOGY_CACHE_TTL_HOURS`, `ASTROLOGY_TESTER_USER_IDS` (tester-gate the dream
context, mirroring `AI_KB_TEST_USER_IDS`). No values here.

---

_See also: [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md) ·
[ai-edge-functions-contract-v1](./ai-edge-functions-contract-v1.md) ·
[PROJECT_STATUS](./PROJECT_STATUS.md)_
