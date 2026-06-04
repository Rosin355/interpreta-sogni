import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreHorizontal } from "lucide-react";
import KnowledgeSourceEditForm from "@/components/admin/KnowledgeSourceEditForm";
import KnowledgeProcessDialog from "@/components/admin/KnowledgeProcessDialog";

export type SourceRow = {
  id: string;
  title: string;
  status: string;
  source_type: string;
};

type SourceDetails = {
  id: string;
  status: string;
  source_type: string;
  processed_at: string | null;
  error_message: string | null;
  storage_path: string | null;
  updated_at: string | null;
  chunkCount: number | null;
};

interface Props {
  source: SourceRow;
  onChanged: () => void;
}

const DELETE_KEYWORD = "ELIMINA";

const KnowledgeSourceActions = ({ source, onChanged }: Props) => {
  const { toast } = useToast();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [processOpen, setProcessOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [details, setDetails] = useState<SourceDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const isArchived = source.status === "archived";

  // Generic manage-knowledge-source call.
  const callManage = async (
    action: "archive" | "restore_draft" | "delete_permanently",
    successTitle: string,
    failTitle: string,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("manage-knowledge-source", {
        body: { source_id: source.id, action },
      });
      if (error) {
        toast({ title: failTitle, variant: "destructive" });
        return false;
      }
      toast({ title: successTitle });
      onChanged();
      return true;
    } catch {
      toast({ title: failTitle, variant: "destructive" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openDetails = async () => {
    setDetailsOpen(true);
    setDetails(null);
    setDetailsLoading(true);
    const { data } = await supabase
      .from("ai_knowledge_sources")
      .select("id, status, source_type, processed_at, error_message, storage_path, updated_at")
      .eq("id", source.id)
      .maybeSingle();
    // Best-effort chunk count (RLS may hide chunks of non-active sources → may read 0).
    const { count } = await supabase
      .from("ai_knowledge_chunks")
      .select("id", { count: "exact", head: true })
      .eq("source_id", source.id);
    setDetails({
      id: source.id,
      status: data?.status ?? source.status,
      source_type: data?.source_type ?? source.source_type,
      processed_at: data?.processed_at ?? null,
      error_message: data?.error_message ?? null,
      storage_path: data?.storage_path ?? null,
      updated_at: data?.updated_at ?? null,
      chunkCount: typeof count === "number" ? count : null,
    });
    setDetailsLoading(false);
  };

  const onArchiveConfirm = async () => {
    const ok = await callManage("archive", "Fonte archiviata", "Non siamo riusciti ad archiviare la fonte");
    if (ok) setArchiveOpen(false);
  };

  const onRestoreConfirm = async () => {
    const ok = await callManage(
      "restore_draft",
      "Fonte ripristinata in bozza",
      "Non siamo riusciti a ripristinare la fonte",
    );
    if (ok) setRestoreOpen(false);
  };

  const onDeleteConfirm = async () => {
    if (deleteConfirm !== DELETE_KEYWORD) return;
    const ok = await callManage(
      "delete_permanently",
      "Fonte eliminata definitivamente",
      "Non siamo riusciti a eliminare la fonte",
    );
    if (ok) {
      setDeleteOpen(false);
      setDeleteConfirm("");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Azioni">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Azioni</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => openDetails()}>Apri dettagli</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)} disabled={isArchived}>
            Modifica
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setProcessOpen(true)} disabled={isArchived}>
            Processa fonte
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isArchived ? (
            <DropdownMenuItem onSelect={() => setRestoreOpen(true)}>Ripristina in bozza</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>Archivia</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setDeleteConfirm("");
              setDeleteOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            Elimina definitivamente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Details */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dettagli fonte</DialogTitle>
            <DialogDescription className="truncate">{source.title}</DialogDescription>
          </DialogHeader>
          {detailsLoading || !details ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <Detail label="ID" value={`${details.id.slice(0, 8)}…`} />
              <Detail label="Status" value={details.status} />
              <Detail label="Tipo" value={details.source_type} />
              <Detail
                label="Processato il"
                value={details.processed_at ? new Date(details.processed_at).toLocaleString("it-IT") : "—"}
              />
              {details.storage_path && <Detail label="Storage path" value={details.storage_path} />}
              <Detail label="Chunk (visibili)" value={details.chunkCount ?? "n/d"} />
              {details.error_message && (
                <Detail label="Errore" value={details.error_message} danger />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica fonte</DialogTitle>
            <DialogDescription className="truncate">{source.title}</DialogDescription>
          </DialogHeader>
          {editOpen && (
            <KnowledgeSourceEditForm
              sourceId={source.id}
              onSaved={() => {
                setEditOpen(false);
                onChanged();
              }}
              onCancel={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Process */}
      <KnowledgeProcessDialog
        sourceId={source.id}
        title={source.title}
        open={processOpen}
        onOpenChange={setProcessOpen}
        onProcessed={onChanged}
      />

      {/* Archive confirm */}
      <AlertDialog open={archiveOpen} onOpenChange={(o) => { if (!busy) setArchiveOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiviare questa fonte?</AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi archiviare questa fonte? Non sarà usata nei futuri processi finché non
              verrà ripristinata. I chunk non vengono eliminati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setArchiveOpen(false)} disabled={busy}>
              Annulla
            </Button>
            <Button onClick={onArchiveConfirm} disabled={busy} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Archivia
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore confirm */}
      <AlertDialog open={restoreOpen} onOpenChange={(o) => { if (!busy) setRestoreOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare questa fonte in bozza?</AlertDialogTitle>
            <AlertDialogDescription>
              La fonte tornerà in stato <code>draft</code> e potrà essere modificata e
              riprocessata. Non viene generato alcun embedding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setRestoreOpen(false)} disabled={busy}>
              Annulla
            </Button>
            <Button onClick={onRestoreConfirm} disabled={busy} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Ripristina in bozza
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Protected permanent delete */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!busy) { setDeleteOpen(o); if (!o) setDeleteConfirm(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina definitivamente</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà definitivamente la fonte e tutti i chunk collegati.
              Non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="kb-delete-confirm">
              Per confermare digita <span className="font-mono font-semibold">{DELETE_KEYWORD}</span>
            </Label>
            <Input
              id="kb-delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={DELETE_KEYWORD}
              autoComplete="off"
              disabled={busy}
            />
          </div>
          <AlertDialogFooter>
            <Button
              variant="ghost"
              onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}
              disabled={busy}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteConfirm}
              disabled={busy || deleteConfirm !== DELETE_KEYWORD}
              className="gap-2"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Elimina definitivamente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const Detail = ({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-medium text-right break-all ${danger ? "text-destructive" : ""}`}>{value}</span>
  </div>
);

export default KnowledgeSourceActions;
