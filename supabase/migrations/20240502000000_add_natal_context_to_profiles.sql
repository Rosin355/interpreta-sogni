ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS natal_context text;

COMMENT ON COLUMN public.profiles.natal_context IS 'SENSITIVE: XML context from Astrologer API for AI interpretation';
