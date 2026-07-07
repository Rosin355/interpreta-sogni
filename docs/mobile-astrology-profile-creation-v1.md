# Mobile Astrology Profile Creation — v1 (Phase 2)

Lets new **iOS** users create/cache their natal chart safely, supporting three
birth-time states: **exact**, **approximate**, **unknown**. Builds on the existing
server-side Astrologer integration; iOS never calls the provider directly.

- Endpoint: [`create-astrology-profile`](../supabase/functions/create-astrology-profile/index.ts)
- Reader: [`get-astrology-profile`](./astrology-profile-endpoint-v1.md) (now precision-aware)
- Plan: [`astrologer-api-integration-plan-v1.md`](./astrologer-api-integration-plan-v1.md)

## Mobile user flow

1. iOS collects birth date, place (resolved to **lat/lon/timezone** client-side,
   like the web `BirthDataForm`), and a birth-time **accuracy** choice.
2. iOS calls `create-astrology-profile` with its user JWT.
3. The function computes + caches the chart server-side (delegating to
   `calculate-natal-chart`) and stores precision metadata on `profiles`.
4. The Celeste tab reads `get-astrology-profile` to render Big Three / Planets
   with the right reliability cues.

## Birth-time states

| Accuracy | birth_time | Precision | Ascendant/Houses | iOS should show |
|----------|-----------|-----------|------------------|-----------------|
| `exact` | required | `complete` | reliable | full chart, ascendant + houses |
| `approximate` | required | `approximate` | indicative | chart + "ascendente/case indicativi" badge |
| `unknown` | omitted | `symbolic` | not shown | Sun/Moon/planets; hide rising + houses; note time unknown |

For **unknown** time the provider needs a time, so the backend uses **12:00 local
as a technical fallback only** — it is **never stored as a real birth_time**
(`birth_time` is saved as `NULL`, `birth_time_source = 'estimated_noon'`) and never
presented to the user as a real value.

## Endpoint contract

`POST /functions/v1/create-astrology-profile` · `Authorization: Bearer <user JWT>`

### Request

```jsonc
{
  "birth_date": "1990-05-16",            // required, YYYY-MM-DD
  "birth_time": "14:30" | null,          // required unless accuracy=unknown
  "birth_time_accuracy": "exact" | "approximate" | "unknown",
  "birth_place_name": "Padova, Italy",   // required
  "birth_latitude": 45.4064,             // required (chart calc)
  "birth_longitude": 11.8768,            // required
  "birth_timezone": "Europe/Rome"        // required
}
```

Validation: `birth_date`, `birth_place_name`, coordinates and `birth_timezone`
are required; `birth_time` required for `exact`/`approximate`, optional for
`unknown`. The client never sends a `user_id` — the row written is always
`auth.uid()`.

### Response

```jsonc
{
  "saved": true,
  "profile_complete": true,              // false for unknown time
  "birth_time_accuracy": "exact",
  "natal_chart": {
    "available": true,
    "precision": "complete",
    "ascendant_reliable": true,          // true only for exact
    "houses_reliable": true,
    "notes": []
  },
  "message": "Profilo astrologico salvato e tema natale calcolato."
}
```

HTTP `200` when the chart was computed; `202` when the profile was saved but the
chart couldn't be computed (provider unavailable) — `available:false` + a note.
Never returns the raw provider payload or `natal_chart_data`.

## Provider-call behavior

- The provider (Astrologer/RapidAPI) is called **only server-side**, and only by
  delegating to `calculate-natal-chart` (proven v5 parser — not duplicated).
- The user JWT is forwarded to that function (it uses `verify_jwt`); the
  RapidAPI key stays in Supabase secrets and is never exposed to iOS.
- **Fail-soft**: if the chart can't be computed, birth data + accuracy/precision
  are still saved and the response reports `available:false`.

## get-astrology-profile updates (Phase 2)

Backward-compatible additions (no field removed/renamed):

- `profile_level`: `missing | date_only | partial | approximate | complete`.
- `birth_profile.birth_time_accuracy`: `exact | approximate | unknown | null`.
- `natal_chart.precision`, `.houses_reliable`, `.ascendant_reliable`, `.notes[]`.

Legacy profiles (no precision columns / migration not yet applied) still return a
valid response: precision is **inferred** — a chart with a real `birth_time` +
coordinates → `complete`. For `unknown`/`symbolic` precision the **rising sign is
omitted** (the noon-fallback ascendant is not meaningful), the time-dependent
**angles** (Asc/Desc/MC/IC/Vertex/Part of Fortune) are omitted from `planets[]`,
and reliability flags are `false`. `planets[]` otherwise includes every
additional body present in the cached chart (Chiron, Lilith, nodes, asteroids, …)
— read-only, no provider call.

## Schema changes

Adds 4 nullable columns to `public.profiles` (migration is **created but NOT
run** — see [`supabase-astrology-precision-fields-migration.sql`](./supabase-astrology-precision-fields-migration.sql)):
`birth_time_accuracy`, `natal_chart_precision`, `birth_time_source`,
`natal_chart_notes` (jsonb). All nullable with safe defaults for existing rows;
CHECK constraints restrict allowed values. **Run before relying on precision**;
until then the reader degrades gracefully to inferred precision.

## Privacy guarantees

- Birth date/time/place, coordinates, provider request/response, `natal_chart_data`,
  `natal_context`, JWTs and secrets are **never logged**. Logs carry only
  `userIdPrefix`, `accuracy`, `precision`, and `natalChartAvailable`.
- Responses expose only normalized fields — never the raw chart payload.
- Writes are restricted to the caller's own profile row (`auth.uid()`).

## Limitations

- Phase 2 reuses `calculate-natal-chart`, whose **existing verbose logs** still
  print birth values; this task scrubbed those specific log lines (see commit).
- Moon sign-boundary risk for `unknown` time is surfaced as a generic note, not
  computed precisely.
- `current_sky` (transits) is still a placeholder — Phase 3.

## Next steps for iOS

1. Add the birth-time accuracy choice to the Celeste onboarding (exact /
   approximate / "non lo so").
2. Resolve place → lat/lon/timezone client-side; call `create-astrology-profile`.
3. Render via `get-astrology-profile`: gate ascendant/houses on
   `ascendant_reliable`/`houses_reliable`; show `notes`; use `profile_level` for
   completion UI. Deploy is a separate, explicitly-approved step.

---

_See also: [astrology-profile-endpoint-v1](./astrology-profile-endpoint-v1.md) ·
[astrologer-api-integration-plan-v1](./astrologer-api-integration-plan-v1.md) ·
[AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md)_
