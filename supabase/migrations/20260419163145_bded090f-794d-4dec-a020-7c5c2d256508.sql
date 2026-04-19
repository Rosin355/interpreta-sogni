
-- ============================================================
-- 1) dream_shares: consolidate INSERT policies
-- ============================================================
DROP POLICY IF EXISTS "Users can share dreams with other users" ON public.dream_shares;
DROP POLICY IF EXISTS "Users can share their dreams" ON public.dream_shares;

CREATE POLICY "Users can create shares for their own dreams"
ON public.dream_shares
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.dreams d
    WHERE d.id = dream_shares.dream_id AND d.user_id = auth.uid()
  )
  AND (
    (professional_id IS NOT NULL AND shared_with_user_id IS NULL)
    OR
    (professional_id IS NULL AND shared_with_user_id IS NOT NULL)
  )
);

-- ============================================================
-- 2) audio_tracks: restrict SELECT (free for all auth, premium admin-only)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view published tracks" ON public.audio_tracks;

CREATE POLICY "Users can view free published tracks; admins see all"
ON public.audio_tracks
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_published = true AND access_tier = 'free')
);

-- ============================================================
-- 3) storage.objects ritual-audio: restrict to admins + free-track files
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read audio files" ON storage.objects;

CREATE POLICY "Read ritual-audio: free tracks for all auth, all for admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ritual-audio'
  AND (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.audio_tracks t
      WHERE t.audio_path = storage.objects.name
        AND t.is_published = true
        AND t.access_tier = 'free'
    )
  )
);

-- ============================================================
-- 4) realtime.messages: require auth for broadcast/presence
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send realtime messages" ON realtime.messages;

CREATE POLICY "Authenticated can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
