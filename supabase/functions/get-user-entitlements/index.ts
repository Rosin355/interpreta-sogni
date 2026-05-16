import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/error-response.ts";
import { getUserAccessProfile } from "../_shared/access-control.ts";
import { getUsageSummary } from "../_shared/usage-ledger.ts";

// Monthly limits per plan per feature (informational — not enforced globally)
const MONTHLY_LIMITS: Record<string, Record<string, number>> = {
  free: {
    interpret_dream: 3,
    suggest_tags: 10,
    chat_with_alchemist: 0,
    generate_dream_image: 0,
    text_to_speech: 0,
    speech_to_text: 5,
    astrology: 0,
  },
  reverie: {
    interpret_dream: 30,
    suggest_tags: 100,
    chat_with_alchemist: 20,
    generate_dream_image: 0,
    text_to_speech: 30,
    speech_to_text: 30,
    astrology: 0,
  },
  lucid: {
    interpret_dream: -1, // unlimited
    suggest_tags: -1,
    chat_with_alchemist: -1,
    generate_dream_image: 20,
    text_to_speech: -1,
    speech_to_text: -1,
    astrology: 30,
  },
  tester: {
    interpret_dream: -1,
    suggest_tags: -1,
    chat_with_alchemist: -1,
    generate_dream_image: -1,
    text_to_speech: -1,
    speech_to_text: -1,
    astrology: -1,
  },
  admin: {
    interpret_dream: -1,
    suggest_tags: -1,
    chat_with_alchemist: -1,
    generate_dream_image: -1,
    text_to_speech: -1,
    speech_to_text: -1,
    astrology: -1,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. JWT auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ errorCode: "UNAUTHORIZED", error: "Autenticazione richiesta" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ errorCode: "UNAUTHORIZED", error: "Token non valido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Resolve access profile (fails open → free plan)
    const profile = await getUserAccessProfile(user.id);

    // 3. Usage summary for current month (fails open → empty array)
    const usageSummary = await getUsageSummary(user.id);

    // 4. Build per-feature usage map
    const usageMap: Record<string, number> = {};
    for (const entry of usageSummary) {
      usageMap[entry.feature] = entry.count;
    }

    // 5. Build limits for this plan
    const limits = MONTHLY_LIMITS[profile.plan] ?? MONTHLY_LIMITS.free;

    // 6. Build response
    const features = Object.keys(limits).map((feature) => ({
      feature,
      usedThisMonth: usageMap[feature] ?? 0,
      monthlyLimit: limits[feature], // -1 = unlimited
      canUse:
        profile.isTester ||
        profile.isAdmin ||
        limits[feature] === -1 ||
        (usageMap[feature] ?? 0) < limits[feature],
    }));

    return new Response(
      JSON.stringify({
        userId: user.id,
        plan: profile.plan,
        isTester: profile.isTester,
        isAdmin: profile.isAdmin,
        entitlementKeys: profile.entitlementKeys,
        features,
        /** ISO month string, e.g. "2026-05" */
        month: new Date().toISOString().slice(0, 7),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("[get-user-entitlements] fatal:", e);
    return new Response(
      JSON.stringify({ errorCode: "INTERNAL_ERROR", error: "Errore interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
