import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Square, Send, Loader2, Trash2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface AlchemistChatProps {
  dreamId: string;
  hasInterpretation: boolean;
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder !== "undefined") {
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    if (MediaRecorder.isTypeSupported("audio/ogg")) return "audio/ogg";
  }
  return "audio/webm";
}

export const AlchemistChat = ({ dreamId, hasInterpretation }: AlchemistChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("audio/webm");

  useEffect(() => {
    fetchMessages();
  }, [dreamId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("dream_conversations")
        .select("*")
        .eq("dream_id", dreamId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-with-alchemist", {
        body: { dreamId, message: text.trim() },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast({
          title: "Errore",
          description: data.error,
          variant: "destructive",
        });
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Errore",
        description: "Impossibile inviare il messaggio. Riprova.",
        variant: "destructive",
      });
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // STT Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mimeTypeRef.current = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
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

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result?.toString().split(",")[1];
          result ? resolve(result) : reject(new Error("Conversione fallita"));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke("speech-to-text-elevenlabs", {
        body: { audio: base64 },
      });

      if (error) throw error;

      if (data?.text) {
        setInput((prev) => (prev ? prev + " " + data.text : data.text));
      } else {
        toast({
          title: "Trascrizione vuota",
          description: "Non è stato possibile trascrivere l'audio",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      toast({
        title: "Errore trascrizione",
        description: "Impossibile trascrivere l'audio",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const deleteConversation = async () => {
    try {
      const { error } = await (supabase as any)
        .from("dream_conversations")
        .delete()
        .eq("dream_id", dreamId);

      if (error) throw error;

      setMessages([]);
      toast({
        title: "Conversazione eliminata",
        description: "La conversazione con l'Alchimista è stata cancellata",
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la conversazione",
        variant: "destructive",
      });
    }
  };

  if (!hasInterpretation) {
    return (
      <Card className="border-border/80 bg-card/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Parla con l'Alchimista
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Genera prima un'interpretazione del sogno per iniziare a dialogare con l'Alchimista.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card/70">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Parla con l'Alchimista
          </CardTitle>
          {messages.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Elimina conversazione</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sei sicuro di voler eliminare tutta la conversazione con l'Alchimista per questo sogno?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteConversation}>Elimina</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="max-h-[400px] min-h-[200px] overflow-y-auto space-y-4 rounded-lg border border-border/60 bg-background/30 p-4"
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Sparkles className="h-8 w-8 text-primary/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Inizia una conversazione con l'Alchimista per esplorare il significato del tuo sogno.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {format(new Date(msg.created_at), "HH:mm", { locale: it })}
                  </p>
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                L'Alchimista sta riflettendo...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi il tuo messaggio..."
              className="min-h-[44px] max-h-[120px] resize-none pr-12"
              disabled={sending || isTranscribing}
            />
          </div>

          {/* Mic button */}
          {isRecording ? (
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="icon"
              className="shrink-0 animate-pulse"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={startRecording}
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={sending || isTranscribing}
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Send button */}
          <Button
            onClick={() => sendMessage(input)}
            size="icon"
            className="shrink-0"
            disabled={!input.trim() || sending || isTranscribing}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
