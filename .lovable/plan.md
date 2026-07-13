## Problem

Step 2 of the password reset ("Verifica codice") always fails because the deployed `supabase/functions/verify-reset-token/index.ts` is the old single-step version. The frontend (`src/hooks/usePasswordReset.ts`) now issues two calls:

- Step 2: `{ email, code, mode: "verify" }` — no `newPassword`
- Step 3: `{ email, code, newPassword, mode: "reset" }`

and expects `{ success: true }` on success, `{ code: "..." }` on errors. The deployed function ignores `mode`, always requires `newPassword` (so step 2 returns 400), and returns `{ message }` / `{ error }` — hence the generic "Impossibile aggiornare la password" toast.

## Fix

Rewrite `supabase/functions/verify-reset-token/index.ts` as a two-mode endpoint aligned with the frontend contract. No frontend changes, no DB changes, `verify_jwt = false` preserved.

### Behavior

1. Parse `{ email, code, newPassword?, mode? }`. Default `mode = "reset"`. Accept only `"verify"` or `"reset"` (else `VALIDATION_ERROR`).
2. Common validation (both modes):
   - `email` present and valid shape → else `VALIDATION_ERROR`
   - `code` is a 6-digit string → else `VALIDATION_ERROR`
3. `mode === "reset"` extra validation:
   - `newPassword` is string, length ≥ 8, contains uppercase + digit → else `PASSWORD_POLICY_VIOLATION`
4. Lookup latest `password_reset_tokens` row for normalized email where `used = false` and `expires_at > now()`. If none → `TOKEN_INVALID_OR_EXPIRED`.
5. If `attempts >= 5` → mark `used = true`, return `TOKEN_ATTEMPTS_EXCEEDED`.
6. Compare SHA-256 of `code` to `tokenRecord.token`:
   - Mismatch → increment `attempts` by 1, return `TOKEN_MISMATCH`.
   - Match → **do not** increment attempts (so verify→reset doesn't burn a try).
7. Branch on mode:
   - `"verify"`: return `{ success: true }`. Do NOT mark token used.
   - `"reset"`: call `supabase.auth.admin.updateUserById(user_id, { password: newPassword })`.
     - On error whose message contains "should be different" / "different from the old" / "same_password" → `PASSWORD_REUSED`.
     - Other update errors → generic 500 with `code: "UPDATE_FAILED"`.
     - On success: mark token `used = true`, return `{ success: true }`.
8. All error responses use shape `{ success: false, code: "<CODE>", message: "<italian human message>" }` with appropriate HTTP status (400 for validation/token errors, 500 for unexpected). CORS headers on every response including OPTIONS.

### Error code → HTTP status map

| code | status |
|---|---|
| VALIDATION_ERROR | 400 |
| PASSWORD_POLICY_VIOLATION | 400 |
| TOKEN_INVALID_OR_EXPIRED | 400 |
| TOKEN_ATTEMPTS_EXCEEDED | 400 |
| TOKEN_MISMATCH | 400 |
| PASSWORD_REUSED | 400 |
| UPDATE_FAILED | 500 |

## Files changed

- `supabase/functions/verify-reset-token/index.ts` — rewrite as above.

Nothing else. `supabase/config.toml` already has `verify_jwt = false` for this function.

## Git / deploy

Note: git branching, PR creation, and deploy gating are not operations I can perform from here — Lovable manages the repo and edge-function deploys automatically when files change. I'll implement the file change only; you can review the diff in the Lovable UI before publishing. If you want a hard hold on deploy, tell me and I'll pause before applying.

## Validation after implementation

1. `supabase--deploy_edge_functions` for `verify-reset-token` (only if you approve deploy).
2. `supabase--curl_edge_functions` sanity checks:
   - Missing `newPassword` with `mode: "verify"` → `{ success: true }` for a valid code.
   - Wrong code → `{ code: "TOKEN_MISMATCH" }`, attempts incremented.
   - Correct code twice (verify then reset) → both succeed, attempts unchanged between them.
   - Reset with weak password → `PASSWORD_POLICY_VIOLATION`.
