import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const COOLDOWN_SECONDS = 60;
const emailSchema = z.string().trim().email("Email non valida").max(255);

type Props = {
  initialEmail?: string;
  onBack?: () => void;
};

const ResendConfirmationForm = ({ initialEmail = "", onBack }: Props) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cooldown > 0 || loading) return;

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: "Errore", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: parsed.data.toLowerCase(),
        options: { emailRedirectTo: `${baseUrl}/auth?confirmed=1` },
      });

      // Messaggio generico anti-enumeration
      setSent(true);
      setCooldown(COOLDOWN_SECONDS);

      if (error) {
        // Logga ma non rivelare all'utente
        // eslint-disable-next-line no-console
        console.warn("[resend-confirmation]", error.message);
        if (error.message?.toLowerCase().includes("rate")) {
          toast({
            title: "Troppe richieste",
            description: "Attendi qualche minuto prima di riprovare.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[resend-confirmation]", err);
      toast({
        title: "Errore di rete",
        description: "Verifica la connessione e riprova.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna al login
        </button>
      )}

      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MailCheck className="w-5 h-5 text-primary" />
          Reinvia email di conferma
        </h3>
        <p className="text-sm text-muted-foreground">
          Inserisci l'email con cui ti sei registrato. Se non hai ancora confermato l'account ti
          invieremo un nuovo link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="resend-email">Email</Label>
          <Input
            id="resend-email"
            type="email"
            placeholder="tua@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading || cooldown > 0}>
          {loading
            ? "Invio in corso..."
            : cooldown > 0
              ? `Riprova tra ${cooldown}s`
              : "Reinvia email di conferma"}
        </Button>
      </form>

      {sent && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground/90">
          Se l'email è registrata e non ancora confermata, riceverai a breve un nuovo link di
          conferma.
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        Non trovi l'email? Controlla Spam, Promozioni o Posta indesiderata. Puoi cercare
        "Dream Alchemist" o "noreply@dreamalchemist.app".
      </p>
    </div>
  );
};

export default ResendConfirmationForm;
