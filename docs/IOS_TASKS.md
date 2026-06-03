# iOS Tasks & Status

> Companion to [`PROJECT_STATUS.md`](./PROJECT_STATUS.md). Keep < 300 lines.

## Current iOS Status

Functional pre-RevenueCat build. Dream journal end-to-end works (create →
sync → AI interpret → edit → soft-delete). Astrology, Alchemist chat,
audio reflection and community/share UIs are stubbed and waiting for the
Knowledge Base + entitlement layer.

## Completed

- [x] Local dream creation
- [x] SwiftData storage
- [x] Mood picker
- [x] Cloud sync (with retry + pending queue)
- [x] Remote cache of synced dreams
- [x] Edit / delete (soft delete via `dreams.deleted_at`)
- [x] AI interpretation button (manual trigger only)
- [x] Persisted interpretation / `ai_symbols` / `ai_reflection_questions`
- [x] Stale-AI prompt when dream content changes after interpretation
- [x] Legacy AI prompt fallback for older dreams
- [x] Share sheet stub
- [x] Action buttons stubs (audio / chat / community)

## Current TODOs

- [ ] Polish TestFlight QA pass (crash-free, empty states, error toasts)
- [ ] Reduce noisy console logs before release (drop verbose sync diagnostics)
- [ ] Verify Serquet tester flow (Anthropic override hits + usage logged)
- [ ] Wire monthly AI usage display (later, once entitlements land)
- [ ] Integrate RevenueCat SDK (later)

## Later TODOs

- [ ] Alchemist chat UI (calls `chat-with-alchemist` Edge Function)
- [ ] ElevenLabs audio reflection UI (TTS playback of interpretation)
- [ ] Public / community share UI
- [ ] Real share links (deep-link + web fallback to `/dreams/:share_token`)
- [ ] Astrology view connected to `calculate-natal-chart`
- [ ] Alchemy phase view connected to backend (currently local heuristic)

## Known Risks

- TestFlight log noise could leak dream content if not pruned — verify before each build.
- Sync retry queue must stay idempotent; never weaken the `client_local_id` invariant.
- Manual-only AI trigger must hold: an accidental auto-call on edit would double-charge `usage_ledger`.
- Stale-AI prompt logic depends on content hash — re-test after any dream edit refactor.

## Files / Areas to Inspect

- `Models/Dream.swift` — SwiftData model, `client_local_id`, `deleted_at`
- `Services/DreamSyncService.swift` — sync queue, retry, idempotency
- `Services/AIService.swift` — calls `interpret-dream` Edge Function
- `Views/DreamDetail*.swift` — interpretation UI + stale-AI prompt
- `Views/DreamEditor*.swift` — mood picker, edit/delete flow
- `Views/ShareSheet*.swift` — current stubs

> When iOS source lives in a separate repo, mirror the above filenames there.
