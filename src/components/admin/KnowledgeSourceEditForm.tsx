import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const DOMAINS = [
  "dreams",
  "alchemy",
  "astrology",
  "symbols",
  "mythology",
  "psychology",
  "rituals",
  "voice_scripts",
  "community_guidelines",
  "app_content",
] as const;

const TEXT_TYPES = ["manual_text", "note", "markdown", "txt"];

// Italian labels for every persisted status. Only draft/active are admin-
// selectable; processing/failed are system-managed; archived uses the dedicated
// Archivia/Ripristina actions.
const STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  active: "Attiva",
  processing: "In elaborazione",
  failed: "Errore",
  archived: "Archiviata",
};

// Pull a safe machine error_code out of a FunctionsHttpError (Response body).
const extractErrorCode = async (fnErr: unknown): Promise<string | undefined> => {
  try {
    const ctx = await (fnErr as { context?: Response }).context?.json?.();
    return (ctx?.error_code as string | undefined) ?? (ctx?.error as string | undefined);
  } catch {
    return undefined;
  }
};

type FullSource = {
  id: string;
  title: string;
  domain: string;
  source_type: string;
  status: string;
  language: string;
  author: string | null;
  origin: string | null;
  tags: string[] | null;
  raw_text: string | null;
  storage_path: string | null;
  processed_at: string | null;
  error_message: string | null;
};

interface Props {
  sourceId: string;
  onSaved: () => void;
  onCancel: () => void;
}

const KnowledgeSourceEditForm = ({ sourceId, onSaved, onCancel }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [sourceType, setSourceType] = useState<string>("manual_text");
  // `status` = the persisted status (display + ingest preservation).
  // `desiredStatus` = the admin's selector choice (draft|active) that drives a
  // SEPARATE, validated transition via manage-knowledge-source.
  const [status, setStatus] = useState<string>("draft");
  const [desiredStatus, setDesiredStatus] = useState<"draft" | "active">("draft");
  // Best-effort: true if the client positively sees pending embeddings, null if
  // unknown (RLS hides non-active sources' chunks). Server stays authoritative.
  const [chunkPending, setChunkPending] = useState<boolean | null>(null);
  const [originalRawText, setOriginalRawText] = useState("");
  const [originalStoragePath, setOriginalStoragePath] = useState("");
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<string>("alchemy");
  const [language, setLanguage] = useState("it");
  const [author, setAuthor] = useState("");
  const [origin, setOrigin] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [rawText, setRawText] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [processedAt, setProcessedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPdf = sourceType === "pdf";
  // Only draft/active are admin-selectable. processing/failed/archived are not
  // edited here (archived is blocked upstream; processing/failed are system-managed).
  const statusSelectable = status === "draft" || status === "active";
  // Hard-disable the Active option only when we positively know embeddings are
  // pending. When unknown (null) we leave it enabled and let the server decide.
  const activeOptionDisabled = chunkPending === true;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("ai_knowledge_sources")
        .select(
          "id, title, domain, source_type, status, language, author, origin, tags, raw_text, storage_path, processed_at, error_message",
        )
        .eq("id", sourceId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setLoadError(error?.message ?? "Sorgente non trovata");
        setLoading(false);
        return;
      }
      const s = data as FullSource;
      setSourceType(s.source_type ?? "manual_text");
      setStatus(s.status ?? "draft");
      setDesiredStatus(s.status === "active" ? "active" : "draft");
      setTitle(s.title ?? "");
      setDomain(s.domain ?? "alchemy");
      setLanguage(s.language ?? "it");
      setAuthor(s.author ?? "");
      setOrigin(s.origin ?? "");
      setTagsInput((s.tags ?? []).join(", "));
      setRawText(s.raw_text ?? "");
      setStoragePath(s.storage_path ?? "");
      setOriginalRawText(s.raw_text ?? "");
      setOriginalStoragePath(s.storage_path ?? "");
      setProcessedAt(s.processed_at ?? null);
      setErrorMessage(s.error_message ?? null);

      // Best-effort readiness hint for the Active option. RLS may hide the
      // chunks of a non-active source → counts read 0 → leave it "unknown" and
      // let the server enforce readiness on activate.
      const totalQ = await supabase
        .from("ai_knowledge_chunks")
        .select("id", { count: "exact", head: true })
        .eq("source_id", sourceId);
      const pendingQ = await supabase
        .from("ai_knowledge_chunks")
        .select("id", { count: "exact", head: true })
        .eq("source_id", sourceId)
        .is("embedding", null);
      if (!cancelled) {
        const total = totalQ.count ?? 0;
        setChunkPending(total > 0 ? (pendingQ.count ?? 0) > 0 : null);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 64);

    // Preserve status (clamped to the ingest schema's draft|active). Archived
    // sources are edited via "Ripristina" first, so we never send 'archived'.
    const safeStatus = status === "active" ? "active" : "draft";

    const base = {
      source_id: sourceId,
      title: title.trim(),
      domain,
      source_type: sourceType,
      language: language.trim(),
      author: author.trim() || undefined,
      origin: origin.trim() || undefined,
      tags,
      status: safeStatus,
    };

    const FieldSchema = z.object({
      title: z.string().min(3, "Titolo: minimo 3 caratteri").max(200),
      language: z.string().min(2).max(8),
    });
    const fieldCheck = FieldSchema.safeParse({ title: base.title, language: base.language });
    if (!fieldCheck.success) {
      toast({
        title: "Dati non validi",
        description: fieldCheck.error.errors[0]?.message ?? "Controlla i campi",
        variant: "destructive",
      });
      return;
    }

    let body: Record<string, unknown>;
    if (isPdf) {
      if (!storagePath.trim()) {
        toast({
          title: "Dati non validi",
          description: "storage_path richiesto per le fonti PDF",
          variant: "destructive",
        });
        return;
      }
      body = { ...base, storage_path: storagePath.trim() };
    } else {
      if (rawText.length < 100) {
        toast({
          title: "Dati non validi",
          description: "Il testo deve avere almeno 100 caratteri",
          variant: "destructive",
        });
        return;
      }
      body = { ...base, raw_text: rawText };
    }

    // Did the content change? ingest-knowledge-source forces such sources back to
    // draft, and we must NEVER auto-reactivate them.
    const contentChanged = isPdf
      ? storagePath.trim() !== (originalStoragePath ?? "")
      : rawText !== (originalRawText ?? "");

    setSubmitting(true);
    try {
      // 1) Save metadata/content via ingest (status preserved, never activated here).
      const { data: ingData, error } = await supabase.functions.invoke(
        "ingest-knowledge-source",
        { body },
      );
      if (error) {
        toast({
          title: "Errore",
          description: "Non siamo riusciti ad aggiornare la fonte",
          variant: "destructive",
        });
        return;
      }
      const postStatus = ((ingData as { status?: string })?.status) ?? safeStatus;
      toast({ title: "Fonte aggiornata" });

      // 2) Request the status transition separately, only when meaningful.
      if (contentChanged && desiredStatus === "active") {
        // ingest forced the source back to draft — inform, do not reactivate.
        toast({
          title: "Fonte tornata in bozza",
          description:
            "La fonte è tornata in bozza perché il contenuto è cambiato. Processala e rigenera gli embeddings prima di riattivarla.",
        });
      } else if (statusSelectable && !contentChanged && desiredStatus !== postStatus) {
        await applyStatusTransition(desiredStatus);
      }

      // 3) Refresh details/list.
      onSaved();
    } catch {
      toast({
        title: "Errore",
        description: "Non siamo riusciti ad aggiornare la fonte",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Controlled draft↔active transition via manage-knowledge-source (server-side
  // readiness validation). Never a broad client-side status write.
  const applyStatusTransition = async (target: "draft" | "active") => {
    const action = target === "active" ? "activate" : "move_to_draft";
    const { error } = await supabase.functions.invoke("manage-knowledge-source", {
      body: { source_id: sourceId, action },
    });
    if (error) {
      const code = await extractErrorCode(error);
      if (code === "source_not_ready_for_activation") {
        toast({
          title: "Attivazione non disponibile",
          description: "Genera prima gli embeddings per tutti i chunk.",
          variant: "destructive",
        });
      } else if (code === "source_archived") {
        toast({
          title: "Fonte archiviata",
          description: "Ripristina la fonte prima di cambiarne lo stato.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Errore",
          description: "Non siamo riusciti ad aggiornare lo stato della fonte.",
          variant: "destructive",
        });
      }
      return;
    }
    toast({ title: target === "active" ? "Fonte attivata" : "Fonte spostata in bozza" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Errore nel caricamento della fonte: {loadError}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>Chiudi</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Readonly / help fields */}
      <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">id: {sourceId.slice(0, 8)}…</Badge>
          <Badge variant="outline">tipo: {sourceType}</Badge>
          <Badge variant="outline">status: {STATUS_LABELS[status] ?? status}</Badge>
        </div>
        <div className="text-muted-foreground">
          Processato il:{" "}
          {processedAt ? new Date(processedAt).toLocaleString("it-IT") : "—"}
        </div>
        {errorMessage && (
          <div className="text-destructive">Ultimo errore: {errorMessage}</div>
        )}
        <p className="text-muted-foreground">
          {isPdf
            ? "Fonte PDF: il testo viene estratto in fase di processing dal file in Storage."
            : "Fonte testuale: il contenuto è in raw_text qui sotto."}{" "}
          Il tipo non è modificabile qui.
        </p>
      </div>

      {/* Status management — only draft/active are admin-selectable. */}
      <div className="space-y-2">
        <Label>Stato</Label>
        {statusSelectable ? (
          <>
            <Select
              value={desiredStatus}
              onValueChange={(v) => setDesiredStatus(v as "draft" | "active")}
              disabled={submitting}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{STATUS_LABELS.draft}</SelectItem>
                <SelectItem value="active" disabled={activeOptionDisabled}>
                  {STATUS_LABELS.active}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {desiredStatus === "active"
                ? "La fonte può essere utilizzata dal sistema di ricerca della Knowledge Base."
                : "La fonte non viene utilizzata nelle interpretazioni AI."}
            </p>
            {activeOptionDisabled && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Completa processing ed embeddings prima di attivare la fonte.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              L'attivazione è consentita solo se tutti i chunk hanno un embedding
              (verifica lato server). L'archiviazione usa le azioni dedicate.
            </p>
          </>
        ) : (
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            Stato attuale: <strong>{STATUS_LABELS[status] ?? status}</strong>.{" "}
            {status === "archived"
              ? "Usa Ripristina per riportarla in bozza."
              : "Stato gestito dal sistema (processing/errore): non modificabile manualmente."}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="kb-edit-title">Titolo</Label>
        <Input
          id="kb-edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Dominio</Label>
          <Select value={domain} onValueChange={setDomain} disabled={submitting}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="kb-edit-language">Lingua</Label>
          <Input
            id="kb-edit-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kb-edit-author">Autore (opzionale)</Label>
          <Input
            id="kb-edit-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kb-edit-origin">Origine (opzionale)</Label>
          <Input
            id="kb-edit-origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kb-edit-tags">Tag (separati da virgola)</Label>
        <Input
          id="kb-edit-tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          disabled={submitting}
        />
      </div>

      {isPdf ? (
        <div className="space-y-2">
          <Label htmlFor="kb-edit-path">Storage path (PDF)</Label>
          <Input
            id="kb-edit-path"
            value={storagePath}
            onChange={(e) => setStoragePath(e.target.value)}
            placeholder="alchemy/documento.pdf"
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            Path dell'oggetto nel bucket privato <code>knowledge-sources</code>. Se
            cambia, la fonte torna in <code>draft</code> e andrà riprocessata.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="kb-edit-raw">Testo</Label>
          <Textarea
            id="kb-edit-raw"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={12}
            disabled={submitting}
            required
          />
          <div className="text-xs text-muted-foreground text-right">
            {rawText.length} caratteri {rawText.length < 100 && "(min 100)"}
          </div>
          <p className="text-xs text-muted-foreground">
            Se il testo cambia, la fonte torna in <code>draft</code> e{" "}
            <code>processed_at</code> viene azzerato (andrà riprocessata).
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Annulla
        </Button>
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Salva modifiche
        </Button>
      </div>
    </form>
  );
};

export default KnowledgeSourceEditForm;
