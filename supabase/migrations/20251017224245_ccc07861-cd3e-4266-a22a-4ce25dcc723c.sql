-- Crea tabella profiles per informazioni utente aggiuntive
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abilita RLS su profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies per profiles
CREATE POLICY "Gli utenti possono vedere tutti i profili" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Gli utenti possono aggiornare il proprio profilo" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Gli utenti possono inserire il proprio profilo" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per profiles
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Funzione per creare automaticamente un profilo quando un utente si registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger per creare profilo automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Crea tabella dreams per memorizzare i sogni
CREATE TABLE public.dreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  dream_date DATE NOT NULL,
  mood TEXT,
  tags TEXT[],
  interpretation TEXT,
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_dreams_user_id ON public.dreams(user_id);
CREATE INDEX idx_dreams_dream_date ON public.dreams(dream_date DESC);
CREATE INDEX idx_dreams_tags ON public.dreams USING GIN(tags);

-- Abilita RLS su dreams
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;

-- Policies per dreams
CREATE POLICY "Gli utenti possono vedere i propri sogni" 
  ON public.dreams FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Gli utenti possono inserire i propri sogni" 
  ON public.dreams FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gli utenti possono aggiornare i propri sogni" 
  ON public.dreams FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Gli utenti possono eliminare i propri sogni" 
  ON public.dreams FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger per dreams
CREATE TRIGGER set_dreams_updated_at
  BEFORE UPDATE ON public.dreams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Crea tabella dream_knowledge_base per database interpretazioni
CREATE TABLE public.dream_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  category TEXT NOT NULL,
  interpretation TEXT NOT NULL,
  context TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per knowledge base
CREATE INDEX idx_knowledge_symbol ON public.dream_knowledge_base(symbol);
CREATE INDEX idx_knowledge_category ON public.dream_knowledge_base(category);

-- Abilita RLS su knowledge base (lettura pubblica)
ALTER TABLE public.dream_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutti possono leggere la knowledge base" 
  ON public.dream_knowledge_base FOR SELECT 
  USING (true);

-- Inserisci alcuni dati iniziali nella knowledge base
INSERT INTO public.dream_knowledge_base (symbol, category, interpretation, context, source) VALUES
  ('Acqua', 'Elementi', 'L''acqua nei sogni rappresenta le emozioni, l''inconscio e la fluidità della vita. Acqua calma indica pace interiore, mentre acqua agitata può simboleggiare turbamento emotivo.', 'Generale', 'Interpretazione classica'),
  ('Volare', 'Azioni', 'Volare nei sogni spesso rappresenta il desiderio di libertà, il superamento di ostacoli o una prospettiva elevata su una situazione. Può anche indicare ambizione e aspirazioni.', 'Generale', 'Interpretazione classica'),
  ('Cadere', 'Azioni', 'Cadere può simboleggiare perdita di controllo, insicurezza o paura del fallimento. Può anche riflettere una situazione nella vita reale dove ci si sente sopraffatti.', 'Generale', 'Interpretazione classica'),
  ('Casa', 'Luoghi', 'La casa nei sogni rappresenta il sé, la propria identità e sicurezza. Diverse stanze possono simboleggiare diversi aspetti della personalità o della vita.', 'Generale', 'Interpretazione classica'),
  ('Animali', 'Creature', 'Gli animali nei sogni spesso rappresentano istinti, emozioni primitive o aspetti della personalità. Il tipo di animale e il suo comportamento forniscono indizi sul significato specifico.', 'Generale', 'Interpretazione classica');