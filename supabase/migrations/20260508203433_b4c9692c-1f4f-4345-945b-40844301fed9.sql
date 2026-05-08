
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings"
ON public.app_settings FOR SELECT
USING (true);

CREATE POLICY "Super admins can insert app_settings"
ON public.app_settings FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update app_settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete app_settings"
ON public.app_settings FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

INSERT INTO public.app_settings (key, value)
VALUES ('launch_announcement_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
