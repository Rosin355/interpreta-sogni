import { useState } from "react";
import { useLaunchSettings } from "@/hooks/useLaunchSettings";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, AlertCircle, History } from "lucide-react";

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const AdminLaunchToggle = () => {
  const {
    enabled,
    loading,
    error,
    setFlag,
    refetch,
    updatedAt,
    updatedBy,
    updatedByLabel,
  } = useLaunchSettings({ realtime: true });
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const onChange = async (next: boolean) => {
    setSaving(true);
    const tId = toast({
      title: "Salvataggio…",
      description: `Imposto annuncio su ${next ? "ATTIVO" : "DISATTIVO"}`,
    });
    const res = await setFlag(next);
    (tId as any)?.dismiss?.();
    if (res.ok) {
      toast({
        title: "Aggiornato",
        description: `Annuncio di lancio ${next ? "ATTIVO" : "DISATTIVO"}`,
      });
    } else {
      toast({
        title: "Errore",
        description: res.error ?? "Salvataggio non riuscito. Stato ripristinato.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const onRetry = async () => {
    setSaving(true);
    await refetch();
    setSaving(false);
    toast({ title: "Stato aggiornato", description: "Letto dallo stato attuale del database." });
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
        <div className="flex items-center gap-2">
          {(loading || saving) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
          <Switch
            checked={enabled}
            disabled={loading || saving}
            onCheckedChange={onChange}
            aria-label="Attiva o disattiva annuncio di lancio"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="text-muted-foreground">
          Stato attuale:{" "}
          <span className="font-semibold text-foreground">
            {enabled ? "ATTIVO" : "DISATTIVO"}
          </span>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-white/5 bg-black/20 px-3 py-2 text-xs text-muted-foreground">
          <History className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <div className="space-y-0.5">
            <div>
              Ultima modifica:{" "}
              <span className="text-foreground">{formatDate(updatedAt)}</span>
            </div>
            <div>
              Da:{" "}
              <span className="text-foreground">
                {updatedByLabel || updatedBy || "—"}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-destructive hover:text-destructive"
              onClick={onRetry}
              disabled={saving}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Riprova
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
