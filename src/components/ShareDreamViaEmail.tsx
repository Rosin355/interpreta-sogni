import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import { z } from "zod";

interface ShareDreamViaEmailProps {
  dreamId: string;
  dreamTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shareEmailSchema = z.object({
  email: z.string().email("Email non valida"),
  message: z.string().max(500, "Massimo 500 caratteri").optional(),
});

export default function ShareDreamViaEmail({ dreamId, dreamTitle, open, onOpenChange }: ShareDreamViaEmailProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      setIsSubmitting(true);

      // Validate input
      const validation = shareEmailSchema.safeParse({ email, message });
      if (!validation.success) {
        toast({
          title: "Errore di validazione",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utente non autenticato");

      // Get current user profile
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      // Find recipient user by email
      const { data: recipientUserId, error: lookupError } = await supabase
        .rpc("find_user_by_email", { user_email: email });

      if (lookupError) {
        console.error("Error looking up user:", lookupError);
        throw new Error("Errore durante la ricerca dell'utente");
      }

      if (!recipientUserId) {
        toast({
          title: "Utente non trovato",
          description: "L'email inserita non corrisponde a nessun utente registrato. L'utente deve prima registrarsi sulla piattaforma.",
          variant: "destructive",
        });
        return;
      }

      // Prevent sharing with yourself
      if (recipientUserId === user.id) {
        toast({
          title: "Errore",
          description: "Non puoi condividere un sogno con te stesso.",
          variant: "destructive",
        });
        return;
      }

      // Insert share with pending status
      const { error: shareError } = await supabase
        .from("dream_shares")
        .insert({
          dream_id: dreamId,
          user_id: user.id,
          shared_with_user_id: recipientUserId,
          message: message || null,
          status: "pending",
        });

      if (shareError) throw shareError;

      // Send email notification via edge function
      const { error: emailError } = await supabase.functions.invoke("send-email-notification", {
        body: {
          type: "dream_shared_user_request",
          recipientEmail: email,
          data: {
            dreamTitle,
            dreamId,
            userName: currentProfile?.username || "Un utente",
            message: message || "",
          },
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        // Continue anyway, share was created
      }

      toast({
        title: "Richiesta inviata",
        description: "La richiesta di condivisione è stata inviata. L'utente riceverà un'email di notifica.",
      });

      onOpenChange(false);
      setEmail("");
      setMessage("");
    } catch (error: any) {
      console.error("Share error:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile condividere il sogno",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Condividi sogno via Email
          </DialogTitle>
          <DialogDescription>
            Invia questo sogno a un altro utente registrato. L'utente dovrà accettare la condivisione prima di poterlo visualizzare.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email destinatario *</Label>
            <Input
              id="email"
              type="email"
              placeholder="esempio@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Messaggio (opzionale)</Label>
            <Textarea
              id="message"
              placeholder="Aggiungi un messaggio personale..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              disabled={isSubmitting}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/500 caratteri
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button onClick={handleShare} disabled={isSubmitting || !email}>
            {isSubmitting ? "Invio..." : "Condividi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
