-- Add interpretation_summary column to dreams table for TTS optimization
ALTER TABLE dreams 
ADD COLUMN interpretation_summary TEXT;

COMMENT ON COLUMN dreams.interpretation_summary IS 'Riassunto intelligente dell''interpretazione (max 500 caratteri) per Text-to-Speech con ElevenLabs';