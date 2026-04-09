import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import AudioHero from '@/components/audio/AudioHero';
import AudioCategoryFilter from '@/components/audio/AudioCategoryFilter';
import AudioTrackCard from '@/components/audio/AudioTrackCard';
import AudioFeaturedSection from '@/components/audio/AudioFeaturedSection';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { useAudioTracks } from '@/hooks/useAudioTracks';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { supabase } from '@/integrations/supabase/client';
import type { AudioTrackCategory } from '@/types/audio-tracks';
import { MysticLoader } from '@/components/ui/MysticLoader';

const AudioLibrary = () => {
  const [category, setCategory] = useState<AudioTrackCategory | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { tracks, featuredTracks, loading } = useAudioTracks(category);
  const player = useAudioPlayer();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('is_admin', { _user_id: user.id });
        setIsAdmin(!!data);
      }
    })();
  }, []);

  // For now, only admins can access premium. Later: real subscription check.
  const canAccessPremium = isAdmin;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 pb-32">
        <AudioHero />

        {!category && (
          <AudioFeaturedSection
            tracks={featuredTracks}
            currentTrackId={player.currentTrack?.id ?? null}
            isPlaying={player.isPlaying}
            canAccessPremium={canAccessPremium}
            onPlay={(t) => {
              if (t.access_tier === 'free' || canAccessPremium) player.play(t);
            }}
          />
        )}

        <div className="mb-8">
          <AudioCategoryFilter selected={category} onChange={setCategory} />
        </div>

        {loading ? (
          <MysticLoader size="lg" text="Caricamento tracce..." />
        ) : tracks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Nessuna traccia disponibile in questa categoria.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-6xl mx-auto px-4">
            {tracks.map((track) => (
              <AudioTrackCard
                key={track.id}
                track={track}
                isPlaying={player.isPlaying}
                isCurrentTrack={player.currentTrack?.id === track.id}
                canAccess={track.access_tier === 'free' || canAccessPremium}
                onPlay={() => {
                  if (track.access_tier === 'free' || canAccessPremium) player.play(track);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <AudioPlayer
        track={player.currentTrack}
        isPlaying={player.isPlaying}
        currentTime={player.currentTime}
        duration={player.duration}
        loading={player.loading}
        onPlayPause={() => {
          if (player.isPlaying) player.pause();
          else if (player.currentTrack) player.play(player.currentTrack);
        }}
        onSeek={player.seek}
      />
    </div>
  );
};

export default AudioLibrary;
