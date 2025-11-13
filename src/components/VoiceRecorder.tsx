import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Check, X, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Registrazione avviata",
        description: "Parla nel microfono per registrare il tuo sogno",
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Errore",
        description: "Impossibile accedere al microfono. Verifica i permessi del browser.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];

        if (!base64Audio) {
          throw new Error('Failed to convert audio to base64');
        }

        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });

        if (error) {
          throw error;
        }

        if (data?.text) {
          setTranscribedText(data.text);
          setShowPreview(true);
        }

        setIsTranscribing(false);
      };

      reader.onerror = () => {
        throw new Error('Failed to read audio file');
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Errore",
        description: "Impossibile trascrivere l'audio. Riprova.",
        variant: "destructive",
      });
      setIsTranscribing(false);
    }
  };

  const handleConfirmTranscription = () => {
    onTranscription(transcribedText);
    setShowPreview(false);
    setTranscribedText("");
    toast({
      title: "Trascrizione aggiunta",
      description: "Il testo è stato aggiunto al contenuto del sogno",
    });
  };

  const handleCancelTranscription = () => {
    setShowPreview(false);
    setTranscribedText("");
  };

  return (
    <>
    <div className="flex gap-2">
      {!isRecording && !isTranscribing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startRecording}
          className="gap-2"
        >
          <Mic className="h-4 w-4" />
          Registra Vocalmente
        </Button>
      )}

      {isRecording && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={stopRecording}
          className="gap-2 animate-pulse"
        >
          <Square className="h-4 w-4" />
          Stop Registrazione
        </Button>
      )}

      {isTranscribing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="gap-2"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Trascrizione in corso...
        </Button>
      )}
    </div>

    <Dialog open={showPreview} onOpenChange={setShowPreview}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Anteprima Trascrizione
          </DialogTitle>
          <DialogDescription>
            Rivedi e modifica il testo trascritto prima di aggiungerlo al sogno
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={transcribedText}
            onChange={(e) => setTranscribedText(e.target.value)}
            rows={10}
            placeholder="Modifica la trascrizione qui..."
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Puoi modificare o eliminare parti del testo prima di aggiungerlo
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancelTranscription}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Annulla
          </Button>
          <Button
            onClick={handleConfirmTranscription}
            disabled={!transcribedText.trim()}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Aggiungi al Sogno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
