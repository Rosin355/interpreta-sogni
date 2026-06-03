## Goal

Add a planned "PDF / large document" ingestion path to the Knowledge Base, alongside the existing manual-text path. This pass is **docs + minimal backend scaffolding** — no PDF parsing, no embeddings, no UI work, no automatic deploy.

## Scope rules (recap)

- No iOS changes.
- No AI provider calls (OpenAI / Anthropic / Lovable / ElevenLabs).
- No PDF text extraction in this pass.
- No retrieval, no embeddings.
- Service role key stays server-side; no PDF contents / raw_text / JWTs logged.
- Every status / context doc stays under 300 lines.

## Architecture target

```
Admin uploads PDF
   └─► Supabase Storage (private bucket: knowledge-sources)
         └─► ingest-knowledge-source (source_type='pdf', storage_path=...)
               └─► ai_knowledge_sources row, raw_text=NULL, status='draft'
                     └─► (future) process-knowledge-source: download → extract → chunk → embed → 'active'
```

Two ingestion paths coexist:

| Path | source_type | raw_text | storage_path |
|---|---|---|---|
| Manual text | `manual_text` / `note` / `markdown` / `txt` | required (100–200k chars) | null |
| File upload | `pdf` | null | required |

Status lifecycle for PDFs: `draft` → `processing` → `active` / `failed`.

## Task list

### 1. Docs — strategy

Update `docs/ai-knowledge-base-strategy-v1.md`:
- Add section **"Large Document / PDF Ingestion"** describing the two paths, the status lifecycle, and the rule "do not paste large PDFs into the manual form".
- Keep file short.

### 2. Docs — storage migration

Create `docs/supabase-knowledge-storage-migration.sql`:
- Document private bucket `knowledge-sources` (not publicly readable).
- Provide safe RLS policies on `storage.objects` restricting access to admins only (read + insert + delete via `public.is_admin(auth.uid())`), so Edge Functions using the service role still work and authenticated non-admins cannot reach the files.
- Document that bucket creation itself must be done via the Supabase Storage tool / dashboard (manual step), since `INSERT INTO storage.buckets` is blocked by workspace rules. SQL in the file only handles policies.
- Include a short manual-dashboard fallback section.

### 3. Backend — extend `ingest-knowledge-source` (safe, minimal)

Edit `supabase/functions/ingest-knowledge-source/index.ts`:
- Extend the Zod schema:
  - Add `"pdf"` to `source_type` enum.
  - Add optional `storage_path: z.string().min(1).max(500).optional()`.
  - Make `raw_text` conditional: required for non-pdf, optional for `pdf`.
  - Cross-field validation via `superRefine`:
    - if `source_type === "pdf"` → `storage_path` required, `raw_text` optional/null.
    - otherwise → `raw_text` required (existing 100–200k rule), `storage_path` ignored.
- Insert/update path: persist `storage_path` on the row. `metadata.ingest_method` becomes `"manual_text"` or `"pdf_upload"`. For PDFs, force `status = 'draft'` and `processed_at = null`.
- **No file upload inside the function.** The admin UI (future task) is expected to upload directly to the bucket using a signed upload URL or service-side helper, then call this function with `storage_path` and metadata only.
- **No PDF parsing.** Logging stays prefix-only.

This is a backwards-compatible extension: existing manual_text clients keep working unchanged.

### 4. Docs — ingest function update

Update `docs/admin-knowledge-ingest-v1.md`:
- Document the new `source_type='pdf'` + `storage_path` flow.
- Add a small example curl for PDF metadata insertion.
- Restate "no PDF parsing here".

### 5. Docs — admin UI plan

Update `docs/admin-knowledge-base-v1.md`:
- Add a "Planned: PDF upload form" section: file input, drag&drop, progress, domain/tags/language metadata, status badge, "Processa documento" CTA (disabled placeholder), "Preview extracted text" (future).
- Clarify that the upload uses the private `knowledge-sources` Storage bucket, then calls `ingest-knowledge-source` with `source_type='pdf'` and `storage_path`.

### 6. Docs — processing roadmap

Update `docs/admin-knowledge-process-v1.md`:
- Add branch: if `source_type === 'pdf'` → download from `storage_path` (service role) → extract text → clean → chunk → (later) embeddings → activate.
- Add **timeout / large-document risk** section: very large PDFs may exceed Edge Function limits, future queue / batch / background job may be needed.

### 7. Status docs

- `docs/WEB_TASKS.md`: move "PDF / Markdown / TXT upload" to a new "In Progress (scaffolding)" line; add TODOs for bucket creation, admin UI form, signed upload URL helper. Keep under 300 lines.
- `docs/AI_BACKEND_STATUS.md`: note that `ingest-knowledge-source` accepts `source_type='pdf'` + `storage_path`; PDF parsing & embeddings still planned.
- `docs/PROJECT_STATUS.md`: add one line under Active Workstream about PDF ingestion scaffolding. Bump `Last Updated`.

### 8. No deploy / no AI

- Do not run `supabase functions deploy`.
- Do not call the function.
- Do not call any AI provider.
- Do not create the Storage bucket automatically — surface it as a manual step (user can ask me to create it next).

## Out of scope (explicitly)

- Building the admin UI PDF form (planned next).
- PDF text extraction implementation.
- `embed-knowledge-source`.
- Any retrieval wiring.
- iOS changes.

## Final report (after build mode)

- Files added / changed.
- Confirmation: no runtime AI calls, no deploy, no iOS changes.
- Whether PDF upload is implemented (answer: only metadata path + storage policies; UI + parsing still planned).
- Whether bucket creation is required (answer: yes, manual — via Storage tool or dashboard).
- Line counts for updated status docs.
- Next safe step recommendation.
