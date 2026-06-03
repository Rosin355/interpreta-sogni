
-- 1. set_updated_at search_path
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- 2. launch_announcement_acknowledgments: allow owner UPDATE/DELETE
CREATE POLICY "Users can update their own acknowledgment"
  ON public.launch_announcement_acknowledgments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own acknowledgment"
  ON public.launch_announcement_acknowledgments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. push_device_tokens: add user_id + RLS
ALTER TABLE public.push_device_tokens
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS push_device_tokens_user_id_idx
  ON public.push_device_tokens(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_device_tokens TO authenticated;
GRANT ALL ON public.push_device_tokens TO service_role;

CREATE POLICY "Users manage their own device tokens select"
  ON public.push_device_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own device tokens insert"
  ON public.push_device_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own device tokens update"
  ON public.push_device_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own device tokens delete"
  ON public.push_device_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. user_roles: restrict admin policies to authenticated role explicitly
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 5. Remove dream_shares and professional_comments from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.dream_shares;
ALTER PUBLICATION supabase_realtime DROP TABLE public.professional_comments;
