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

// Controlled dialog for embed-knowledge-source: dry_run first (zero provider
// calls), then (on confirm) embed in batches of 20. OpenAI embeddings only —
// the key stays server-side. Uses the existing authenticated Supabase client
// session (JWT attached automatically). Only counts / token estimates are
// shown — never chunk content or vectors.

const BATCH_SIZE = 20;

type DryRunResult = {
  total_chunks: number;
  pending_chunks: number;
  embedded_chunks: number;
  estimated_input_tokens: number;
  model: string;
  provider_call: boolean;
};

type EmbedResult = {
  status: "active" | "partial" | string;
  embedded_this_batch: number;
  pending_chunks?: number;
  source_status: string;
  requires_another_batch: boolean;
};

interface Props {
  sourceId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmbedded: () => void;
}

const FRIENDLY_ERROR =
  "Non siamo riusciti a generare gli embeddings. Controlla i log della funzione.";

const extractErrorDetail = async (fnErr: unknown): Promise<string | undefined> => {
  try {
    const ctx = await (fnErr as { context?: Response }).context?.json?.();
    return (ctx?.error_code as string | undefined) ?? (ctx?.error as string | undefined);
  } catch {
    return undefined;
  }
};

const KnowledgeEmbedDialog = ({ sourceId, title, open, onOpenChange, onEmbedded }: Props) => {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"idle" | "dry_running" | "embedding">("idle");
  const [dry, setDry] = useState<DryRunResult | null>(null);
  const [last, setLast] = useState<EmbedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = phase !== "idle";

  // Reset to a clean state every time the dialog opens.
  useEffect(() => {
    if (open) {
      setDry(null);
      setLast(null);
      setError(null);
      setPhase("idle");
    }
  }, [open]);

  const runDryRun = async () => {
    setPhase("dry_running");
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke(
      "embed-knowledge-source",
      { body: { source_id: sourceId, mode: "dry_run", batch_size: BATCH_SIZE } },
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
      description: `${(data as DryRunResult).pending_chunks} chunk da elaborare. Nessuna chiamata al provider.`,
    });
  };

  const runEmbed = async () => {
    setPhase("embedding");
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke(
      "embed-knowledge-source",
      { body: { source_id: sourceId, mode: "embed", batch_size: BATCH_SIZE } },
    );
    if (fnErr) {
      const detail = await extractErrorDetail(fnErr);
      setPhase("idle");
      setError(detail ? `${FRIENDLY_ERROR} (codice: ${detail})` : FRIENDLY_ERROR);
      onEmbedded(); // refresh — the source may now be in 'failed'
      return;
    }
    const result = data as EmbedResult;
    setLast(result);
    setPhase("idle");
    onEmbedded(); // refresh the source list after each batch
    toast({
      title: result.requires_another_batch ? "Batch completato" : "Embeddings completati",
      description: result.requires_another_batch
        ? `${result.embedded_this_batch} embeddings generati, ${result.pending_chunks} chunk rimanenti.`
        : "Tutti i chunk sono stati elaborati. Fonte attiva.",
    });
  };

  const requiresAnotherBatch = last?.requires_another_batch === true;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Genera embeddings</DialogTitle>
          <DialogDescription className="truncate">{title}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Il <strong>dry run</strong> non chiama il provider e non scrive nel database.
          Confermando, i chunk pendenti vengono inviati a OpenAI per generare gli
          embeddings in batch da {BATCH_SIZE}. Quando non restano chunk pendenti, la
          fonte passa allo stato <code>active</code>.
        </p>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {dry && !error && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <Row label="Chunk totali" value={dry.total_chunks} />
            <Row label="Chunk pendenti" value={dry.pending_chunks} />
            <Row label="Già con embedding" value={dry.embedded_chunks} />
            <Row label="Token stimati (input)" value={dry.estimated_input_tokens} />
            <Row label="Modello" value={dry.model} />
            <Row label="Chiamata al provider" value={dry.provider_call ? "sì" : "no"} />
          </div>
        )}

        {last && !error && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <Row label="Embeddings in questo batch" value={last.embedded_this_batch} />
            {typeof last.pending_chunks === "number" && (
              <Row label="Chunk rimanenti" value={last.pending_chunks} />
            )}
            <Row label="Stato fonte" value={last.source_status} />
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
          ) : requiresAnotherBatch ? (
            <Button onClick={runEmbed} disabled={busy} className="gap-2">
              {phase === "embedding" && <Loader2 className="h-4 w-4 animate-spin" />}
              Continua con il batch successivo
            </Button>
          ) : last ? (
            <Button onClick={() => onOpenChange(false)} disabled={busy}>
              Fatto
            </Button>
          ) : (
            <Button onClick={runEmbed} disabled={busy} className="gap-2">
              {phase === "embedding" && <Loader2 className="h-4 w-4 animate-spin" />}
              Conferma generazione embeddings
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right break-all">{value}</span>
  </div>
);

export default KnowledgeEmbedDialog;
