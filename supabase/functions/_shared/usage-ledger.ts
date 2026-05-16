/**
 * Usage Ledger Helper
 *
 * Append-only log of AI feature usage per user.
 * Supports soft rollback via the rolled_back flag (no hard deletes).
 *
 * Security constraints:
 * - Uses service role — only call server-side from Edge Functions
 * - Always fails open: a ledger write failure never blocks the user action
 * - No row is ever hard-deleted; rollback sets rolled_back = true
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export type LedgerFeature =
  | "interpret_dream"
  | "suggest_tags"
  | "chat_with_alchemist"
  | "generate_dream_image"
  | "text_to_speech"
  | "speech_to_text"
  | "astrology";

export interface UsageRecord {
  id: string;
  userId: string;
  feature: LedgerFeature;
  recordedAt: string;
  rolledBack: boolean;
  metadata: Record<string, unknown>;
}

export interface MonthlyUsageSummary {
  feature: LedgerFeature;
  count: number;
  /** ISO month string, e.g. "2026-05" */
  month: string;
}

// ── Main API ──────────────────────────────────────────────────────────────────

/**
 * Records a feature usage event.
 * Returns the new record's id (for potential rollback), or null on failure.
 * Never throws.
 */
export async function recordUsage(
  userId: string,
  feature: LedgerFeature,
  metadata: Record<string, unknown> = {}
): Promise<string | null> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("usage_ledger")
      .insert({
        user_id: userId,
        feature,
        metadata,
        rolled_back: false,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[usage-ledger] recordUsage insert failed:", error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (e) {
    console.warn("[usage-ledger] recordUsage error:", e);
    return null;
  }
}

/**
 * Soft-rolls-back a ledger entry (e.g. when the downstream AI call failed).
 * No-op if the id is null or the row doesn't exist.
 * Never throws.
 */
export async function rollbackUsage(ledgerId: string | null): Promise<void> {
  if (!ledgerId) return;
  try {
    const admin = getAdminClient();
    const { error } = await admin
      .from("usage_ledger")
      .update({ rolled_back: true })
      .eq("id", ledgerId);

    if (error) {
      console.warn("[usage-ledger] rollbackUsage failed:", error.message);
    }
  } catch (e) {
    console.warn("[usage-ledger] rollbackUsage error:", e);
  }
}

/**
 * Returns the count of non-rolled-back uses of a feature in the current calendar month.
 * Returns 0 on any failure (fail open).
 */
export async function getMonthlyUsage(
  userId: string,
  feature: LedgerFeature
): Promise<number> {
  try {
    const admin = getAdminClient();
    const monthStart = currentMonthStart();

    const { count, error } = await admin
      .from("usage_ledger")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", feature)
      .eq("rolled_back", false)
      .gte("recorded_at", monthStart);

    if (error) {
      console.warn("[usage-ledger] getMonthlyUsage query failed:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (e) {
    console.warn("[usage-ledger] getMonthlyUsage error:", e);
    return 0;
  }
}

/**
 * Returns per-feature usage counts for the current month.
 * Returns an empty array on any failure.
 */
export async function getUsageSummary(
  userId: string
): Promise<MonthlyUsageSummary[]> {
  try {
    const admin = getAdminClient();
    const monthStart = currentMonthStart();
    const month = monthStart.slice(0, 7); // "YYYY-MM"

    const { data, error } = await admin
      .from("usage_ledger")
      .select("feature")
      .eq("user_id", userId)
      .eq("rolled_back", false)
      .gte("recorded_at", monthStart);

    if (error) {
      console.warn("[usage-ledger] getUsageSummary query failed:", error.message);
      return [];
    }

    const counts: Partial<Record<LedgerFeature, number>> = {};
    for (const row of data ?? []) {
      const f = row.feature as LedgerFeature;
      counts[f] = (counts[f] ?? 0) + 1;
    }

    return Object.entries(counts).map(([feature, count]) => ({
      feature: feature as LedgerFeature,
      count: count as number,
      month,
    }));
  } catch (e) {
    console.warn("[usage-ledger] getUsageSummary error:", e);
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceKey);
}

/** Returns ISO string for the first moment of the current UTC month. */
function currentMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
