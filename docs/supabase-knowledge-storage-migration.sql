-- Knowledge Base — Storage bucket & policies
--
-- Bucket: knowledge-sources (PRIVATE)
-- Purpose: hold PDFs / large documents uploaded by admins to be processed
--          later by process-knowledge-source (chunk + embed).
--
-- IMPORTANT
--   * The bucket itself MUST be created via the Supabase Storage tool or
--     dashboard. Inserting into `storage.buckets` from SQL is blocked.
--   * Files in this bucket must NEVER be publicly readable.
--   * Edge Functions use the service role and bypass these policies.
--   * No user private dreams should ever be uploaded to this bucket.
--
-- Manual bucket creation (dashboard):
--   Storage → New bucket
--     name:   knowledge-sources
--     public: OFF
--     file size limit (suggested): 50 MB
--     allowed MIME (suggested): application/pdf, text/markdown, text/plain
--
-- After the bucket exists, run the policies below as a migration.

-- =========================================================================
-- RLS policies on storage.objects for bucket 'knowledge-sources'
-- =========================================================================

-- Drop existing (idempotent re-run)
DROP POLICY IF EXISTS "kb_admin_read"   ON storage.objects;
DROP POLICY IF EXISTS "kb_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "kb_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "kb_admin_delete" ON storage.objects;

-- SELECT: only admins (authenticated) may list/download.
CREATE POLICY "kb_admin_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'knowledge-sources'
  AND public.is_admin(auth.uid())
);

-- INSERT: only admins may upload.
CREATE POLICY "kb_admin_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-sources'
  AND public.is_admin(auth.uid())
);

-- UPDATE: only admins may overwrite metadata / replace.
CREATE POLICY "kb_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'knowledge-sources'
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'knowledge-sources'
  AND public.is_admin(auth.uid())
);

-- DELETE: only admins.
CREATE POLICY "kb_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'knowledge-sources'
  AND public.is_admin(auth.uid())
);

-- =========================================================================
-- Notes
-- =========================================================================
-- * `anon` role has no policy here → unauthenticated requests are denied.
-- * Edge Functions using SUPABASE_SERVICE_ROLE_KEY bypass RLS and can
--   download files server-side during processing.
-- * If the workspace blocks public buckets, that is fine: this bucket must
--   stay private.
