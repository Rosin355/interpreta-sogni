import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, Mail, Loader2, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { exportSingleDreamPDF, exportAllDreamsPDF } from "@/utils/pdf-export";

interface DreamDiaryExportProps {
  mode: "single" | "all";
  dream?: any;
  allDreams?: any[];
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "default" | "sm" | "icon";
  triggerLabel?: string;
}

export const DreamDiaryExport = ({
  mode,
  dream,
  allDreams,
  triggerVariant = "outline",
  triggerSize = "default",
  triggerLabel,
}: DreamDiaryExportProps) => {
  const [open, setOpen] = useState(false);
  const [exportMethod, setExportMethod] = useState<"download" | "email">("download");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (exportMethod === "download") {
        if (mode === "single" && dream) {
          // Fetch conversations for this dream
          const { data: conversations } = await (supabase as any)
            .from("dream_conversations")
            .select("role, content, created_at")
            .eq("dream_id", dream.id)
            .order("created_at", { ascending: true });

          await exportSingleDreamPDF(dream, conversations || []);
        } else if (mode === "all" && allDreams) {
          // Fetch all conversations
          const dreamIds = allDreams.map((d) => d.id);
          const { data: conversations } = await (supabase as any)
            .from("dream_conversations")
            .select("dream_id, role, content, created_at")
            .in("dream_id", dreamIds)
            .order("created_at", { ascending: true });

          await exportAllDreamsPDF(allDreams, conversations || []);
        }
        toast({
          title: "Diario scaricato!",
          description: "Il tuo diario dei sogni è stato scaricato con successo.",
        });
      } else {
        // Email
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          toast({
            title: "Errore",
            description: "Email non trovata. Verifica il tuo account.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.functions.invoke("send-dream-diary", {
          body: {
            mode,
            dreamId: mode === "single" ? dream?.id : undefined,
          },
        });

        if (error) throw error;

        toast({
          title: "Email inviata!",
          description: `Il diario dei sogni è stato inviato a ${user.email}`,
        });
      }
      setOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'esportazione.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className="gap-2">
          <BookOpen className="h-4 w-4" />
          {triggerLabel || (mode === "single" ? "Scarica Diario" : "Esporta Diario")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Esporta Diario dei Sogni</DialogTitle>
          <DialogDescription>
            {mode === "single"
              ? "Esporta questo sogno come pagina di diario con contenuto, interpretazione e conversazione."
              : "Esporta tutti i tuoi sogni in un diario completo con contenuti, interpretazioni e conversazioni."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            value={exportMethod}
            onValueChange={(v) => setExportMethod(v as "download" | "email")}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="download" id="download" />
              <Label htmlFor="download" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  <span className="font-medium">Scarica PDF</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Scarica immediatamente il diario come file PDF
                </p>
              </Label>
            </div>
            <div className="flex items-center space-x-3 rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="font-medium">Invia via Email</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Ricevi il diario direttamente nella tua casella email
                </p>
              </Label>
            </div>
          </RadioGroup>

          <Button onClick={handleExport} disabled={exporting} className="w-full gap-2">
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {exportMethod === "download" ? "Generazione PDF..." : "Invio email..."}
              </>
            ) : exportMethod === "download" ? (
              <>
                <Download className="h-4 w-4" />
                Scarica PDF
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Invia via Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
