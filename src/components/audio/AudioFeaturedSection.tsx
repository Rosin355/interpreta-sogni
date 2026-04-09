import type { AudioTrack } from '@/types/audio-tracks';
import AudioTrackCard from './AudioTrackCard';

interface Props {
  tracks: AudioTrack[];
  currentTrackId: string | null;
  isPlaying: boolean;
  canAccessPremium: boolean;
  onPlay: (track: AudioTrack) => void;
}

const AudioFeaturedSection = ({ tracks, currentTrackId, isPlaying, canAccessPremium, onPlay }: Props) => {
  if (tracks.length === 0) return null;

  return (
    <section className="px-4 mb-12">
      <h2 className="text-xl font-bodoni-heading text-foreground mb-6 text-center">
        ✦ In Evidenza
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {tracks.map((track) => (
          <AudioTrackCard
            key={track.id}
            track={track}
            isPlaying={isPlaying}
            isCurrentTrack={currentTrackId === track.id}
            canAccess={track.access_tier === 'free' || canAccessPremium}
            onPlay={() => onPlay(track)}
          />
        ))}
      </div>
    </section>
  );
};

export default AudioFeaturedSection;
