

## Problem
The image generation error handling in `DreamDetail.tsx` (and `EditDream.tsx`) doesn't use the same robust pattern as the interpretation flow. Specifically:

1. **No `error.context.json()` extraction**: When `supabase.functions.invoke('generate-dream-image')` returns a non-2xx (e.g. 429, 402, 500), the JS client wraps it as `FunctionsHttpError` and `data` is `null`. The current code reads `data?.errorCode`, which is always undefined → falls through to a generic message.
2. **No error logging**: errors aren't written to `error_logs`, so they don't appear in the admin Errors tab.
3. **`EditDream.tsx`** has an even more basic handler with no parsing at all.

## Fix — mirror the interpretation pattern

### 1. `src/pages/DreamDetail.tsx` — `handleGenerateImage`
Replace the error branch (lines ~348–388) to:
- Extract real error from `error.context.json()` → `errBody.error` / `errBody.errorCode` / `errBody.details`.
- Map known `errorCode` values (`AI_RATE_LIMIT`, `AI_CREDITS_EXHAUSTED`, `IMAGE_SAFETY_BLOCKED`, `VALIDATION_ERROR`, `FORBIDDEN`, `DREAM_NOT_FOUND`, `RATE_LIMIT`) to friendly Italian messages.
- Insert into `error_logs` with `error_code`, `error_message_user`, `error_message_technical`, `function_name: 'generate-dream-image'`, `dream_id: id`, plus metadata (style, autoStyle, hasCustomPrompt).
- Show destructive toast with the real message.
- Same logging in the `catch` block (unexpected exceptions).

### 2. `src/pages/EditDream.tsx` — `handleRegenerateImage`
Apply the exact same parse + log + toast pattern.

### Files changed
- `src/pages/DreamDetail.tsx` — rewrite the error/catch branches of `handleGenerateImage`
- `src/pages/EditDream.tsx` — rewrite the error/catch branches of `handleRegenerateImage`

### Not touched
- Edge function `generate-dream-image` (already returns structured `{ error, errorCode, details }`)
- `NewDream.tsx` (image generation there is best-effort, silent — out of scope)
- Admin Errors tab, dialog, auth, supabase config

