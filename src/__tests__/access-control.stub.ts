/**
 * Test stubs for _shared/access-control.ts
 *
 * These describe expected behavior for getUserAccessProfile and canAccess.
 */

// ── getUserAccessProfile ──────────────────────────────────────────────────────

// CASE 1: user_entitlements table doesn't exist → returns free plan (fail open)
// Expected: { plan: "free", isTester: false, isAdmin: false, entitlementKeys: [] }

// CASE 2: User has no rows in user_entitlements → free plan
// Expected: { plan: "free", ... }

// CASE 3: User has active "reverie_monthly" entitlement → reverie plan
// Expected: { plan: "reverie", entitlementKeys: ["reverie_monthly"] }

// CASE 4: User has active "lucid_annual" entitlement → lucid plan
// Expected: { plan: "lucid", entitlementKeys: ["lucid_annual"] }

// CASE 5: User has expired entitlement → treated as free (expires_at in past)
// Expected: { plan: "free", entitlementKeys: [] }

// CASE 6: User has "tester" entitlement key → tester plan, isTester: true
// Expected: { plan: "tester", isTester: true }

// CASE 7: userId in ADMIN_USER_IDS env var → admin plan regardless of entitlements
// Expected: { plan: "admin", isAdmin: true }

// CASE 8: SUPABASE_SERVICE_ROLE_KEY missing → returns free plan (fail open)

// ── canAccess ─────────────────────────────────────────────────────────────────

// CASE 9: free plan + "suggest_tags" → true (free feature)
// CASE 10: free plan + "interpret_dream" → false (paid feature)
// CASE 11: reverie plan + "interpret_dream" → true
// CASE 12: reverie plan + "generate_dream_image" → false (lucid-only)
// CASE 13: lucid plan + "generate_dream_image" → true
// CASE 14: tester plan + any feature → true
// CASE 15: admin plan + any feature → true
// CASE 16: any plan + "ai_provider_override" → false (env-only, never via canAccess)

export {};
