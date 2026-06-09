-- Knowledge Base — widen ai_knowledge_sources.status CHECK to allow 'archived'
--
-- WHY
--   The admin Knowledge Base UI and the `manage-knowledge-source` Edge Function
--   set `status = 'archived'` (archive / restore_draft flow), but the original
--   schema CHECK constraint only allowed: draft, processing, active, failed.
--   Writing 'archived' against the old constraint raises a check violation.
--
-- WHAT THIS DOES
--   * Drops any existing CHECK constraint defined on the `status` column
--     (regardless of its name), so re-running is safe and we don't end up with
--     two conflicting CHECK constraints.
--   * Re-adds a single, well-named constraint allowing the full status set:
--       draft, processing, active, archived, failed
--
-- SAFETY
--   * NON-destructive: no DROP TABLE, no DELETE, no data mutation. Only the
--     CHECK constraint definition changes.
--   * Idempotent: safe to run more than once (the dynamic drop + IF EXISTS
--     guards remove the prior constraint before re-adding it).
--   * The new value set is a SUPERSET of the old one, so existing rows remain
--     valid and constraint validation will pass. Rows already written as
--     'archived' by the Edge Function also become valid.
--   * Run manually in the Supabase SQL editor / via `supabase db` — it is NOT
--     executed automatically by the app.
--
-- PRE-CHECK (optional) — surface any rows that would block the new constraint.
-- Expected result: 0 rows. If non-empty, reconcile those statuses first.
--
--   SELECT id, status
--   FROM public.ai_knowledge_sources
--   WHERE status NOT IN ('draft','processing','active','archived','failed');

-- =========================================================================
-- 1) Drop existing CHECK constraint(s) on the status column (idempotent)
-- =========================================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class      rel ON rel.oid = con.conrelid
    JOIN pg_namespace  nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute  att ON att.attrelid = con.conrelid
                          AND att.attnum   = ANY (con.conkey)
    WHERE con.contype  = 'c'
      AND nsp.nspname  = 'public'
      AND rel.relname  = 'ai_knowledge_sources'
      AND att.attname  = 'status'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.ai_knowledge_sources DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

-- =========================================================================
-- 2) Re-add the widened constraint with a stable, conventional name
-- =========================================================================
ALTER TABLE public.ai_knowledge_sources
  ADD CONSTRAINT ai_knowledge_sources_status_check
  CHECK (status IN ('draft', 'processing', 'active', 'archived', 'failed'));

-- =========================================================================
-- 3) Verify (optional) — inspect the resulting constraint definition
-- =========================================================================
--   SELECT conname, pg_get_constraintdef(oid) AS definition
--   FROM pg_constraint
--   WHERE conrelid = 'public.ai_knowledge_sources'::regclass
--     AND contype  = 'c';
--
-- Expected definition:
--   CHECK (status = ANY (ARRAY['draft','processing','active','archived','failed']))
