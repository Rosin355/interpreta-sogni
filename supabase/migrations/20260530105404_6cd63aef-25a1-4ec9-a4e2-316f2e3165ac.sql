CREATE TABLE public.signup_attributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'direct',
  dream_id UUID,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.signup_attributions TO authenticated;
GRANT ALL ON public.signup_attributions TO service_role;

ALTER TABLE public.signup_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own attribution"
ON public.signup_attributions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own attribution"
ON public.signup_attributions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attributions"
ON public.signup_attributions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_signup_attributions_source ON public.signup_attributions(source);
CREATE INDEX idx_signup_attributions_dream_id ON public.signup_attributions(dream_id) WHERE dream_id IS NOT NULL;
CREATE INDEX idx_signup_attributions_created_at ON public.signup_attributions(created_at DESC);