
-- Create password_reset_tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but with NO policies = no public access, only service_role can access
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Index for lookups by email
CREATE INDEX idx_password_reset_tokens_email ON public.password_reset_tokens (email, used, expires_at);
