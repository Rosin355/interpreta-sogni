-- Create or replace trigger function to ensure is_private is never NULL
CREATE OR REPLACE FUNCTION public.ensure_dream_privacy_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure is_private is never NULL (default to true for safety)
  IF NEW.is_private IS NULL THEN
    NEW.is_private := true;
  END IF;
  
  -- Ensure visibility is never NULL (default to private for safety)
  IF NEW.visibility IS NULL THEN
    NEW.visibility := 'private';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS ensure_dream_privacy_defaults_trigger ON public.dreams;

-- Create trigger for INSERT operations
CREATE TRIGGER ensure_dream_privacy_defaults_trigger
BEFORE INSERT ON public.dreams
FOR EACH ROW
EXECUTE FUNCTION public.ensure_dream_privacy_defaults();

-- Also update any existing NULL values for safety
UPDATE public.dreams 
SET is_private = true 
WHERE is_private IS NULL;

UPDATE public.dreams 
SET visibility = 'private' 
WHERE visibility IS NULL;