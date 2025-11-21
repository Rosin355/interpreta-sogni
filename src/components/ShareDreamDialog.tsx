import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Share2 } from "lucide-react";

interface Professional {
  id: string;
  user_id: string;
  specialization: string;
  profiles?: {
    username: string;
  };
}

interface ShareDreamDialogProps {
  dreamId: string;
  dreamTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDreamDialog({ dreamId, dreamTitle, open, onOpenChange }: ShareDreamDialogProps) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadProfessionals();
    }
  }, [open]);

  const loadProfessionals = async () => {
    try {
      setLoadingProfessionals(true);
      
      // Get approved professional profiles
      const { data: profData, error: profError } = await supabase
        .from("professional_profiles")
        .select("id, user_id, specialization")
        .eq("status", "approved");

      if (profError) throw profError;

      // Get usernames for each professional
      const professionalsWithNames = await Promise.all(
        (profData || []).map(async (prof) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", prof.user_id)
            .single();

          return {
            ...prof,
            profiles: profileData || { username: "Professionista" },
          };
        })
      );

      setProfessionals(professionalsWithNames);
    } catch (error: any) {
      console.error("Error loading professionals:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i professionisti",
        variant: "destructive",
      });
    } finally {
      setLoadingProfessionals(false);
    }
  };

  const handleShare = async () => {
    if (!selectedProfessional) {
      toast({
        title: "Attenzione",
        description: "Seleziona un professionista",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create share
      const { error: shareError } = await supabase
        .from("dream_shares")
        .insert({
          dream_id: dreamId,
          user_id: user.id,
          professional_id: selectedProfessional,
          message: message.trim() || null,
        });

      if (shareError) {
        if (shareError.code === "23505") { // Unique constraint violation
          throw new Error("Hai già condiviso questo sogno con questo professionista");
        }
        throw shareError;
      }

      // Get professional email for notification
      const professional = professionals.find(p => p.user_id === selectedProfessional);
      if (professional) {
        const { data: authData } = await supabase.auth.admin.getUserById(selectedProfessional);
        const professionalEmail = authData?.user?.email;

        if (professionalEmail) {
          // Send email notification
          await supabase.functions.invoke("send-email-notification", {
            body: {
              type: "dream_shared",
              recipientEmail: professionalEmail,
              recipientName: professional.profiles?.username || "Professionista",
              data: {
                dreamTitle,
                dreamId,
                userName: user.user_metadata?.username || user.email,
                message: message.trim() || undefined,
              },
            },
          });
        }
      }

      toast({
        title: "✅ Sogno condiviso!",
        description: "Il professionista riceverà una notifica",
      });

      setMessage("");
      setSelectedProfessional("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sharing dream:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile condividere il sogno",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Condividi Sogno
          </DialogTitle>
          <DialogDescription>
            Condividi "{dreamTitle}" con un professionista per ricevere un feedback personalizzato
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loadingProfessionals ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : professionals.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nessun professionista disponibile al momento
            </p>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Seleziona Professionista
                </label>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli un professionista..." />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.user_id} value={prof.user_id}>
                        {prof.profiles?.username || "Professionista"} - {prof.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Messaggio Opzionale
                </label>
                <Textarea
                  placeholder="Aggiungi un messaggio per il professionista..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length}/500 caratteri
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={handleShare} disabled={loading || !selectedProfessional || loadingProfessionals}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Condividi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
