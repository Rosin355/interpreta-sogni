-- Remove the public access policy
DROP POLICY IF EXISTS "Tutti possono leggere la knowledge base" ON public.dream_knowledge_base;

-- Create a new policy that only allows authenticated users to read
CREATE POLICY "Authenticated users can read knowledge base" 
ON public.dream_knowledge_base 
FOR SELECT 
TO authenticated
USING (true);