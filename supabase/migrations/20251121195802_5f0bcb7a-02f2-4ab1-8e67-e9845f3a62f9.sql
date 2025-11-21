-- Drop existing dream visibility policy
DROP POLICY IF EXISTS "Gli utenti possono vedere i propri sogni" ON public.dreams;

-- Create new policy that respects visibility and is_private flags
CREATE POLICY "Users can view their own dreams or public dreams"
ON public.dreams
FOR SELECT
TO authenticated
USING (
  -- User owns the dream
  auth.uid() = user_id 
  OR 
  -- Dream is explicitly public and not private
  (visibility = 'public' AND NOT COALESCE(is_private, false))
);