# AI Edge Functions — Request/Response Contract v1

Concise contract notes for the iOS/web clients. Only documents fields clients
rely on. Additive fields are safe (clients ignore unknown keys); removing or
renaming fields is a breaking change.

## interpret-dream

`POST /functions/v1/interpret-dream` · `Authorization: Bearer <user JWT>`

### Request

```jsonc
{
  "dream_id": "uuid",   // iOS sends snake_case; the dream row is fetched server-side
  "style": "string",    // optional, advisory (not yet used)
  "locale": "string"    // optional, advisory (e.g. "it-IT")
}
```

**Both `dream_id` (iOS, snake_case) and `dreamId` (web, camelCase) are accepted.**
The function normalizes to an internal `dreamId = dream_id ?? dreamId`. If neither
is present it returns `400 { error, error_code: "missing_dream_id" }`. A malformed
UUID returns `400 "Dati non validi"`.

### Response (200)

```jsonc
{
  "interpretation": "string",
  "interpretation_summary": "string",
  "alchemical_phase": "Nigredo | Albedo | Rubedo",

  // --- additive KB metadata (v1, optional, non-breaking) ---
  "kb_context_used": false,        // true only for tester-gated KB retrieval hits
  "kb_result_count": 0,
  "kb_sources": [                  // titles + domains only (never chunk content)
    { "title": "string", "domain": "string" }
  ]
}
```

The three `kb_*` fields were added with tester-gated Knowledge Base retrieval
(see [`interpret-dream-kb-retrieval-v1.md`](./interpret-dream-kb-retrieval-v1.md)).
They are **always present** but default to `false` / `0` / `[]` when retrieval is
disabled, finds nothing, or fails open. **iOS does not need to change**; it may
optionally surface `kb_sources`.

**Text conventions** (unchanged contract, documented for clients):
- `interpretation` / `interpretation_summary` are in the user `locale` (Italian
  by default); mood words stay in that language. They may contain **Markdown
  bold** (`**keyword**`) for a few symbolic keywords only — clients may render it
  as bold. No citation markers / source references appear.
- `alchemical_phase` ∈ `nigredo | albedo | rubedo`, taken from the phase the
  interpretation text declares (consistent with the written text).

### Errors

| Status | Body | Meaning |
|--------|------|---------|
| 400 | `{ error, error_code: "missing_dream_id" }` | neither `dream_id` nor `dreamId` provided |
| 400 | `{ error: "Dati non validi", details }` | malformed body (e.g. invalid UUID) |
| 401 | `{ error }` | missing / invalid JWT |
| 403 | `{ error }` | dream not owned by caller |
| 404 | `{ error }` | dream not found |
| 429 | `{ error, errorCode?, resetAt? }` | rate limit / AI quota |
| 500 | `{ error }` | internal error |

KB retrieval failures are **never** surfaced as errors — interpretation still
succeeds with `kb_context_used=false`.

## interpret-dream-with-astrology

`POST /functions/v1/interpret-dream-with-astrology` · `Authorization: Bearer <user JWT>`

**Canonical source: this repo** (`supabase/functions/interpret-dream-with-astrology/`).
This is the **unified interpretation endpoint** — a strict superset of
`interpret-dream`. Web already uses it; iOS switches in a follow-up PR.
`interpret-dream` remains deployed and unchanged as the fallback until that
switch is verified.

### Request

```jsonc
{
  "dream_id": "uuid",      // iOS snake_case
  "dreamId": "uuid",       // web camelCase — either is accepted
  "locale": "string",      // optional, e.g. "it-IT"; defaults to "it"
  "style": "string",       // optional, advisory (not yet used)

  // legacy web fields — still accepted, now only a FALLBACK.
  // The dream row is the authoritative source of content/tags/mood.
  "dreamContent": "string",
  "dreamTags": ["string"],
  "dreamMood": "string"
}
```

Normalizes to `dreamId = dream_id ?? dreamId`; neither present →
`400 { error, error_code: "missing_dream_id" }`. A caller may send `dream_id`
alone — content is read server-side from the ownership-checked `dreams` row.

### Response (200)

```jsonc
{
  "interpretation": "string",
  "interpretation_summary": "string",
  "alchemical_phase": "nigredo | albedo | rubedo | null",
  "hasAstrologicalContext": true,   // existing web field, unchanged
  "success": true,                  // existing web field, unchanged

  // --- additive ---
  "astrology_included": true,        // mirrors hasAstrologicalContext, snake_case
  "live_transits_included": true,    // live RapidAPI transit/moon enrichment
  "kb_context_used": false,
  "kb_result_count": 0,
  "kb_sources": [{ "title": "string", "domain": "string" }]
}
```

Header: `X-RateLimit-Remaining` (additive; reflects the 50/h interpretation tier).

**Astrology is optional.** No natal profile, a profile read error, or a failed
RapidAPI transit lookup all degrade gracefully: the interpretation still runs
(without astrological context) and returns `astrology_included: false`. It is
never an error condition.

**`astrology_included` vs `live_transits_included`** are independent:

| | `astrology_included` | `live_transits_included` |
|---|---|---|
| natal chart + transits fetched | `true` | `true` |
| natal chart, paid-call budget spent / provider down / no `RAPIDAPI_KEY` | `true` | `false` |
| no natal profile | `false` | `false` |

**Persistence** (same columns as `interpret-dream`, so iOS
`CachedRemoteDream` refresh is unaffected): `dreams.interpretation`,
`dreams.interpretation_summary`, `dreams.alchemical_phase`, and — in the
background, best-effort — `dreams.ai_symbols`.

### Errors

| Status | Body | Meaning |
|--------|------|---------|
| 400 | `{ error, error_code: "missing_dream_id", success: false }` | neither `dream_id` nor `dreamId` provided |
| 400 | `{ error: "Dati non validi", details, success: false }` | malformed body (e.g. invalid UUID) |
| 400 | `{ error, success: false }` | generic failure (unchanged from current behavior) |
| 401 | `{ error, success: false }` | missing / invalid JWT |
| 403 | `{ error, success: false }` | dream not owned by caller |
| 404 | `{ error, success: false }` | dream not found |
| 429 | `{ error, errorCode?, resetAt?, success: false }` | rate limit (50/h) or AI quota (`AI_RATE_LIMIT` / `AI_CREDITS_EXHAUSTED`) |

### Rate limiting — two tiers

Only part of a call costs third-party money, so the caps are split:

| Tier | Redis key suffix | Limit | Covers | On exceed |
|---|---|---|---|---|
| Interpretation | `interpret-dream-with-astrology` | **50/h** (`RATE_LIMITS.DREAM_OPERATIONS`) | every call — parity with `interpret-dream` | **429** |
| Paid astrology | `interpret-dream-with-astrology:transits` | **20/h** | only the RapidAPI transit + moon-phase pair | **degrade, no error** |

The 20/h counter is consumed **only immediately before the paid RapidAPI pair
actually fires** — so a caller with no natal chart (or with no `RAPIDAPI_KEY`
configured) never touches it. When that budget is exhausted the request still
succeeds: the interpretation runs on the cached natal chart and returns
`astrology_included: true, live_transits_included: false`. RapidAPI spend stays
capped at 20/h/user, while a user *with* birth data is never served worse than a
user without.

Both tiers fail open independently if Upstash is unreachable, each with its own
marker: `RATE_LIMITER_UNAVAILABLE … tier=interpretation` /
`… tier=astrology_transits`.

### Observability

One structured, content-free line per successful call:

```
INTERPRET_UNIFIED function=… dreamIdPrefix=… userIdPrefix=… astrologyIncluded=…
astrologyReason=… liveTransits=… transitsReason=… kbEnabled=… kbChunks=…
kbContextUsed=… provider=… model=… locale=… phase=…
```

- `astrologyReason` ∈ `natal_chart | no_profile | no_natal_chart | profile_error`
- `transitsReason` ∈ `ok | rate_limited | no_api_key | no_birth_coords | no_natal_chart | provider_error`

Plus `ASTROLOGY_PROFILE_UNAVAILABLE …` when the profile read is skipped or fails,
and `ASTROLOGY_TRANSITS_SKIPPED … reason=rate_limited` when the paid tier degrades.

## Privacy invariants (all AI functions)

- No dream content, KB chunk content, query text, embeddings, JWTs or API keys
  in logs.
- Retrieval logs store `query = NULL`.
- AI provider keys are server-side only; never returned to clients.

---

_See also: [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md) · [interpret-dream-kb-retrieval-v1](./interpret-dream-kb-retrieval-v1.md)_
