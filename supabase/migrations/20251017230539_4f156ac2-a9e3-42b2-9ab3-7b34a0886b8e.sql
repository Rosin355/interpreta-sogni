-- Aggiungi nuovi campi alla tabella dreams per supportare immagini e visibilità
ALTER TABLE dreams 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_style TEXT,
  ADD COLUMN IF NOT EXISTS auto_style BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
  ADD COLUMN IF NOT EXISTS no_recall BOOLEAN DEFAULT FALSE;

-- Crea indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_dreams_visibility ON dreams(visibility);
CREATE INDEX IF NOT EXISTS idx_dreams_no_recall ON dreams(no_recall);