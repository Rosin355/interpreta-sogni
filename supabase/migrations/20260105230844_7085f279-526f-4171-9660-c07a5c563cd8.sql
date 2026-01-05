-- Drop the existing policy with the vulnerability
DROP POLICY IF EXISTS "Users can view their own dreams or public dreams" ON public.dreams;

-- Create a new policy with proper NULL handling
-- Using is_private = false instead of NOT COALESCE(is_private, false)
-- This ensures NULL values are treated as private (not exposed)
CREATE POLICY "Users can view their own dreams or public dreams" 
ON public.dreams 
FOR SELECT 
USING (
  (auth.uid() = user_id) 
  OR 
  ((visibility = 'public'::text) AND (is_private = false))
);