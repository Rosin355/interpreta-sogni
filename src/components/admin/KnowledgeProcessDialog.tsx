import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

// Controlled dialog for process-knowledge-source: dry_run first, then (on
// confirm) process. No AI providers, no embeddings — chunks are inserted with
// embedding = null and the source stays in a non-active status (draft).
// Uses the existing authenticated Supabase client session (JWT attached
// automatically). Only counts / lengths are shown — never raw_text/chunks.

type DryRunResult = {
  source_type?: string;
  chunk_count: number;
  estimated_token_count: number;
  extracted_text_length?: number;
  embeddings?: string;
};

interface Props {
  sourceId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessed: () => void;
}

const FRIENDLY_ERROR =
  "Non siamo riusciti a processare la fonte. Controlla i log della funzione.";

const extractErrorDetail = async (fnErr: unknown): Promise<string | undefined> => {
  try {
    const ctx = await (fnErr as { context?: Response }).context?.json?.();
    return (ctx?.error_code as string | undefined) ?? (ctx?.error as string | undefined);
  } catch {
    return undefined;
  }
};

const KnowledgeProcessDialog = ({ sourceId, title, open, onOpenChange, onProcessed }: Props) => {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"idle" | "dry_running" | "processing">("idle");
  const [dry, setDry] = useState<DryRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = phase !== "idle";

  // Reset to a clean state every time the dialog opens.
  useEffect(() => {
    if (open) {
      setDry(null);
      setError(null);
      setPhase("idle");
    }
  }, [open]);

  const runDryRun = async () => {
    setPhase("dry_running");
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke(
      "process-knowledge-source",
      { body: { source_id: sourceId, mode: "dry_run" } },
    );
    if (fnErr) {
      const detail = await extractErrorDetail(fnErr);
      setPhase("idle");
      setError(detail ? `${FRIENDLY_ERROR} (codice: ${detail})` : FRIENDLY_ERROR);
      return;
    }
    setDry(data as DryRunResult);
    setPhase("idle");
    toast({
      title: "Dry run completato",
      description: `${(data as DryRunResult).chunk_count} chunk stimati. Nessuna scrittura nel database.`,
    });
  };

  const runProcess = async () => {
    setPhase("processing");
    setError(null);
    const { error: fnErr } = await supabase.functions.invoke(
      "process-knowledge-source",
      { body: { source_id: sourceId, mode: "process" } },
    );
    if (fnErr) {
      const detail = await extractErrorDetail(fnErr);
      setPhase("idle");
      setError(detail ? `${FRIENDLY_ERROR} (codice: ${detail})` : FRIENDLY_ERROR);
      return;
    }
    setPhase("idle");
    onOpenChange(false);
    toast({
      title: "Processing completato",
      description: "Fonte processata. I chunk sono stati creati senza embeddings.",
    });
    onProcessed();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Processa fonte</DialogTitle>
          <DialogDescription className="truncate">{title}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Il <strong>dry run</strong> calcola i chunk senza scrivere nel database e
          senza generare embeddings. Confermando, i chunk vengono inseriti con{" "}
          <code>embedding = null</code> e la fonte resta in stato <code>draft</code>.
        </p>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {dry && !error && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            {dry.source_type && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium">{dry.source_type}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Chunk stimati</span>
              <span className="font-medium">{dry.chunk_count}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Token stimati</span>
              <span className="font-medium">{dry.estimated_token_count}</span>
            </div>
            {typeof dry.extracted_text_length === "number" && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Lunghezza testo</span>
                <span className="font-medium">{dry.extracted_text_length}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Embeddings</span>
              <span className="font-medium">not_generated</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Chiudi
          </Button>
          {!dry ? (
            <Button onClick={runDryRun} disabled={busy} className="gap-2">
              {phase === "dry_running" && <Loader2 className="h-4 w-4 animate-spin" />}
              Esegui dry run
            </Button>
          ) : (
            <Button onClick={runProcess} disabled={busy} className="gap-2">
              {phase === "processing" && <Loader2 className="h-4 w-4 animate-spin" />}
              Conferma processing
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KnowledgeProcessDialog;
