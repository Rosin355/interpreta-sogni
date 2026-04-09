
-- Create audio_tracks table
CREATE TABLE public.audio_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Rilassamento profondo',
  cover_image_url TEXT,
  audio_path TEXT NOT NULL,
  duration_seconds INTEGER,
  access_tier TEXT NOT NULL DEFAULT 'free',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_tracks ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users see published tracks; admins see all
CREATE POLICY "Authenticated users can view published tracks"
ON public.audio_tracks FOR SELECT TO authenticated
USING (is_published = true OR is_admin(auth.uid()));

-- INSERT: admin only
CREATE POLICY "Admins can insert tracks"
ON public.audio_tracks FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- UPDATE: admin only
CREATE POLICY "Admins can update tracks"
ON public.audio_tracks FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

-- DELETE: admin only
CREATE POLICY "Admins can delete tracks"
ON public.audio_tracks FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_audio_tracks_updated_at
BEFORE UPDATE ON public.audio_tracks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Index for category filtering
CREATE INDEX idx_audio_tracks_category ON public.audio_tracks (category);
CREATE INDEX idx_audio_tracks_published ON public.audio_tracks (is_published, sort_order);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('ritual-audio', 'ritual-audio', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('ritual-audio-covers', 'ritual-audio-covers', true);

-- Storage policies for ritual-audio (private MP3s)
CREATE POLICY "Authenticated users can read audio files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ritual-audio');

CREATE POLICY "Admins can upload audio files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ritual-audio' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update audio files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ritual-audio' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete audio files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ritual-audio' AND public.is_admin(auth.uid()));

-- Storage policies for ritual-audio-covers (public covers)
CREATE POLICY "Anyone can view cover images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ritual-audio-covers');

CREATE POLICY "Admins can upload cover images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ritual-audio-covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update cover images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ritual-audio-covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete cover images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ritual-audio-covers' AND public.is_admin(auth.uid()));
