// Shared usage recording for the AI/paid edge functions.
//
// PATH A (no migration): the usage_type VALUE is stored in the existing
// `feature` column of public.usage_ledger; rollback flips the existing
// `rolled_back` boolean. The live table has: id, user_id, feature, metadata,
// recorded_at (default now()), rolled_back (default false). There is no
// usage_type / rolled_back_at column — see the PR description.
//
// Best-effort by contract: a ledger outage MUST NEVER fail the user-facing
// request. Every write is wrapped and degrades to a greppable warning
// (USAGE_LEDGER_UNAVAILABLE …), consistent with the RATE_LIMITER_UNAVAILABLE
// style. Writes must use the SERVICE-ROLE client (same as the KB embedding
// writes).
//
// Metadata policy (HARD — do not violate):
//   allowed: dream_id_prefix (8 chars only), provider, model, used_fallback,
//            function_name, duration_ms, calls
//   NEVER:   raw dream content, prompts, user email, birth data
// (duration_ms is intentionally omitted by the current callers: recordUsage
//  runs BEFORE the provider call, so duration isn't known without a second
//  write; it stays in the allowed set for future use.)

// deno-lint-ignore no-explicit-any
type ServiceClient = any; // service-role Supabase client (.from().insert()/.update())

export interface UsageMetadata {
  function_name?: string;
  provider?: string;
  model?: string;
  used_fallback?: boolean;
  duration_ms?: number;
  calls?: number;
  dream_id_prefix?: string; // 8-char prefix ONLY — never a full id or content
  [key: string]: unknown;
}

/**
 * Optimistically record a usage event BEFORE the paid provider call. The
 * `usageType` is written to the `feature` column. Returns the new row id, or
 * null if the write failed (the caller proceeds regardless — recording must
 * never block the request). Never throws.
 */
export async function recordUsage(
  admin: ServiceClient,
  userId: string,
  usageType: string,
  metadata: UsageMetadata = {},
): Promise<string | null> {
  const fn = metadata.function_name ?? usageType;
  try {
    const { data, error } = await admin
      .from("usage_ledger")
      .insert({ feature: usageType, user_id: userId, metadata })
      .select("id")
      .single();
    if (error) {
      console.warn(`USAGE_LEDGER_UNAVAILABLE function=${fn} op=record pg=${error.code ?? "unknown"}`);
      return null;
    }
    return (data?.id as string) ?? null;
  } catch (e) {
    console.warn(
      `USAGE_LEDGER_UNAVAILABLE function=${fn} op=record name=${(e as Error)?.name ?? "Error"}`,
    );
    return null;
  }
}

/**
 * Soft-mark a previously recorded usage row as rolled back (sets
 * rolled_back=true — never deletes). No-op when ledgerId is null. Never throws;
 * a failure degrades to a warning.
 */
export async function rollbackUsage(
  admin: ServiceClient,
  ledgerId: string | null,
  functionName?: string,
): Promise<void> {
  if (!ledgerId) return;
  const fn = functionName ?? "unknown";
  try {
    const { error } = await admin
      .from("usage_ledger")
      .update({ rolled_back: true })
      .eq("id", ledgerId);
    if (error) {
      console.warn(`USAGE_LEDGER_UNAVAILABLE function=${fn} op=rollback pg=${error.code ?? "unknown"}`);
    }
  } catch (e) {
    console.warn(
      `USAGE_LEDGER_UNAVAILABLE function=${fn} op=rollback name=${(e as Error)?.name ?? "Error"}`,
    );
  }
}
