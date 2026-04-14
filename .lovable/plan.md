

# Plan: Fix interpretation AI errors and VoiceRecorder build error

## Root Causes Identified

1. **Build error (PROBLEMA 2)**: `VoiceRecorder.tsx` uses `hideCloseButton` prop on `DialogContent`, but the `dialog.tsx` component doesn't support that prop. This is blocking the build/preview.

2. **Interpretation AI error (PROBLEMA 1)**: Two issues found:
   - **NewDream.tsx line 241-245**: The call to `interpret-dream-with-astrology` is missing `dreamId` in the body. The edge function requires it (line 336-338 throws "Dream ID is required").
   - **config.toml**: `interpret-dream-with-astrology` is NOT configured with `verify_jwt = false`, unlike other functions. Per project memory, this causes 401 errors due to signing key discrepancies. It needs `verify_jwt = false` (auth is validated in-code via `getUser()`).

## Changes

### 1. Fix `src/components/ui/dialog.tsx` — add `hideCloseButton` support
Add an optional `hideCloseButton?: boolean` prop to `DialogContent`. When true, skip rendering the close X button. This fixes the TS2322 build error in VoiceRecorder.tsx.

### 2. Fix `src/pages/NewDream.tsx` — pass `dreamId` to interpretation call
Change lines 241-245 to include `dreamId: data.id` in the body sent to `interpret-dream-with-astrology`.

### 3. Fix `supabase/config.toml` — add `verify_jwt = false` for `interpret-dream-with-astrology`
Add the missing function config entry, consistent with the other functions that validate JWT in-code.

### 4. Improve error handling in `src/pages/DreamDetail.tsx`
Make the error toast show the actual server error message instead of a generic one, following the pattern already used elsewhere.

### Files changed
- `src/components/ui/dialog.tsx` — add `hideCloseButton` prop
- `src/pages/NewDream.tsx` — add missing `dreamId` field
- `supabase/config.toml` — add interpret-dream-with-astrology config
- `src/pages/DreamDetail.tsx` — improve error message in toast

### No changes to
- Auth flows, Supabase edge functions code, routing, dashboard, or any unrelated files

