
CREATE TABLE public.dream_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dream_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.dream_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON public.dream_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.dream_conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_dream_conversations_dream_id ON public.dream_conversations(dream_id);
CREATE INDEX idx_dream_conversations_user_id ON public.dream_conversations(user_id);
