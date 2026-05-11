import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Check, X, Edit, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { handleEdgeError } from "@/utils/handle-edge-error";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg';
  }
  return 'audio/webm';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result?.toString().split(',')[1];
      result ? resolve(result) : reject(new Error('Conversione audio fallita'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Errore lettura audio'));
    reader.readAsDataURL(blob);
  });
}

export const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');
  const isSuperAdmin = useIsSuperAdmin();

  const startRecording = async () => {
    try {
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(audioBlob);
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
      const base64Audio = await blobToBase64(audioBlob);

      const { data, error } = await supabase.functions.invoke('speech-to-text-elevenlabs', {
        body: { audio: base64Audio, mimeType: mimeTypeRef.current }
      });

      if (error) throw error;

      if (!data?.text || data.text.trim() === '') {
        toast({
          title: "Nessun testo rilevato",
          description: "Non è stato possibile riconoscere parole nell'audio. Riprova parlando più chiaramente.",
          variant: "destructive",
        });
        setIsTranscribing(false);
        return;
      }

      setTranscribedText(data.text);
      setShowPreview(true);
      setIsTranscribing(false);
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

  // Chiamato quando l'utente vuole annullare (bottone Annulla o tentativo di chiusura)
  const handleRequestCancel = () => {
    if (transcribedText.trim()) {
      setShowCancelConfirm(true);
    } else {
      // Testo vuoto: chiudi direttamente
      setShowPreview(false);
      setTranscribedText("");
    }
  };

  // Conferma definitiva dell'annullamento
  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
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

      {/* Dialog anteprima trascrizione — senza X nativa, chiusura solo tramite bottoni */}
      <Dialog
        open={showPreview}
        onOpenChange={(open) => {
          // Intercetta ogni tentativo di chiusura (swipe, ESC, click fuori)
          if (!open) handleRequestCancel();
        }}
      >
        <DialogContent
          className="sm:max-w-[600px]"
          // Rimuove la X in alto a destra
          hideCloseButton
          // Blocca chiusura cliccando fuori dal dialog
          onInteractOutside={(e) => e.preventDefault()}
          // Blocca chiusura con ESC (gestita da handleRequestCancel)
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleRequestCancel();
          }}
        >
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
              onClick={handleRequestCancel}
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

      {/* Alert di conferma annullamento */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Scartare la trascrizione?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Stai per perdere il testo trascritto dalla tua registrazione vocale.
              Questa azione non può essere annullata e dovrai registrare di nuovo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelConfirm(false)}>
              Torna alla trascrizione
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sì, scarta il testo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
