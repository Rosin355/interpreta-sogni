import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  email?: string;
  title?: string;
  description?: string;
  extraNote?: string;
  onGoToLogin: () => void;
  onResend: () => void;
};

const SignupSuccessPanel = ({
  email,
  title = "Controlla la tua email",
  description = "Ti abbiamo inviato un link per confermare il tuo account. Se non lo trovi, controlla anche Spam o Promozioni.",
  extraNote,
  onGoToLogin,
  onResend,
}: Props) => {
  return (
    <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/15 p-2">
          <MailCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          {email && (
            <p className="text-sm text-foreground mt-2 break-all">
              <span className="text-muted-foreground">Email: </span>
              <span className="font-medium">{email}</span>
            </p>
          )}
        </div>
      </div>

      {extraNote && (
        <p className="text-xs text-muted-foreground">{extraNote}</p>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        Il link può scadere: se succede, puoi generarne uno nuovo da qui. Non trovi l'email?
        Controlla Spam, Promozioni o Posta indesiderata e cerca "Dream Alchemist" o
        "noreply@dreamalchemist.app".
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="button" variant="default" className="flex-1" onClick={onGoToLogin}>
          Vai al login
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={onResend}>
          Reinvia email di conferma
        </Button>
      </div>
    </div>
  );
};

export default SignupSuccessPanel;
