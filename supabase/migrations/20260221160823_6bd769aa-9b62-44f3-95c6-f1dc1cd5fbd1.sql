
-- Add share_token column to dreams table
ALTER TABLE public.dreams ADD COLUMN share_token TEXT UNIQUE DEFAULT NULL;

-- Create index for fast lookups
CREATE INDEX idx_dreams_share_token ON public.dreams (share_token) WHERE share_token IS NOT NULL;

-- RPC function to get dream by share token (SECURITY DEFINER, no user_id exposed)
CREATE OR REPLACE FUNCTION public.get_dream_by_share_token(token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'title', d.title,
    'content', d.content,
    'mood', d.mood,
    'tags', d.tags,
    'image_url', d.image_url,
    'dream_date', d.dream_date,
    'interpretation', d.interpretation,
    'interpretation_summary', d.interpretation_summary,
    'created_at', d.created_at
  ) INTO result
  FROM public.dreams d
  WHERE d.share_token = token;

  RETURN result;
END;
$$;
