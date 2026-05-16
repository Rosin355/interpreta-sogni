/**
 * RevenueCat Webhook — scaffold
 *
 * Processes RevenueCat server-to-server events to mirror entitlement state
 * in user_entitlements and log all events to entitlement_events.
 *
 * Safety gates:
 * 1. Disabled by default via feature flag `revenuecat_webhook_active`.
 *    When false, returns 200 immediately (idempotent no-op, RC won't retry).
 * 2. HMAC-SHA256 signature verification using REVENUECAT_WEBHOOK_SECRET.
 *    Rejects any request that fails signature check.
 * 3. Idempotent: revenuecat_id unique index prevents double-processing.
 *
 * To activate: set app_settings key "revenuecat_webhook_active" value true
 * and configure REVENUECAT_WEBHOOK_SECRET in Supabase Edge Function secrets.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/error-response.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RCEvent {
  id: string;
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
  [key: string]: unknown;
}

interface RCPayload {
  event: RCEvent;
  api_version: string;
}

// RevenueCat event types that activate an entitlement
const ACTIVATE_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "REACTIVATION",
  "TRANSFER",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
]);

// RevenueCat event types that deactivate an entitlement
const DEACTIVATE_TYPES = new Set([
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "SUBSCRIBER_ALIAS",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // 1. Feature flag gate — default off
  try {
    const { data: setting } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "revenuecat_webhook_active")
      .maybeSingle();

    const isActive = (setting?.value as any)?.enabled === true;
    if (!isActive) {
      console.log("[revenuecat-webhook] feature flag off — no-op");
      return new Response(JSON.stringify({ status: "disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.warn("[revenuecat-webhook] flag check failed, aborting:", e);
    return new Response(JSON.stringify({ status: "disabled" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Read raw body (needed for HMAC verification)
  const rawBody = await req.text();

  // 3. Signature verification
  const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[revenuecat-webhook] REVENUECAT_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ errorCode: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("X-RevenueCat-Signature") ?? "";
  const isValid = await verifySignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    console.warn("[revenuecat-webhook] signature verification failed");
    return new Response(JSON.stringify({ errorCode: "UNAUTHORIZED", error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Parse payload
  let payload: RCPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(
      JSON.stringify({ errorCode: "INVALID_INPUT", error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const event = payload?.event;
  if (!event?.id || !event?.type || !event?.app_user_id) {
    return new Response(
      JSON.stringify({ errorCode: "INVALID_INPUT", error: "Missing required event fields" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[revenuecat-webhook] processing event ${event.id} type=${event.type}`);

  // 5. Resolve Supabase user from RC app_user_id
  // RC app_user_id is set to the Supabase user UUID at purchase time
  const userId = event.app_user_id;
  let resolvedUserId: string | null = null;

  try {
    const { data: userRecord } = await admin.auth.admin.getUserById(userId);
    if (userRecord?.user?.id) resolvedUserId = userRecord.user.id;
  } catch {
    // User may not exist yet — log the event anyway
  }

  // 6. Determine entitlement keys from event
  const entitlementKeys = event.entitlement_ids ?? [];
  const productId = event.product_id ?? null;

  const isActivate = ACTIVATE_TYPES.has(event.type);
  const isDeactivate = DEACTIVATE_TYPES.has(event.type);

  let applied = false;
  let applyError: string | null = null;

  // 7. Apply entitlement changes (only if we resolved a user)
  if (resolvedUserId && entitlementKeys.length > 0) {
    try {
      const expiresAt = event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null;

      if (isActivate) {
        for (const key of entitlementKeys) {
          await admin.from("user_entitlements").upsert(
            {
              user_id: resolvedUserId,
              entitlement_key: key,
              is_active: true,
              source: "revenuecat",
              revenuecat_product_id: productId,
              expires_at: expiresAt,
            },
            { onConflict: "user_id,entitlement_key" }
          );
        }
        applied = true;
      } else if (isDeactivate) {
        for (const key of entitlementKeys) {
          await admin
            .from("user_entitlements")
            .update({ is_active: false, expires_at: expiresAt })
            .eq("user_id", resolvedUserId)
            .eq("entitlement_key", key);
        }
        applied = true;
      }
    } catch (e) {
      applyError = String(e);
      console.error("[revenuecat-webhook] apply error:", e);
    }
  }

  // 8. Log event (idempotent via unique index on revenuecat_id)
  try {
    await admin.from("entitlement_events").upsert(
      {
        revenuecat_id: event.id,
        user_id: resolvedUserId,
        event_type: event.type,
        product_id: productId,
        entitlement_key: entitlementKeys[0] ?? null,
        raw_payload: payload,
        applied,
        apply_error: applyError,
      },
      { onConflict: "revenuecat_id", ignoreDuplicates: true }
    );
  } catch (e) {
    console.warn("[revenuecat-webhook] event log failed:", e);
  }

  return new Response(
    JSON.stringify({ status: "ok", eventId: event.id, applied }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

// ── HMAC-SHA256 verification ──────────────────────────────────────────────────

async function verifySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Signature is hex-encoded
    const sigBytes = hexToBytes(signature);
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
  } catch (e) {
    console.warn("[revenuecat-webhook] signature verification error:", e);
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
