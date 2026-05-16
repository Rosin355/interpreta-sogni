/**
 * Test stubs for _shared/usage-ledger.ts
 *
 * All functions must fail open — a DB error should never block user actions.
 */

// ── recordUsage ───────────────────────────────────────────────────────────────

// CASE 1: Successful insert → returns a UUID string
// CASE 2: usage_ledger table doesn't exist → returns null (no throw)
// CASE 3: DB error → returns null (no throw)

// ── rollbackUsage ─────────────────────────────────────────────────────────────

// CASE 4: Valid id → sets rolled_back = true
// CASE 5: null id → no-op, no throw
// CASE 6: Non-existent id → no-op, no throw
// CASE 7: DB error → no throw

// ── getMonthlyUsage ───────────────────────────────────────────────────────────

// CASE 8: 3 non-rolled-back entries for feature this month → returns 3
// CASE 9: 3 entries but 1 rolled_back → returns 2
// CASE 10: Entries from previous month not counted → returns 0
// CASE 11: Table doesn't exist → returns 0 (fail open)

// ── getUsageSummary ───────────────────────────────────────────────────────────

// CASE 12: Mixed features, returns one entry per feature with correct counts
// CASE 13: Rolled-back entries excluded from counts
// CASE 14: DB error → returns [] (fail open)

// ── Integration: record → rollback → getMonthlyUsage ─────────────────────────

// CASE 15: Record a usage, then roll it back → getMonthlyUsage returns 0

export {};
