-- Aggiunge il campo gender alla tabella profiles
ALTER TABLE public.profiles 
ADD COLUMN gender TEXT CHECK (gender IN ('maschio', 'femmina', 'altro', 'preferisco_non_dire'));