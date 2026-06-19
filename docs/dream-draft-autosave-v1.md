# Dream Draft Autosave (v1)

Resilient autosave for `/dreams/new` so users do not lose written
content when closing the browser, refreshing, or navigating away on
mobile.

## Two-layer architecture

| Layer       | Storage                | Debounce | Scope            |
| ----------- | ---------------------- | -------- | ---------------- |
| Emergency   | `localStorage`         | ~800ms   | Per device/user  |
| Cloud       | Supabase `dream_drafts`| ~8s      | Synced device→cloud |

The local layer is the reliable emergency backup; the cloud layer is
the cross-device sync.

### localStorage key

`dream_draft_local_<userId>` — JSON payload:

```json
{
  "title": "...",
  "content": "...",
  "dream_date": "YYYY-MM-DD",
  "dream_time": "HH:mm",
  "mood": "...",
  "tags": "comma,separated",
  "updated_at": "ISO timestamp"
}
```

## Hook API

`src/hooks/useDreamDraft.ts`:

```ts
const {
  isSaving,
  lastSaved,
  lastSavedText,
  draft,
  hasDraft,
  saveDraft,
  deleteDraft,
  restoreDraft,
} = useDreamDraft(formData, true);
```

- `draft` — newest available draft (cloud or local), or `null`.
- `hasDraft` — true while the user has not yet decided to restore or
  discard.
- `restoreDraft()` — returns the draft data once and marks it as
  consumed (so the prompt won't re-open).
- `deleteDraft()` — deletes both local + cloud copies.
- `saveDraft()` — flushes immediately to local + cloud.

## Restore flow

On mount the hook loads both Supabase and localStorage drafts and
picks the **newest** by `updated_at`. If a non-empty draft exists,
the page shows an `AlertDialog`:

> Abbiamo trovato una bozza non salvata. Vuoi ripristinarla?

Actions:

- **Ripristina** → populates `title`, `content`, `dream_date`,
  `dream_time`, `mood`, `tags`.
- **Scarta** → deletes both local and cloud copies.

The user's current input is never silently overwritten — the dialog
gates the restore.

## Autosave timing

- `formData` change → debounce **800ms** → `localStorage` write.
- `formData` change → debounce **8s** → Supabase upsert.
- Skipped when the form is fully empty.
- Cloud writes deduped via a serialized snapshot (no re-write if
  data unchanged).

## Mobile close / navigation events

Listeners attached on mount:

- `pagehide`
- `beforeunload`
- `visibilitychange` (when `hidden`)

On each event:

1. `localStorage` is written **synchronously** (reliable).
2. A best-effort Supabase save is fired (no `await` blocks unload).

## Navigation protection

The **Torna alla Dashboard** and **Annulla** buttons run a small
guard: if the form has unsaved content, the draft is saved and the
user is prompted with `window.confirm`:

> Hai una bozza non salvata. Vuoi uscire comunque?

The form submit path is not gated — successful submission proceeds
directly.

## Cleanup after successful save

In `NewDream.handleSubmit`, after the dream row is inserted:

1. `deleteDraft()` removes both Supabase row and `localStorage` key.
2. App cache is invalidated (`invalidateDreamsCache`,
   `invalidateAlchemyCache`).
3. Navigate to `/dreams/:id`.

## Privacy & logging

- Draft contents are **never logged**. All `catch` blocks are silent
  for content paths (only a generic toast for cloud save failure).
- `dream_drafts` rows are user-scoped via RLS (`auth.uid()`).
- `localStorage` is per-device; clearing browser data removes it.

## UI status indicator

Header of the `Nuovo Sogno` card shows:

- `Salvataggio…` while a cloud write is in flight,
- `Bozza salvata · 12s fa` after a cloud save,
- `Salvato localmente · 1s fa` between cloud saves.

## Known limitations

- `beforeunload` Supabase writes are best-effort; on real unload the
  browser may abort the fetch. The local copy is the safety net.
- Two devices editing simultaneously: last cloud write wins; local
  draft remains on each device.
- `localStorage` quota: ~5MB; a typical dream draft is well under.
- Private browsing / locked storage: cloud layer still works; local
  writes silently no-op.
- No cross-tab sync (no `storage` event listener in v1).

## Files

- `src/hooks/useDreamDraft.ts` — hook implementation.
- `src/pages/NewDream.tsx` — restore dialog, leave guard, submit
  cleanup, status indicator.
- Supabase table `dream_drafts` (existing, RLS user-scoped).
