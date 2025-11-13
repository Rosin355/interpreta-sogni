import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Play, Pause, Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface VoiceNote {
  id: string;
  audio_url: string;
  transcription: string | null;
  duration: number | null;
  created_at: string;
}

interface VoiceNoteRecorderProps {
  dreamId: string;
}

export const VoiceNoteRecorder = ({ dreamId }: VoiceNoteRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const recordingStartTimeRef = useRef<number>(0);

  useEffect(() => {
    fetchVoiceNotes();
  }, [dreamId]);

  const fetchVoiceNotes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('voice_notes')
        .select('*')
        .eq('dream_id', dreamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVoiceNotes(data || []);
    } catch (error) {
      console.error('Error fetching voice notes:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le note vocali",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadVoiceNote(audioBlob, duration);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Registrazione avviata",
        description: "Registra la tua nota vocale per questo sogno",
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Errore",
        description: "Impossibile accedere al microfono",
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

  const uploadVoiceNote = async (audioBlob: Blob, duration: number) => {
    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload to storage
      const fileName = `${user.id}/${dreamId}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(fileName);

      // Transcribe audio
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        let transcription = null;

        if (base64Audio) {
          try {
            const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('transcribe-audio', {
              body: { audio: base64Audio }
            });

            if (!transcribeError && transcribeData?.text) {
              transcription = transcribeData.text;
            }
          } catch (error) {
            console.error('Error transcribing:', error);
          }
        }

        // Save to database
        const { error: dbError } = await (supabase as any)
          .from('voice_notes')
          .insert({
            dream_id: dreamId,
            user_id: user.id,
            audio_url: publicUrl,
            transcription,
            duration,
          });

        if (dbError) throw dbError;

        toast({
          title: "Nota vocale salvata",
          description: transcription ? "Nota vocale e trascrizione salvate con successo" : "Nota vocale salvata con successo",
        });

        fetchVoiceNotes();
      };

      reader.onerror = () => {
        throw new Error('Failed to read audio file');
      };
    } catch (error) {
      console.error('Error uploading voice note:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la nota vocale",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const togglePlayPause = (noteId: string, audioUrl: string) => {
    if (!audioElementsRef.current[noteId]) {
      const audio = new Audio(audioUrl);
      audio.addEventListener('ended', () => setPlayingNoteId(null));
      audioElementsRef.current[noteId] = audio;
    }

    const audio = audioElementsRef.current[noteId];

    if (playingNoteId === noteId) {
      audio.pause();
      setPlayingNoteId(null);
    } else {
      // Pause all other audios
      Object.keys(audioElementsRef.current).forEach(id => {
        if (id !== noteId) {
          audioElementsRef.current[id].pause();
        }
      });

      audio.play();
      setPlayingNoteId(noteId);
    }
  };

  const deleteVoiceNote = async (noteId: string, audioUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = audioUrl.split('/voice-notes/');
      if (urlParts.length < 2) throw new Error('Invalid audio URL');
      const filePath = urlParts[1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('voice-notes')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await (supabase as any)
        .from('voice_notes')
        .delete()
        .eq('id', noteId);

      if (dbError) throw dbError;

      // Stop audio if playing
      if (audioElementsRef.current[noteId]) {
        audioElementsRef.current[noteId].pause();
        delete audioElementsRef.current[noteId];
      }

      toast({
        title: "Nota eliminata",
        description: "La nota vocale è stata eliminata con successo",
      });

      fetchVoiceNotes();
    } catch (error) {
      console.error('Error deleting voice note:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la nota vocale",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Note Vocali
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Note Vocali
          </CardTitle>
          {!isRecording && !isUploading && (
            <Button
              onClick={startRecording}
              size="sm"
              className="gap-2"
            >
              <Mic className="h-4 w-4" />
              Nuova Nota
            </Button>
          )}
          {isRecording && (
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="sm"
              className="gap-2 animate-pulse"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
          {isUploading && (
            <Button
              disabled
              size="sm"
              className="gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento...
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {voiceNotes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nessuna nota vocale registrata per questo sogno
          </p>
        ) : (
          voiceNotes.map((note) => (
            <div
              key={note.id}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {format(new Date(note.created_at), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                  </Badge>
                  {note.duration && (
                    <Badge variant="outline">
                      {formatDuration(note.duration)}
                    </Badge>
                  )}
                </div>
                {note.transcription && (
                  <p className="text-sm text-muted-foreground">
                    {note.transcription}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => togglePlayPause(note.id, note.audio_url)}
                >
                  {playingNoteId === note.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => deleteVoiceNote(note.id, note.audio_url)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
