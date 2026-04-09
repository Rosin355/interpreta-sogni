import { AUDIO_CATEGORIES, type AudioTrackCategory } from '@/types/audio-tracks';
import { cn } from '@/lib/utils';

interface Props {
  selected: AudioTrackCategory | null;
  onChange: (cat: AudioTrackCategory | null) => void;
}

const AudioCategoryFilter = ({ selected, onChange }: Props) => (
  <div className="flex flex-wrap gap-2 justify-center px-4">
    <button
      onClick={() => onChange(null)}
      className={cn(
        "px-4 py-2 rounded-full text-sm transition-colors border",
        !selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground"
      )}
    >
      Tutte
    </button>
    {AUDIO_CATEGORIES.map((cat) => (
      <button
        key={cat}
        onClick={() => onChange(cat)}
        className={cn(
          "px-4 py-2 rounded-full text-sm transition-colors border",
          selected === cat
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground"
        )}
      >
        {cat}
      </button>
    ))}
  </div>
);

export default AudioCategoryFilter;
