-- Remove the authenticated users policy
DROP POLICY IF EXISTS "Authenticated users can read knowledge base" ON public.dream_knowledge_base;

-- Create a new policy that only allows admins to read
CREATE POLICY "Only admins can read knowledge base" 
ON public.dream_knowledge_base 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));