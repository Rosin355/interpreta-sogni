import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AudioTrack, AudioTrackCategory } from '@/types/audio-tracks';

export function useAudioTracks(category?: AudioTrackCategory | null) {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTracks();
  }, [category]);

  const fetchTracks = async () => {
    setLoading(true);
    let query = supabase
      .from('audio_tracks')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (!error && data) {
      const all = data as unknown as AudioTrack[];
      setTracks(all);
      setFeaturedTracks(all.filter(t => t.is_featured));
    }
    setLoading(false);
  };

  return { tracks, featuredTracks, loading, refetch: fetchTracks };
}
