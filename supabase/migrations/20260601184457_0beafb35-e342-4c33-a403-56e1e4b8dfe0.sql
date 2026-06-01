CREATE POLICY "Admins can view all knowledge sources"
ON public.ai_knowledge_sources
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));