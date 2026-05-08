
CREATE TABLE public.launch_announcement_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  wants_updates BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.launch_announcement_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own acknowledgment"
  ON public.launch_announcement_acknowledgments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own acknowledgment"
  ON public.launch_announcement_acknowledgments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all acknowledgments"
  ON public.launch_announcement_acknowledgments
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE INDEX idx_launch_ack_email ON public.launch_announcement_acknowledgments(email) WHERE email IS NOT NULL;
