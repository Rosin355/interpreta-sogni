-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own dreams or public dreams" ON public.dreams;

-- Recreate as two separate PERMISSIVE policies
-- Users can always see their own dreams
CREATE POLICY "Users can view their own dreams"
ON public.dreams
FOR SELECT
USING (auth.uid() = user_id);

-- Anyone authenticated can see public dreams
CREATE POLICY "Anyone can view public dreams"
ON public.dreams
FOR SELECT
USING (visibility = 'public' AND is_private = false);