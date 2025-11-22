-- Add super_admin role to enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typcategory = 'E') THEN
    CREATE TYPE app_role AS ENUM ('user', 'professional', 'admin', 'super_admin');
  ELSE
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
  END IF;
END $$;

-- Assign super_admin role to Romesh
INSERT INTO user_roles (user_id, role)
VALUES ('b54f9e25-381c-4029-a096-8cb1c44c94b7', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Update is_admin to include super_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

-- Super Admin can view ALL dreams (including private)
CREATE POLICY "Super admins can view all dreams"
  ON dreams FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super Admin can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super Admin can view all dream shares
CREATE POLICY "Super admins can view all dream shares"
  ON dream_shares FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super Admin can view all professional comments
CREATE POLICY "Super admins can view all comments"
  ON professional_comments FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Extend dream_shares table for user-to-user sharing
ALTER TABLE dream_shares 
ALTER COLUMN professional_id DROP NOT NULL;

ALTER TABLE dream_shares 
ADD COLUMN IF NOT EXISTS shared_with_user_id UUID REFERENCES auth.users(id);

-- Constraint: must be shared with professional OR user
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_share_recipient'
  ) THEN
    ALTER TABLE dream_shares
    ADD CONSTRAINT check_share_recipient 
    CHECK (
      (professional_id IS NOT NULL AND shared_with_user_id IS NULL) OR
      (professional_id IS NULL AND shared_with_user_id IS NOT NULL)
    );
  END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_dream_shares_shared_with_user 
ON dream_shares(shared_with_user_id);

CREATE INDEX IF NOT EXISTS idx_dream_shares_status 
ON dream_shares(status, created_at DESC);

-- RLS policies for user-to-user sharing
CREATE POLICY "Users can share dreams with other users"
  ON dream_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND 
    (
      (professional_id IS NOT NULL AND shared_with_user_id IS NULL) OR
      (professional_id IS NULL AND shared_with_user_id IS NOT NULL)
    )
  );

CREATE POLICY "Users can view dreams shared with them"
  ON dream_shares FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.uid() = shared_with_user_id OR
    (auth.uid() = professional_id AND has_role(auth.uid(), 'professional'::app_role))
  );

CREATE POLICY "Users can update share status for shares they received"
  ON dream_shares FOR UPDATE
  TO authenticated
  USING (auth.uid() = shared_with_user_id OR auth.uid() = professional_id)
  WITH CHECK (auth.uid() = shared_with_user_id OR auth.uid() = professional_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_dreams_user_id_date 
ON dreams(user_id, dream_date DESC);

CREATE INDEX IF NOT EXISTS idx_dream_shares_user_notifications
ON dream_shares(shared_with_user_id, status, created_at DESC)
WHERE status = 'pending';