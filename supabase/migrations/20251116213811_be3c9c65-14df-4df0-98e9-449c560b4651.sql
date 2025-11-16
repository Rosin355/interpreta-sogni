-- Add birth data columns to profiles table for natal chart calculation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_time TIME WITHOUT TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_place_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_latitude DECIMAL(10, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_longitude DECIMAL(11, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_timezone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS natal_chart_data JSONB;

-- Add comment for documentation
COMMENT ON COLUMN profiles.natal_chart_data IS 'Stores calculated natal chart data including planets, houses, aspects, and key points';