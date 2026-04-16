CREATE POLICY "Users can view dreams shared with them via dream_shares"
ON public.dreams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dream_shares ds
    WHERE ds.dream_id = dreams.id
      AND (ds.shared_with_user_id = auth.uid() OR ds.professional_id = auth.uid())
      AND ds.status IN ('pending', 'accepted')
  )
);