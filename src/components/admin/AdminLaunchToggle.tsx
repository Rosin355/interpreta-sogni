import { useLaunchSettings } from "@/hooks/useLaunchSettings";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export const AdminLaunchToggle = () => {
  const { enabled, loading, setFlag } = useLaunchSettings();
  const { toast } = useToast();

  const onChange = async (next: boolean) => {
    const ok = await setFlag(next);
    toast({
      title: ok ? "Aggiornato" : "Errore",
      description: ok
        ? `Annuncio di lancio ${next ? "ATTIVO" : "DISATTIVO"}`
        : "Non è stato possibile aggiornare l'impostazione",
      variant: ok ? "default" : "destructive",
    });
  };

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-[#1a0020]/40 to-transparent">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base uppercase tracking-[0.2em]">
            Annuncio di Lancio
          </CardTitle>
          <CardDescription className="mt-2">
            Controlla la visibilità della barra in homepage e del pop-up post-login.
            Solo super admin.
          </CardDescription>
        </div>
        <Switch
          checked={enabled}
          disabled={loading}
          onCheckedChange={onChange}
          aria-label="Attiva o disattiva annuncio di lancio"
        />
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Stato attuale: <span className="font-semibold text-foreground">{enabled ? "ATTIVO" : "DISATTIVO"}</span>
      </CardContent>
    </Card>
  );
};
