-- Add security enhancements for sensitive data protection

-- Add database comments to document sensitive data fields
COMMENT ON TABLE profiles IS 'Contains highly sensitive PII including birth data, gender, and astrological information. All access must be user-specific via RLS.';
COMMENT ON COLUMN profiles.birth_date IS 'SENSITIVE: User birth date for astrological calculations';
COMMENT ON COLUMN profiles.birth_time IS 'SENSITIVE: User birth time for astrological calculations';
COMMENT ON COLUMN profiles.birth_latitude IS 'SENSITIVE: Geographic location data';
COMMENT ON COLUMN profiles.birth_longitude IS 'SENSITIVE: Geographic location data';
COMMENT ON COLUMN profiles.gender IS 'SENSITIVE: User gender information';
COMMENT ON COLUMN profiles.natal_chart_data IS 'SENSITIVE: Contains complete astrological profile';

-- Add constraint to ensure dream visibility consistency
ALTER TABLE dreams 
  ADD CONSTRAINT visibility_consistency_check 
  CHECK (
    (is_private = true AND visibility = 'private') OR 
    (is_private = false AND visibility IN ('friends', 'public')) OR
    (is_private IS NULL AND visibility IS NOT NULL) OR
    (is_private IS NOT NULL AND visibility IS NULL)
  );

-- Create function to validate dream visibility changes (for future auditing)
CREATE OR REPLACE FUNCTION validate_dream_visibility()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure new dreams default to private if not explicitly set
  IF TG_OP = 'INSERT' THEN
    IF NEW.visibility IS NULL THEN
      NEW.visibility := 'private';
    END IF;
    IF NEW.is_private IS NULL THEN
      NEW.is_private := true;
    END IF;
  END IF;
  
  -- Log visibility changes for security auditing (optional)
  IF TG_OP = 'UPDATE' AND OLD.visibility = 'private' AND NEW.visibility != 'private' THEN
    RAISE NOTICE 'Dream % visibility changed from private to %', NEW.id, NEW.visibility;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger to dreams table
DROP TRIGGER IF EXISTS check_dream_visibility ON dreams;
CREATE TRIGGER check_dream_visibility
  BEFORE INSERT OR UPDATE ON dreams
  FOR EACH ROW
  EXECUTE FUNCTION validate_dream_visibility();

-- Add index for faster RLS policy checks on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);

-- Add index for faster RLS policy checks on dreams
CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON dreams(user_id);

-- Add index for faster RLS policy checks on voice_notes
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);