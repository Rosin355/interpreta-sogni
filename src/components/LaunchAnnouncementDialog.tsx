import { useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";

const emailSchema = z.string().trim().email().max(255);

interface Props {
  userId: string;
  onAcknowledged: () => void;
}

export const LaunchAnnouncementDialog = ({ userId, onAcknowledged }: Props) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [wantsUpdates, setWantsUpdates] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!acknowledged) return;

    let cleanEmail: string | null = null;
    if (wantsUpdates && email.trim()) {
      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) {
        toast({
          title: "Email non valida",
          description: "Inserisci un indirizzo email corretto o deseleziona l'opzione.",
          variant: "destructive",
        });
        return;
      }
      cleanEmail = parsed.data;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("launch_announcement_acknowledgments")
      .insert({
        user_id: userId,
        email: cleanEmail,
        wants_updates: wantsUpdates && !!cleanEmail,
      });
    setSubmitting(false);

    if (error) {
      toast({
        title: "Si è verificato un errore",
        description: "Riprova tra qualche istante.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Benvenutə nell'Alchimia",
      description: cleanEmail
        ? "Ti avviseremo in anteprima delle novità."
        : "Buon viaggio tra i tuoi sogni.",
    });
    onAcknowledged();
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        hideClose
        className="max-w-lg border border-primary/30 bg-gradient-to-b from-[#0a0010] via-[#15001f] to-[#030303] text-white shadow-[0_0_60px_rgba(217,70,239,0.25)]"
      >
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.4)]">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary/70 mb-3">
            Avviso del lancio
          </p>
          <DialogTitle className="font-editorial text-2xl md:text-3xl tracking-wide leading-tight">
            Un dono per l'inizio del viaggio
          </DialogTitle>
          <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <DialogDescription className="mt-5 text-white/70 text-sm leading-relaxed font-sans">
            Da oggi e fino al{" "}
            <span className="text-primary font-semibold">19 luglio 2026</span>{" "}
            Dream Alchemist è{" "}
            <span className="text-white">interamente gratuita</span>, in attesa
            del lancio definitivo della web app. Dopo quella data l'esperienza
            diventerà a pagamento.
          </DialogDescription>
        </div>

        <div className="space-y-5 px-1">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(v === true)}
              className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-sm text-white/80 group-hover:text-white transition-colors">
              Ho letto e compreso l'avviso del lancio.
            </span>
          </label>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={wantsUpdates}
                onCheckedChange={(v) => setWantsUpdates(v === true)}
                className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm text-white/80 group-hover:text-white transition-colors">
                Voglio essere fra i primi a ricevere le novità del lancio e uno{" "}
                <span className="text-primary">sconto esclusivo</span>.
              </span>
            </label>
            {wantsUpdates && (
              <div className="space-y-1.5 pl-7 animate-in fade-in slide-in-from-top-1">
                <Label
                  htmlFor="launch-email"
                  className="text-[10px] uppercase tracking-[0.3em] text-white/50"
                >
                  La tua email
                </Label>
                <Input
                  id="launch-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nome@esempio.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/40 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-primary"
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!acknowledged || submitting}
            className="w-full bg-primary hover:bg-primary/90 text-white py-6 rounded-xl text-base font-bodoni-heading tracking-wider shadow-[0_0_30px_hsl(var(--primary)/0.35)] disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Entra nell'Alchimia"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
