-- Create storage bucket for voice notes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-notes',
  'voice-notes',
  false,
  5242880, -- 5MB limit
  ARRAY['audio/webm', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg']
);

-- Create voice notes table
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  transcription TEXT,
  duration INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for voice notes
CREATE POLICY "Users can view their own voice notes" 
ON public.voice_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice notes" 
ON public.voice_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice notes" 
ON public.voice_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice notes" 
ON public.voice_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage policies for voice notes
CREATE POLICY "Users can view their own voice notes files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'voice-notes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own voice notes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'voice-notes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own voice notes files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'voice-notes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own voice notes files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'voice-notes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_voice_notes_updated_at
BEFORE UPDATE ON public.voice_notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for faster queries
CREATE INDEX idx_voice_notes_dream_id ON public.voice_notes(dream_id);
CREATE INDEX idx_voice_notes_user_id ON public.voice_notes(user_id);
CREATE INDEX idx_voice_notes_created_at ON public.voice_notes(created_at DESC);