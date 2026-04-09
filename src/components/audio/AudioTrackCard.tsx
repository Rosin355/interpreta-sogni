import { Play, Pause, Lock, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AudioTrack } from '@/types/audio-tracks';
import { cn } from '@/lib/utils';

interface Props {
  track: AudioTrack;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  canAccess: boolean;
  onPlay: () => void;
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const AudioTrackCard = ({ track, isPlaying, isCurrentTrack, canAccess, onPlay }: Props) => (
  <div
    className={cn(
      "group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/30",
      isCurrentTrack && "ring-2 ring-primary/40"
    )}
  >
    {/* Cover */}
    <div className="relative aspect-square bg-secondary/30">
      {track.cover_image_url ? (
        <img
          src={track.cover_image_url}
          alt={track.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/30">
          ☾
        </div>
      )}

      {/* Play overlay */}
      <button
        onClick={onPlay}
        disabled={!canAccess}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/0 transition-colors",
          canAccess
            ? "group-hover:bg-black/30 cursor-pointer"
            : "bg-black/40 cursor-not-allowed"
        )}
      >
        {!canAccess ? (
          <Lock className="h-8 w-8 text-white/80" />
        ) : isCurrentTrack && isPlaying ? (
          <Pause className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        ) : (
          <Play className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      {/* Tier badge */}
      <div className="absolute top-2 right-2">
        {track.access_tier === 'subscriber' ? (
          <Badge className="bg-amber-500/90 text-white gap-1 text-[10px]">
            <Crown className="h-3 w-3" /> Premium
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">Free</Badge>
        )}
      </div>
    </div>

    {/* Info */}
    <div className="p-3 space-y-1">
      <h3 className="font-medium text-sm text-foreground line-clamp-1">{track.title}</h3>
      <p className="text-xs text-muted-foreground line-clamp-1">{track.category}</p>
      <p className="text-xs text-muted-foreground/60">{formatDuration(track.duration_seconds)}</p>
    </div>

    {/* Locked CTA */}
    {!canAccess && (
      <div className="px-3 pb-3">
        <p className="text-[10px] text-amber-400/80 text-center">
          Sblocca con l'abbonamento Premium
        </p>
      </div>
    )}
  </div>
);

export default AudioTrackCard;
