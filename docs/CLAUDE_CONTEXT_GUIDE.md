# Claude Context Guide — Read This First

> Lightweight onboarding for any new Claude Code session on DreamAlchemist.
> Goal: understand the project state in ≤ 4 short files, not the whole repo.

## When starting a new Claude Code chat

1. **Read [`docs/PROJECT_STATUS.md`](./PROJECT_STATUS.md) first.** It gives the
   current milestone, completed work, active workstream and golden rules.
2. **Then read only the relevant task file:**
   - iOS work → [`docs/IOS_TASKS.md`](./IOS_TASKS.md)
   - Web / admin work → [`docs/WEB_TASKS.md`](./WEB_TASKS.md)
   - AI / backend work → [`docs/AI_BACKEND_STATUS.md`](./AI_BACKEND_STATUS.md)
3. **Open detailed docs only when needed**
   (e.g. `admin-knowledge-base-v1.md`, `ai-knowledge-base-strategy-v1.md`,
   `email-deliverability-checklist.md`).
4. **Do not scan the whole repo** unless the task requires it.
   Prefer targeted `rg` / file reads.

## After every completed task

- Update the relevant status file (`IOS_TASKS.md`, `WEB_TASKS.md`,
  `AI_BACKEND_STATUS.md`) and bump the `Last Updated` in
  `PROJECT_STATUS.md` if the milestone or completed-list changes.
- Keep each status file **under 300 lines**.
- Do **not** duplicate long documentation — link to the specialized doc.
- Add a short commit hash / date next to a checkbox when it helps locate
  the change (optional).

## Prompt Starters

Copy / paste at the start of a focused chat.

### iOS

> Read `docs/PROJECT_STATUS.md` and `docs/IOS_TASKS.md`, then continue
> from the current iOS TODOs. Do not modify web / admin files unless
> required.

### Web / Admin

> Read `docs/PROJECT_STATUS.md` and `docs/WEB_TASKS.md`, then continue
> from the current web / admin TODOs. Do not modify iOS files.

### AI / Backend

> Read `docs/PROJECT_STATUS.md` and `docs/AI_BACKEND_STATUS.md`, then
> continue from the current AI / backend TODOs. Do not call AI providers
> unless explicitly asked.

## House rules recap

- No API keys in iOS — iOS only talks to Supabase.
- AI calls are server-side and tracked in `usage_ledger`.
- AI is **never** triggered automatically after edits — user-initiated only.
- No raw dream content in logs (client or Edge Functions).
- Status docs stay under 300 lines; detail lives in specialized docs.
