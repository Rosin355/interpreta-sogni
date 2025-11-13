-- Drop the insecure public SELECT policy that allows anyone to see all profiles
DROP POLICY IF EXISTS "Gli utenti possono vedere tutti i profili" ON public.profiles;

-- Verify that the secure policy exists (it should already be there from a previous migration)
-- This policy ensures users can only view their own profile
-- CREATE POLICY "Users can view only their own profile"
-- ON public.profiles
-- FOR SELECT
-- TO authenticated
-- USING (auth.uid() = id);