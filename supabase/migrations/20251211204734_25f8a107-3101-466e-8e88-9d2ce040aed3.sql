-- Remove the problematic "Block anonymous access" policy
-- The other policies already check auth.uid() IS NOT NULL which effectively blocks anonymous access
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;