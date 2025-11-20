import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Pause, Play, Loader2 } from "lucide-react";
import { ElevenLabsTTS } from "@/utils/elevenlabsTTS";
import { toast } from "@/hooks/use-toast";

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

  useEffect(() => {
    tts.setOnEndedCallback(() => {
      setIsPlaying(false);
      setIsPaused(false);
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
      await tts.speak(text, voiceId);
      setIsPlaying(true);
      setIsPaused(false);
      setIsLoading(false);

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
  };

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSpeak}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Caricamento...
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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
        >
          <VolumeX className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
