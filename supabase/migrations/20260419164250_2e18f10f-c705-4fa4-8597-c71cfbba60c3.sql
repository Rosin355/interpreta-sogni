-- Defense-in-depth: explicitly deny all client access to password_reset_tokens.
-- Edge Functions use the service role key which bypasses RLS, so they keep working.

-- Drop any pre-existing permissive policies (idempotent safety)
DROP POLICY IF EXISTS "Users can view their own password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can create their own password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can update their own password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can delete their own password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Deny all client access to password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Deny client SELECT on password_reset_tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Deny client INSERT on password_reset_tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Deny client UPDATE on password_reset_tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Deny client DELETE on password_reset_tokens" ON public.password_reset_tokens;

-- Ensure RLS is enabled
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Restrictive policies = AND-combined with any other policy.
-- With "USING (false)" / "WITH CHECK (false)" they unconditionally deny
-- access for anon and authenticated roles, while service_role bypasses RLS entirely.

CREATE POLICY "Deny client SELECT on password_reset_tokens"
ON public.password_reset_tokens
AS RESTRICTIVE
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "Deny client INSERT on password_reset_tokens"
ON public.password_reset_tokens
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Deny client UPDATE on password_reset_tokens"
ON public.password_reset_tokens
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client DELETE on password_reset_tokens"
ON public.password_reset_tokens
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);