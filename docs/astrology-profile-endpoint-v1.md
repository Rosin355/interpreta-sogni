# get-astrology-profile — Endpoint v1 (Phase 1)

Read-only Edge Function that normalizes the **existing** cached astrology data on
`public.profiles` into a safe minimal shape for the iOS **Celeste** tab. This is
Phase 1 of [`astrologer-api-integration-plan-v1.md`](./astrologer-api-integration-plan-v1.md):
**no schema change, no provider call, no iOS key.**

## Purpose

Surface Big Three / Planets / profile-completion for Celeste from the
`natal_chart_data` already cached on the profile (produced earlier by
`calculate-natal-chart`). It does **not** compute or refresh charts — that is
Phase 2 (`refresh-astrology-profile`).

## Endpoint

```
POST /functions/v1/get-astrology-profile
Authorization: Bearer <user JWT>
```

Body: none required.

## Auth

- `Authorization` required → `supabase.auth.getUser()` (401 if missing/invalid).
- The profile is read **only** for `auth.user.id`; the client **cannot** pass a
  `user_id`. The read uses the service role hard-filtered to `.eq('id', user.id)`
  (so it works regardless of RLS while never exposing another user's data).
- `config.toml`: `verify_jwt = false` — consistent with the project's manual-JWT
  pattern (KB functions, etc.); the JWT is validated in code via `getUser()`.

## Provider calls

**None.** No Astrologer API / RapidAPI / AI provider call. Read-only; no DB writes.

## Response shape

```jsonc
{
  "profile_complete": true,
  "birth_profile": {
    "has_birth_date": true, "has_birth_time": true, "has_birth_place": true,
    "has_coordinates": true, "timezone": "Europe/Rome", "birth_place_name": "Padova"
  },
  "big_three": {
    "sun":    { "sign": "Taurus", "degree": 26, "label": "Sun Sign",  "summary": "Radici, sensi e costanza" },
    "moon":   { "sign": "Pisces", "degree": 14, "label": "Moon Sign", "summary": "Sensibilità, sogno e compassione" },
    "rising": { "sign": "Scorpio", "degree": null, "label": "Rising", "summary": "Intensità e trasformazione" }
  },
  "natal_chart": {
    "available": true, "dominant_element": "Acqua", "dominant_modality": "Fisso",
    "houses_available": true, "last_updated": "2026-…", "stale": false
  },
  "planets": [
    { "name": "Sun", "glyph": "☉", "sign": "Taurus", "degree": 26,
      "house": 7, "retrograde": false, "summary": "Identità, vitalità e direzione del Sé" }
  ],
  "current_sky": {
    "available": false, "moon_phase": null, "moon_day": null,
    "moon_cycle_length": null, "planet_positions": [], "last_updated": null, "stale": true
  },
  "provider": { "name": "astrologer_api", "cached": true }
}
```

`birth_profile` exposes only **booleans + timezone + place name** — never the raw
birth date/time or coordinates. `current_sky` is always a placeholder in Phase 1
(transits arrive in Phase 3). Labels (`Sun Sign` / `Moon Sign` / `Rising`) follow
the proposed contract; sign/planet summaries are short Italian symbolic phrases
(app-native) and may be adapted.

## Normalization behavior

Tolerant helpers that **never throw** and degrade to `null` / `[]`:
`extractSunSign`, `extractMoonSign`, `extractAscendantSign`, `extractPlanetList`,
`inferDominantElement`, `inferDominantModality`, `signSummary`, `planetGlyph`,
`normalizeSignName`.

- Reads the known stored shape (`natal_chart_data.planets.<name>.{sign,degree,
  house,retrograde}`, `…ascendant.sign`, `…houses[]`) but also tolerates
  array-keyed planets and alternate field names.
- `normalizeSignName` accepts full English signs (the stored form), 3-letter
  abbreviations, lowercase, and Italian sign names → canonical English.
- `dominant_element` / `dominant_modality` are **derived** by tallying the
  personal points (sun/moon/mercury/venus/mars/ascendant).
- Degrees default to integers from the cached chart; missing → `null`.

### Limitation

If `natal_chart_data` exists but specific fields can't be extracted reliably,
`natal_chart.available = true` while unknown fields return `null` / `[]`. The raw
`natal_chart_data` and `natal_context` are **never** returned.

## Privacy guarantees

- Never returns raw provider payload (`natal_chart_data`) or `natal_context`.
- Never logs birth date/time/place, coordinates, chart JSON, `natal_context`,
  JWTs or secrets. Logs only: `userIdPrefix`, `profileComplete`,
  `natalChartAvailable`.
- No DB mutation; reads only the caller's own profile row.

## iOS usage (Celeste)

- Fill **Big Three** from `big_three`; the **Planets** module from `planets`;
  **Elementi dominanti** from `natal_chart.dominant_element`.
- Gate modules on `available` flags: when `natal_chart.available` or
  `current_sky.available` is `false`, keep the current local/coming-soon UI.
- The current Celeste UI stays the base; this only enriches it.

## Next steps

1. **Deploy** `get-astrology-profile` (when approved).
2. **iOS Celeste** consumes the endpoint (Big Three / Planets / profile status).
3. **`refresh-astrology-profile`** (Phase 2) — server-side Astrologer call +
   usage_ledger + cache update.
4. **`get-current-transits`** (Phase 3) — fills `current_sky`.

---

_See also: [astrologer-api-integration-plan-v1](./astrologer-api-integration-plan-v1.md) ·
[AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md) ·
[ai-edge-functions-contract-v1](./ai-edge-functions-contract-v1.md)_
