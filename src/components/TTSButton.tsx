import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Pause, Play, Loader2, Download } from "lucide-react";
import { ElevenLabsTTS } from "@/utils/elevenlabsTTS";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TTSButtonProps {
  text: string;
  label?: string;
  voiceId?: string;
}

export const TTSButton = ({ 
  text, 
  label = "Leggi ad alta voce",
  voiceId = "cnDF6tD6CWVBeLKYlCXW"
}: TTSButtonProps) => {
  const [tts] = useState(() => new ElevenLabsTTS());
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<string>("1");

  useEffect(() => {
    tts.setOnEndedCallback(() => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
      setGenerationProgress(null);
      setCurrentTime(0);
      setDuration(0);
    });

    tts.setOnProgressCallback((prog) => {
      setProgress(prog);
    });

    tts.setOnGenerationProgressCallback((current, total) => {
      setGenerationProgress({ current, total });
    });

    tts.setOnTimeUpdateCallback((current, total) => {
      setCurrentTime(current);
      setDuration(total);
    });

    return () => {
      tts.stop();
    };
  }, [tts]);

  const handleSpeak = async () => {
    try {
      if (isLoading) return;

      if (isPlaying && !isPaused) {
        tts.pause();
        setIsPaused(true);
        return;
      }

      if (isPaused) {
        tts.resume();
        setIsPaused(false);
        return;
      }

      setIsLoading(true);
      setGenerationProgress(null);
      await tts.speak(text, voiceId);
      setIsPlaying(true);
      setIsPaused(false);
      setIsLoading(false);
      setGenerationProgress(null);

    } catch (error: any) {
      console.error('TTS error:', error);
      setIsLoading(false);
      setIsPlaying(false);
      setIsPaused(false);
      
      toast({
        title: "Errore lettura audio",
        description: error.message || "Impossibile riprodurre l'audio. Riprova.",
        variant: "destructive",
      });
    }
  };

  const handleStop = () => {
    tts.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlaying) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    
    tts.seek(percentage);
    setProgress(percentage);
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSpeedChange = (value: string) => {
    setPlaybackSpeed(value);
    tts.setPlaybackRate(parseFloat(value));
  };

  const handleDownload = () => {
    const blob = tts.getCurrentAudioBlob();
    if (!blob) {
      toast({
        title: "Nessun audio disponibile",
        description: "Genera prima l'audio per scaricarlo",
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio-tts-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download avviato",
      description: "Il file audio è stato scaricato",
    });
  };

  const isGenerating = isLoading || generationProgress !== null;
  const audioBlob = tts.getCurrentAudioBlob();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={handleSpeak}
          disabled={isGenerating}
          variant="ghost"
          size="sm"
          className="gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPaused ? (
            <Play className="h-4 w-4" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          {isGenerating 
            ? (generationProgress 
              ? `Blocco ${generationProgress.current}/${generationProgress.total}` 
              : 'Generazione...')
            : isPaused 
              ? 'Riprendi' 
              : isPlaying 
                ? 'Pausa' 
                : label
          }
        </Button>

        {(isPlaying || isPaused) && (
          <Button
            onClick={handleStop}
            variant="ghost"
            size="sm"
            title="Ferma riproduzione"
          >
            <VolumeX className="h-4 w-4" />
          </Button>
        )}

        {audioBlob && (
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="gap-2"
            title="Scarica audio MP3"
          >
            <Download className="h-4 w-4" />
            MP3
          </Button>
        )}
      </div>
      <div className="flex gap-2 items-center flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSpeak}
          disabled={isLoading}
          className="whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {generationProgress 
                ? `Generazione audio... (${generationProgress.current}/${generationProgress.total})`
                : 'Caricamento...'
              }
            </>
          ) : isPlaying && !isPaused ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Pausa
            </>
          ) : isPaused ? (
            <>
              <Play className="h-4 w-4 mr-2" />
              Riprendi
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4 mr-2" />
              {label}
            </>
          )}
        </Button>
        
        {isPlaying && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStop}
              className="flex-shrink-0"
            >
              <VolumeX className="h-4 w-4" />
            </Button>
            
            <Select value={playbackSpeed} onValueChange={handleSpeedChange}>
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="0.75">0.75x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="1.25">1.25x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="flex-shrink-0"
              title="Scarica audio MP3"
            >
              <Download className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {isPlaying && (
        <div className="w-full space-y-1">
          <div 
            className="w-full h-2 bg-muted rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
