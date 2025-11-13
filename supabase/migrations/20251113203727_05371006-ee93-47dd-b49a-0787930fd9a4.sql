-- Create dream_collections table
CREATE TABLE public.dream_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dream_collection_items table (many-to-many relationship)
CREATE TABLE public.dream_collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.dream_collections(id) ON DELETE CASCADE,
  dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collection_id, dream_id)
);

-- Enable RLS on dream_collections
ALTER TABLE public.dream_collections ENABLE ROW LEVEL SECURITY;

-- RLS policies for dream_collections
CREATE POLICY "Users can view their own collections"
  ON public.dream_collections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
  ON public.dream_collections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON public.dream_collections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON public.dream_collections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on dream_collection_items
ALTER TABLE public.dream_collection_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for dream_collection_items
CREATE POLICY "Users can view items in their collections"
  ON public.dream_collection_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dream_collections
      WHERE dream_collections.id = dream_collection_items.collection_id
      AND dream_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add items to their collections"
  ON public.dream_collection_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dream_collections
      WHERE dream_collections.id = dream_collection_items.collection_id
      AND dream_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove items from their collections"
  ON public.dream_collection_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.dream_collections
      WHERE dream_collections.id = dream_collection_items.collection_id
      AND dream_collections.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at on dream_collections
CREATE TRIGGER update_dream_collections_updated_at
  BEFORE UPDATE ON public.dream_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_dream_collections_user_id ON public.dream_collections(user_id);
CREATE INDEX idx_dream_collection_items_collection_id ON public.dream_collection_items(collection_id);
CREATE INDEX idx_dream_collection_items_dream_id ON public.dream_collection_items(dream_id);