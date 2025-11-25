-- Add alchemical_phase column to dreams table
ALTER TABLE dreams ADD COLUMN alchemical_phase TEXT;

-- Add check constraint to ensure only valid phases
ALTER TABLE dreams ADD CONSTRAINT dreams_alchemical_phase_check 
  CHECK (alchemical_phase IS NULL OR alchemical_phase IN ('nigredo', 'albedo', 'rubedo'));

-- Add comment to document the column
COMMENT ON COLUMN dreams.alchemical_phase IS 'Fase alchemica del sogno: nigredo (nero), albedo (bianco), rubedo (rosso). Calcolata in base a mood, tags e contenuto del sogno.';