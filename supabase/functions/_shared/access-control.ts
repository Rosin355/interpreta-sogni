/**
 * Access Control Helper
 *
 * Reads from user_entitlements and app_settings tables.
 * Designed to fail open: if the tables don't exist yet or a query fails,
 * the user is treated as "free" (not denied access outright).
 *
 * Security constraints:
 * - Admin / tester status is NEVER determined by client input
 * - All checks use the service role on the server
 * - Graceful degradation: missing tables → free plan, never error surfaced to user
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export type Plan = "free" | "reverie" | "lucid" | "tester" | "admin";

export interface UserAccessProfile {
  userId: string;
  plan: Plan;
  isTester: boolean;
  isAdmin: boolean;
  /** Raw active entitlement keys, e.g. ["reverie_monthly", "tts_unlimited"] */
  entitlementKeys: string[];
}

export type Feature =
  | "interpret_dream"
  | "suggest_tags"
  | "chat_with_alchemist"
  | "generate_dream_image"
  | "text_to_speech"
  | "speech_to_text"
  | "astrology"
  | "ai_provider_override";

// Super admins are hardcoded (same list as in error-response.ts) so that
// the admin role cannot be granted by tampering with the database.
const ADMIN_USER_IDS: string[] = (
  Deno.env.get("ADMIN_USER_IDS") ?? ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ── Main API ──────────────────────────────────────────────────────────────────

/**
 * Returns the access profile for a user.
 * Uses service role to bypass RLS — only call this server-side.
 */
export async function getUserAccessProfile(
  userId: string
): Promise<UserAccessProfile> {
  const fallback: UserAccessProfile = {
    userId,
    plan: "free",
    isTester: false,
    isAdmin: ADMIN_USER_IDS.includes(userId),
    entitlementKeys: [],
  };
  if (fallback.isAdmin) fallback.plan = "admin";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return fallback;

    const admin = createClient(supabaseUrl, serviceKey);

    // Read active entitlements — fail open if table doesn't exist
    const { data: entitlements, error } = await admin
      .from("user_entitlements")
      .select("entitlement_key, expires_at")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      // Table likely doesn't exist yet — safe to continue
      console.warn("[access-control] user_entitlements query failed:", error.message);
      return fallback;
    }

    const now = new Date();
    const activeKeys = (entitlements ?? [])
      .filter((e) => !e.expires_at || new Date(e.expires_at) > now)
      .map((e) => e.entitlement_key as string);

    const plan = resolvePlan(userId, activeKeys);
    const isTester = activeKeys.includes("tester") || plan === "tester";

    return {
      userId,
      plan,
      isTester,
      isAdmin: ADMIN_USER_IDS.includes(userId),
      entitlementKeys: activeKeys,
    };
  } catch (e) {
    console.warn("[access-control] getUserAccessProfile error, using fallback:", e);
    return fallback;
  }
}

/**
 * Checks whether a user with the given profile can access a feature.
 * Currently informational (not enforced globally — per task constraints).
 */
export function canAccess(profile: UserAccessProfile, feature: Feature): boolean {
  if (profile.isAdmin || profile.isTester) return true;

  switch (feature) {
    // Free features
    case "suggest_tags":
    case "speech_to_text":
      return true;

    // Reverie+ features
    case "interpret_dream":
    case "chat_with_alchemist":
    case "text_to_speech":
      return profile.plan === "reverie" || profile.plan === "lucid";

    // Lucid-only features
    case "generate_dream_image":
    case "astrology":
      return profile.plan === "lucid";

    // Never granted via canAccess — provider override is env-only
    case "ai_provider_override":
      return false;

    default:
      return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolvePlan(userId: string, activeKeys: string[]): Plan {
  if (ADMIN_USER_IDS.includes(userId)) return "admin";
  if (activeKeys.includes("tester")) return "tester";
  if (activeKeys.includes("lucid_monthly") || activeKeys.includes("lucid_annual")) {
    return "lucid";
  }
  if (activeKeys.includes("reverie_monthly") || activeKeys.includes("reverie_annual")) {
    return "reverie";
  }
  return "free";
}
