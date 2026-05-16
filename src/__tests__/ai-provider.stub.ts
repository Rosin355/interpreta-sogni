/**
 * Test stubs for _shared/ai-provider.ts
 *
 * These describe the expected contract. Wire up with Deno.test or Vitest
 * (with deno-compatible shims) when a test runner is configured.
 *
 * To run with Deno: deno test supabase/functions/_shared/ai-provider.ts
 */

// ── getActiveProvider ─────────────────────────────────────────────────────────

// CASE 1: No env vars set → always returns "lovable"
// Env: AI_PROVIDER_TEST_OVERRIDE unset, AI_PROVIDER_TEST_USER_IDS unset
// Input: any userId
// Expected: "lovable"

// CASE 2: Override set but userId NOT in tester list → "lovable"
// Env: AI_PROVIDER_TEST_OVERRIDE="anthropic", AI_PROVIDER_TEST_USER_IDS="other-uuid"
// Input: userId = "my-uuid"
// Expected: "lovable"

// CASE 3: Override set and userId IS in tester list but key missing → "lovable"
// Env: AI_PROVIDER_TEST_OVERRIDE="anthropic", AI_PROVIDER_TEST_USER_IDS="my-uuid"
//      ANTHROPIC_API_KEY unset
// Input: userId = "my-uuid"
// Expected: "lovable"

// CASE 4: Override set, userId in tester list, key present → returns override
// Env: AI_PROVIDER_TEST_OVERRIDE="anthropic", AI_PROVIDER_TEST_USER_IDS="my-uuid"
//      ANTHROPIC_API_KEY="sk-ant-test"
// Input: userId = "my-uuid"
// Expected: "anthropic"

// CASE 5: Override set to invalid value → "lovable"
// Env: AI_PROVIDER_TEST_OVERRIDE="gemini"
// Input: any userId
// Expected: "lovable"

// ── createAICompletion ────────────────────────────────────────────────────────

// CASE 6: Normal user → calls Lovable, returns { provider: "lovable", usedFallback: false }

// CASE 7: Tester with anthropic override → calls Anthropic, returns { provider: "anthropic", usedFallback: false }

// CASE 8: Tester with anthropic override, Anthropic throws → falls back to Lovable
//         returns { provider: "lovable", usedFallback: true }
//         (never surfaces raw Anthropic error to caller)

// CASE 9: Lovable returns non-OK status → throws (caller handles)

// CASE 10: Empty content in response → throws "returned empty content"

export {};
