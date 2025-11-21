-- =====================================================
-- SPRINT 4 & 5: Dream Sharing and Professional Comments
-- =====================================================

-- Table: dream_shares
-- Gestisce la condivisione dei sogni tra utenti e professionisti
CREATE TABLE IF NOT EXISTS public.dream_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id UUID REFERENCES public.dreams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL, -- Proprietario del sogno
  professional_id UUID NOT NULL, -- Professionista destinatario
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT, -- Messaggio opzionale dall'utente
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(dream_id, professional_id) -- Un sogno può essere condiviso una sola volta con lo stesso professionista
);

-- Table: professional_comments
-- Gestisce i commenti dei professionisti sui sogni condivisi
CREATE TABLE IF NOT EXISTS public.professional_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id UUID REFERENCES public.dreams(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID NOT NULL, -- Chi scrive il commento
  user_id UUID NOT NULL, -- Proprietario del sogno
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.dream_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: dream_shares
-- =====================================================

-- Utenti possono creare condivisioni per i propri sogni
CREATE POLICY "Users can share their dreams"
ON public.dream_shares
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (SELECT 1 FROM public.dreams WHERE id = dream_id AND user_id = auth.uid())
);

-- Utenti possono vedere le proprie condivisioni
CREATE POLICY "Users can view their shares"
ON public.dream_shares
FOR SELECT
USING (auth.uid() = user_id);

-- Professionisti possono vedere condivisioni a loro destinate
CREATE POLICY "Professionals can view shares sent to them"
ON public.dream_shares
FOR SELECT
USING (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional')
);

-- Professionisti possono aggiornare lo status delle condivisioni
CREATE POLICY "Professionals can update share status"
ON public.dream_shares
FOR UPDATE
USING (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional')
);

-- =====================================================
-- RLS POLICIES: professional_comments
-- =====================================================

-- Solo professionisti possono creare commenti su sogni condivisi e accettati
CREATE POLICY "Professionals can comment on shared dreams"
ON public.professional_comments
FOR INSERT
WITH CHECK (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional')
  AND EXISTS (
    SELECT 1 FROM public.dream_shares 
    WHERE dream_id = professional_comments.dream_id 
    AND professional_id = auth.uid()
    AND status = 'accepted'
  )
);

-- Utenti possono vedere commenti sui propri sogni
CREATE POLICY "Users can view comments on their dreams"
ON public.professional_comments
FOR SELECT
USING (auth.uid() = user_id);

-- Professionisti possono vedere i propri commenti
CREATE POLICY "Professionals can view their own comments"
ON public.professional_comments
FOR SELECT
USING (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional')
);

-- Professionisti possono modificare i propri commenti
CREATE POLICY "Professionals can update their own comments"
ON public.professional_comments
FOR UPDATE
USING (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional')
);

-- Professionisti possono eliminare i propri commenti
CREATE POLICY "Professionals can delete their own comments"
ON public.professional_comments
FOR DELETE
USING (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional')
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger per updated_at su dream_shares
CREATE TRIGGER update_dream_shares_updated_at
BEFORE UPDATE ON public.dream_shares
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger per updated_at su professional_comments
CREATE TRIGGER update_professional_comments_updated_at
BEFORE UPDATE ON public.professional_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- REALTIME SETUP
-- =====================================================

-- Abilita replica identity per catturare tutti i dati nelle modifiche
ALTER TABLE public.dream_shares REPLICA IDENTITY FULL;
ALTER TABLE public.professional_comments REPLICA IDENTITY FULL;

-- Aggiungi le tabelle alla pubblicazione realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dream_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.professional_comments;