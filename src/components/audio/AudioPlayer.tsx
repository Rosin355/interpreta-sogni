import { Play, Pause, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { AudioTrack } from '@/types/audio-tracks';

interface Props {
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const AudioPlayer = ({ track, isPlaying, currentTime, duration, loading, onPlayPause, onSeek }: Props) => {
  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 safe-area-bottom">
      <div className="container mx-auto flex items-center gap-4 max-w-3xl">
        {/* Cover */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary/30 shrink-0">
          {track.cover_image_url ? (
            <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-lg">☾</div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-shrink">
          <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
          <p className="text-xs text-muted-foreground truncate">{track.category}</p>
        </div>

        {/* Controls */}
        <button
          onClick={onPlayPause}
          className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>

        {/* Progress */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{fmt(currentTime)}</span>
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={1}
            onValueChange={([v]) => onSeek(v)}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
