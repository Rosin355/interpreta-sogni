# Mobile Backend Contract v1
## Dream Alchemist / Interpreta Sogni — iOS & Android

> **Status:** Draft — v1.0 — 2026-05-16
>
> **Audience:** iOS/Android developers, backend engineers, Lovable maintainers
>
> **Safety principle:** This contract describes additive, non-breaking integration points.
> Existing Lovable web app users are never affected by mobile changes.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Auth Requirements](#auth-requirements)
3. [Standard Error Format](#standard-error-format)
4. [Mobile-Facing Edge Functions](#mobile-facing-edge-functions)
5. [Direct SDK Access (RLS-Protected Tables)](#direct-sdk-access-rls-protected-tables)
6. [RevenueCat Webhook Flow](#revenuecat-webhook-flow)
7. [Entitlement Mirror Strategy](#entitlement-mirror-strategy)
8. [Usage Ledger Flow](#usage-ledger-flow)
9. [Monthly Limits Strategy](#monthly-limits-strategy)
10. [Tester-Only AI Override](#tester-only-ai-override)
11. [Feature Flags](#feature-flags)
12. [Safe Rollout Phases](#safe-rollout-phases)
13. [What Must Not Change](#what-must-not-change)
14. [Environment Variables Required](#environment-variables-required)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  iOS / Android App (Swift / Kotlin)                 │
│  - Supabase Auth SDK (JWT management)               │
│  - Supabase Realtime / PostgREST (RLS tables)       │
│  - RevenueCat SDK (purchase + entitlement check)    │
└────────────────┬────────────────────────────────────┘
                 │ HTTPS only — JWT always attached
                 ▼
┌────────────────────────────────────────────────────┐
│  Supabase — Central Backend                         │
│  ├── Auth (JWT issuance + refresh)                  │
│  ├── PostgREST (RLS-protected DB access)            │
│  ├── Edge Functions (server-side AI + business logic│
│  └── Storage (audio, images)                        │
└────────────────┬───────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
 ┌──────────────┐  ┌─────────────────────┐
 │ AI Providers │  │ RevenueCat Webhook   │
 │ (server-side │  │ (subscription events│
 │ only — keys  │  │ → entitlement table) │
 │ never exposed│  └─────────────────────┘
 │ to client)   │
 └──────────────┘

SECURITY RULES (non-negotiable):
- Mobile app NEVER receives SUPABASE_SERVICE_ROLE_KEY
- Mobile app NEVER receives LOVABLE_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY,
  ELEVENLABS_API_KEY, RAPIDAPI_KEY, or REVENUECAT_WEBHOOK_SECRET
- Mobile app ONLY uses SUPABASE_URL + SUPABASE_ANON_KEY (public, safe to embed)
- Subscription status is ALWAYS verified server-side — client entitlement claims
  are never trusted directly
```

---

## Auth Requirements

All Edge Functions require a valid Supabase JWT passed as:
```
Authorization: Bearer <supabase-access-token>
```

Mobile apps obtain this token via Supabase Auth SDK:
```swift
// iOS — Swift
let session = try await supabase.auth.session
let jwt = session.accessToken
```

### Token lifecycle
| Action | Mobile client responsibility |
|--------|------------------------------|
| Sign up | `supabase.auth.signUp(email:, password:)` |
| Sign in | `supabase.auth.signIn(email:, password:)` |
| Token refresh | Automatic via Supabase SDK |
| Sign out | `supabase.auth.signOut()` |

### Social auth
Apple and Google OAuth are supported via Supabase Auth. Deep link callback:
```
com.dreamalchemist.app://auth/callback
```

---

## Standard Error Format

All Edge Functions return errors in this format:
```jsonc
{
  "error": "Human-readable message (may be Italian for user-facing errors)",
  "code": "MACHINE_READABLE_CODE",     // optional, not all functions emit this yet
  "resetAt": "2026-05-16T10:00:00Z"   // optional, only on 429 rate-limit responses
}
```

### Error codes
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `INVALID_INPUT` | 400 | Request body failed validation |
| `RATE_LIMITED` | 429 | Redis rate limit exceeded (50 req/hour) |
| `AI_RATE_LIMIT` | 429 | AI provider rate limited |
| `AI_CREDITS_EXHAUSTED` | 402 | AI provider quota depleted |
| `ENTITLEMENT_REQUIRED` | 403 | Feature requires premium entitlement |
| `MONTHLY_LIMIT_REACHED` | 403 | Monthly usage limit hit (when enforcement enabled) |
| `UPSTREAM_UNAVAILABLE` | 503 | External API unreachable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Mobile-Facing Edge Functions

### Function inventory

| Function | Exists? | Mobile-safe? | Notes |
|----------|---------|--------------|-------|
| `interpret-dream` | ✅ Yes | ✅ Yes | JWT required |
| `suggest-tags` | ✅ Yes | ✅ Yes | JWT required |
| `chat-with-alchemist` | ✅ Yes | ✅ Yes | JWT required |
| `generate-dream-image` | ✅ Yes | ✅ Yes | JWT verified internally |
| `text-to-speech-elevenlabs` | ✅ Yes | ✅ Yes | JWT verified internally |
| `speech-to-text-elevenlabs` | ✅ Yes | ✅ Yes | JWT verified internally |
| `get-user-entitlements` | ✅ New | ✅ Yes | New — safe read-only |
| `revenuecat-webhook` | ✅ Scaffold | ⚠️ Server-to-server | RevenueCat → Supabase only |
| `calculate-natal-chart` | ✅ Yes | ✅ Yes | JWT required |
| `interpret-dream-with-astrology` | ✅ Yes | ✅ Yes | JWT verified internally |

---

### `interpret-dream`

**URL:** `POST /functions/v1/interpret-dream`
**Auth:** Bearer JWT

**Request:**
```jsonc
{ "dreamId": "uuid" }
```

**Response 200:**
```jsonc
{
  "interpretation": "Testo interpretazione...",
  "interpretation_summary": "Breve sommario...",  // ≤500 chars, for TTS
  "alchemical_phase": "nigredo" | "albedo" | "rubedo"
}
```

**Errors:** 401 (no auth), 400 (invalid input), 429 (rate limit / AI limit), 402 (credits exhausted)

**Mobile notes:** Call after user saves a new dream. Store returned values locally; they are also persisted to the `dreams` table server-side.

---

### `suggest-tags`

**URL:** `POST /functions/v1/suggest-tags`
**Auth:** Bearer JWT

**Request:**
```jsonc
{ "content": "Dream description text (20–5000 chars)" }
```

**Response 200:**
```jsonc
{
  "tags": [
    { "tag": "Volare", "confidence": 0.92, "category": "Temi" },
    { "tag": "Acqua", "confidence": 0.78, "category": "Elementi" }
  ]
}
```

---

### `chat-with-alchemist`

**URL:** `POST /functions/v1/chat-with-alchemist`
**Auth:** Bearer JWT

**Request:**
```jsonc
{ "dreamId": "uuid", "message": "User message text" }
```

**Response 200:**
```jsonc
{ "reply": "Alchemist response text" }
```

---

### `generate-dream-image`

**URL:** `POST /functions/v1/generate-dream-image`
**Auth:** Bearer JWT (verified internally)

**Request:**
```jsonc
{
  "dreamId": "uuid",
  "content": "Dream text (1–10000 chars)",
  "mood": "optional mood string",
  "imageStyle": "realistico" | "onirico" | "artistico" | "minimalista" | "fantastico",
  "autoStyle": true,
  "customPrompt": "optional custom prompt (max 500 chars)"
}
```

**Response 200:**
```jsonc
{ "image_url": "https://...", "image_style": "onirico" }
```

---

### `text-to-speech-elevenlabs`

**URL:** `POST /functions/v1/text-to-speech-elevenlabs`
**Auth:** Bearer JWT

**Request:**
```jsonc
{ "text": "Text to speak (max 500 chars)", "voiceId": "optional-voice-id" }
```

**Response 200:**
```jsonc
{ "audioContent": "<base64-encoded-mp3>" }
```

---

### `speech-to-text-elevenlabs`

**URL:** `POST /functions/v1/speech-to-text-elevenlabs`
**Auth:** Bearer JWT

**Request:**
```jsonc
{ "audio": "<base64-encoded-audio>", "mimeType": "audio/mp4" }
```

**Response 200:**
```jsonc
{ "text": "Transcribed Italian text" }
```

---

### `get-user-entitlements` *(new)*

**URL:** `POST /functions/v1/get-user-entitlements`
**Auth:** Bearer JWT

**Request:** empty body `{}`

**Response 200:**
```jsonc
{
  "userId": "uuid",
  "plan": "free" | "reverie" | "lucid",
  "entitlements": ["dream_interpretation", "suggest_tags", "audio_basic"],
  "monthlyLimits": {
    "dream_interpretation": 10,
    "suggest_tags": 30,
    "tts": 20,
    "audio_basic": 100,
    "dream_image": 5,
    "advanced_alchemist": 20
  },
  "usage": {
    "dream_interpretation": 3,
    "suggest_tags": 12,
    "tts": 5,
    "audio_play": 8,
    "dream_image": 1,
    "advanced_alchemist_message": 7
  },
  "creditEnforcementEnabled": false,
  "isTester": false
}
```

**Mobile notes:** Call at app launch and after subscription purchase. Cache locally and refresh hourly or on foreground. Use to gate premium features in the UI.

---

### `revenuecat-webhook` *(scaffold)*

**URL:** `POST /functions/v1/revenuecat-webhook`
**Auth:** `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>` (server-to-server, not user JWT)

**Request:** RevenueCat standard webhook payload
```jsonc
{
  "api_version": "1.0",
  "event": {
    "type": "INITIAL_PURCHASE" | "RENEWAL" | "CANCELLATION" | "EXPIRATION" | "REFUND",
    "app_user_id": "supabase-user-uuid",
    "product_id": "com.dreamalchemist.reverie_monthly",
    "entitlement_id": "reverie",
    "...": "other RevenueCat event fields"
  }
}
```

**Response 200:**
```jsonc
{ "ok": true, "processed": true }
```

**Security:** The webhook secret must be configured in RevenueCat dashboard and stored as `REVENUECAT_WEBHOOK_SECRET` in Supabase Edge Function secrets. Never expose this to the client.

---

## Direct SDK Access (RLS-Protected Tables)

The following tables are safe to query directly from the mobile app using the Supabase SDK. RLS ensures users only see their own data.

| Table | Mobile operation | RLS policy |
|-------|-----------------|------------|
| `dreams` | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` |
| `dream_conversations` | SELECT, INSERT | `auth.uid() = user_id` |
| `dream_drafts` | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` |
| `profiles` | SELECT, UPDATE | `auth.uid() = id` |
| `streaks` | SELECT | `auth.uid() = user_id` |
| `audio_tracks` | SELECT | `is_published = true` (public) OR `access_tier` check |
| `user_entitlements` | SELECT | `auth.uid() = user_id` |
| `usage_ledger` | SELECT | `auth.uid() = user_id` |
| `notification_preferences` | SELECT, UPDATE | `auth.uid() = user_id` |

**Important:** Writes to `usage_ledger` and `user_entitlements` are performed only by Edge Functions using the service role. Mobile clients can only read their own rows.

---

## RevenueCat Webhook Flow

```
Mobile App                    RevenueCat                  Supabase
─────────┐                    ──────────┐                 ────────┐
User buys │──purchase event──▶│         │                         │
 "Reverie"│◀─entitlement ok──│  RC SDK  │                         │
          │                   │         │──POST webhook──▶revenuecat-webhook
          │                   │         │                  1. verify secret
          │                   │         │                  2. find user by RC ID
          │                   │         │                  3. upsert user_entitlements
          │                   │         │                  4. insert entitlement_events
          │                   │         │◀──────200 ok───────────│
          │──GET entitlements─▶─────────────────────────▶get-user-entitlements
          │◀─updated plan data─────────────────────────────────── │
```

### RevenueCat → Supabase user mapping

The mobile app must set the RevenueCat `appUserId` to the Supabase user UUID at login:
```swift
// iOS
Purchases.shared.logIn(supabase.auth.currentUser?.id ?? "")
```

The webhook receives `event.app_user_id` = Supabase user UUID, which is used directly to find the user.

### Subscription → entitlement mapping

| RevenueCat product_id | Entitlement keys granted |
|-----------------------|--------------------------|
| `com.dreamalchemist.reverie_monthly` | `dream_interpretation`, `suggest_tags`, `audio_basic`, `audio_premium`, `tts`, `dream_image` |
| `com.dreamalchemist.reverie_annual` | Same as monthly |
| `com.dreamalchemist.lucid_monthly` | All reverie keys + `advanced_alchemist`, `astrology` |
| `com.dreamalchemist.lucid_annual` | Same as lucid monthly |

---

## Entitlement Mirror Strategy

The `user_entitlements` table mirrors the subscription state from RevenueCat server-side. This ensures:
- The mobile app cannot fake entitlements by passing modified data
- Even if RevenueCat is temporarily unavailable, the mirror holds the last-known state
- Entitlement grants survive token refresh cycles

### Table: `user_entitlements`
```sql
id             UUID PK
user_id        UUID → auth.users
entitlement_key TEXT  -- e.g. "dream_interpretation", "audio_premium"
is_active      BOOLEAN -- false on cancellation/expiration
source         TEXT -- 'revenuecat' | 'manual' | 'admin'
revenuecat_product_id TEXT
expires_at     TIMESTAMPTZ -- null for non-expiring (manually granted)
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
```

### Table: `entitlement_events`
```sql
id                     UUID PK
user_id                UUID → auth.users (nullable, for deleted users)
revenuecat_customer_id TEXT
event_type             TEXT -- 'initial_purchase' | 'renewal' | 'cancellation' | 'expiration' | 'refund'
product_id             TEXT
entitlement_key        TEXT
event_data             JSONB -- full RevenueCat event payload
processed              BOOLEAN
processed_at           TIMESTAMPTZ
created_at             TIMESTAMPTZ
```

---

## Usage Ledger Flow

```
AI call requested
     │
     ▼
record usage (optimistic) ──→ INSERT usage_ledger row (rolled_back = false)
     │                                        │
     ▼                                        │
AI call executes                              │
     │                                        │
     ├─ success ──────────────────────────────┤ (record stays, rolled_back = false)
     │                                        │
     └─ failure ──▶ rollbackUsage(ledgerId) ──┘ (UPDATE rolled_back = true)
                                         Usage not counted
```

### Table: `usage_ledger`
```sql
id           UUID PK
user_id      UUID → auth.users
usage_type   TEXT -- 'dream_interpretation' | 'suggest_tags' | 'audio_play' | ...
rolled_back  BOOLEAN DEFAULT false
rolled_back_at TIMESTAMPTZ
metadata     JSONB -- { dreamId, provider, durationMs, ... }
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
```

### Usage types
| Type | Triggered by |
|------|-------------|
| `dream_interpretation` | `interpret-dream` call |
| `suggest_tags` | `suggest-tags` call |
| `audio_play` | Client-side, reported via SDK insert (RLS: only own rows) |
| `advanced_alchemist_message` | `chat-with-alchemist` call |
| `dream_image` | `generate-dream-image` call |
| `tts` | `text-to-speech-elevenlabs` call |
| `stt` | `speech-to-text-elevenlabs` call |

---

## Monthly Limits Strategy

Monthly limits are **not currently enforced** (`credit_enforcement_enabled = false` in `app_settings`).
The ledger records usage but limits are only applied when enforcement is explicitly enabled.

### Current limits (when enforcement is enabled)

| Entitlement | Free tier | Reverie | Lucid |
|-------------|-----------|---------|-------|
| `dream_interpretation` | 10/month | 100/month | unlimited |
| `suggest_tags` | 30/month | 300/month | unlimited |
| `tts` | 20/month | 200/month | unlimited |
| `dream_image` | 5/month | 50/month | 100/month |
| `advanced_alchemist` | 0 (no entitlement) | 0 (no entitlement) | 200/month |
| `audio_basic` | 100/month | unlimited | unlimited |
| `audio_premium` | 0 (no entitlement) | unlimited | unlimited |

### Enabling enforcement (future step)
```sql
UPDATE app_settings SET value = true WHERE key = 'credit_enforcement_enabled';
```
This is the only change needed to activate limits globally. **Do not run this until the full entitlement sync from RevenueCat is verified.**

---

## Tester-Only AI Override

For internal testing with Claude/OpenAI instead of Lovable AI:

```bash
# Supabase Edge Function secrets (server-side only — never in client)
AI_PROVIDER=lovable                    # default for ALL users
AI_PROVIDER_TEST_OVERRIDE=anthropic    # or "openai"
AI_PROVIDER_TEST_USER_IDS=uuid1,uuid2  # comma-separated Supabase user UUIDs
```

### Behavior
- If `user.id` is in `AI_PROVIDER_TEST_USER_IDS` AND `AI_PROVIDER_TEST_OVERRIDE` is set:
  → Use override provider
- All other users (including normal users): always use Lovable
- If override provider fails for any reason: falls back to Lovable silently
- These variables are read server-side only — the mobile client never knows which provider is active

### Safety guarantees
- `AI_PROVIDER_TEST_USER_IDS` is never returned in any API response
- `isTester: true` is returned in `get-user-entitlements` only to help mobile debug UI (does not grant entitlements client-side — all checks remain server-side)
- Missing or empty `AI_PROVIDER_TEST_USER_IDS` = no testers = Lovable for everyone

---

## Feature Flags

Feature flags live in the `app_settings` table:

| Key | Type | Default | Effect |
|-----|------|---------|--------|
| `credit_enforcement_enabled` | boolean | `false` | Activates monthly limit checks |
| `revenuecat_webhook_active` | boolean | `false` | Enable RevenueCat webhook processing |
| `mobile_v1_enabled` | boolean | `true` | Gate new mobile endpoints (future use) |

Read flags server-side in Edge Functions:
```typescript
const { data } = await supabase.from("app_settings").select("value").eq("key", "flag_name").single();
const flag = data?.value === true;
```

**Never read feature flags from the mobile client directly** — they could be cached incorrectly and the client can't be trusted for security-sensitive gates.

---

## Safe Rollout Phases

### Phase 1 — Current (complete)
- [x] Existing Edge Functions work for mobile via JWT
- [x] Supabase SDK direct access for dreams, profiles, audio_tracks
- [x] `get-user-entitlements` returns free-tier defaults (no entitlement table yet)
- [x] Usage ledger records all AI calls (enforcement off)
- [x] AI provider adapter in `_shared/ai-provider.ts` (tester override ready)

### Phase 2 — RevenueCat integration
- [ ] Add `REVENUECAT_WEBHOOK_SECRET` to Supabase secrets
- [ ] Configure RevenueCat dashboard webhook URL
- [ ] Set `revenuecat_webhook_active = true` in `app_settings`
- [ ] Verify end-to-end: purchase → webhook → entitlement table → `get-user-entitlements`
- [ ] Test cancellation → entitlement deactivation flow

### Phase 3 — Enforcement
- [ ] Verify 100% of AI calls are recorded in `usage_ledger`
- [ ] Audit usage data for completeness (1 month)
- [ ] Enable `credit_enforcement_enabled = true` for tester accounts only first
- [ ] Validate mobile UX on limit-hit 403 responses
- [ ] Enable globally

### Phase 4 — Advanced features
- [ ] `advanced_alchemist` entitlement gate in `chat-with-alchemist`
- [ ] `astrology` entitlement gate in `calculate-natal-chart`
- [ ] Personalized audio library access via `audio_premium` entitlement
- [ ] Push notification for upcoming limit (e.g. 80% used)

---

## What Must Not Change

The following must remain untouched to avoid breaking existing Lovable web app users:

| Item | Why |
|------|-----|
| Lovable AI Gateway as default provider | All production users depend on it |
| `interpret-dream` function signature | Web app calls this directly |
| `suggest-tags` function signature | Web app calls this directly |
| `chat-with-alchemist` function signature | Web app calls this directly |
| `user_roles`, `dreams`, `profiles` schema | Existing RLS policies depend on it |
| `app_role` enum values | Used in policies and application code |
| `is_admin()` / `has_role()` Postgres functions | Used in RLS policies |
| `credit_enforcement_enabled = false` | Turning this on without entitlement data breaks users |
| Lovable connector gateway for email/Resend | Active email flows depend on it |
| Upstash Redis rate limiting | Protects all existing functions |
| `LOVABLE_API_KEY` environment variable | Required by all AI functions |

---

## Environment Variables Required

### Already configured (do not remove)
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
LOVABLE_API_KEY
ELEVENLABS_API_KEY
OPENAI_API_KEY
RAPIDAPI_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

### New — to add in Supabase dashboard → Edge Functions → Secrets
```
AI_PROVIDER=lovable                            # Keep "lovable" in production
AI_PROVIDER_TEST_OVERRIDE=anthropic            # "anthropic" or "openai"
AI_PROVIDER_TEST_USER_IDS=                     # Leave empty until testers identified
ANTHROPIC_API_KEY=                             # Required only if AI_PROVIDER_TEST_OVERRIDE=anthropic
REVENUECAT_WEBHOOK_SECRET=                     # Required for Phase 2 RevenueCat integration
```

### Mobile app (safe to embed in app bundle)
```swift
// Only these two — nothing else
let SUPABASE_URL = "https://zufsbpcgcvlcdtksrzhu.supabase.co"
let SUPABASE_ANON_KEY = "eyJ..." // public anon key — safe to expose
```
