import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

interface ProfessionalCommentFormProps {
  dreamId: string;
  dreamOwnerId: string;
  onCommentAdded?: () => void;
}

export function ProfessionalCommentForm({ dreamId, dreamOwnerId, onCommentAdded }: ProfessionalCommentFormProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (content.trim().length < 10) {
      toast({
        title: "Attenzione",
        description: "Il commento deve essere di almeno 10 caratteri",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Insert comment
      const { error: commentError } = await supabase
        .from("professional_comments")
        .insert({
          dream_id: dreamId,
          professional_id: user.id,
          user_id: dreamOwnerId,
          content: content.trim(),
        });

      if (commentError) throw commentError;

      // Get dream info and professional profile for email notification
      const { data: dreamData } = await supabase
        .from("dreams")
        .select("title")
        .eq("id", dreamId)
        .single();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      // Send email notification - edge function will look up recipient email server-side
      await supabase.functions.invoke("send-email-notification", {
        body: {
          type: "new_comment",
          recipientUserId: dreamOwnerId,
          data: {
            dreamTitle: dreamData?.title,
            dreamId,
            professionalName: profileData?.username || "Professionista",
            commentContent: content.trim(),
          },
        },
      });

      toast({
        title: "✅ Feedback inviato!",
        description: "L'utente riceverà una notifica",
      });

      setContent("");
      onCommentAdded?.();
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare il feedback",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Lascia un Feedback Professionale
          </label>
          <Textarea
            placeholder="Condividi la tua interpretazione professionale del sogno..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={6}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {content.length}/2000 caratteri (minimo 10)
          </p>
        </div>

        <Button type="submit" disabled={loading || content.trim().length < 10}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Send className="mr-2 h-4 w-4" />
          Invia Feedback
        </Button>
      </form>
    </Card>
  );
}
