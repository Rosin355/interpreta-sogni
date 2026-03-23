-- Add UPDATE policy for dream_conversations so users can edit their own messages
CREATE POLICY "Users can update their own messages"
ON public.dream_conversations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND role = 'user')
WITH CHECK (auth.uid() = user_id AND role = 'user');