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
  const [status, setStatus] = useState<string>("draft");
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<string>("alchemy");
  const [language, setLanguage] = useState("it");
  const [author, setAuthor] = useState("");
  const [origin, setOrigin] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [rawText, setRawText] = useState("");
  const [storagePath, setStoragePath] = useState("");

  const isPdf = sourceType === "pdf";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("ai_knowledge_sources")
        .select(
          "id, title, domain, source_type, status, language, author, origin, tags, raw_text, storage_path",
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
      setTitle(s.title ?? "");
      setDomain(s.domain ?? "alchemy");
      setLanguage(s.language ?? "it");
      setAuthor(s.author ?? "");
      setOrigin(s.origin ?? "");
      setTagsInput((s.tags ?? []).join(", "));
      setRawText(s.raw_text ?? "");
      setStoragePath(s.storage_path ?? "");
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

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("ingest-knowledge-source", {
        body,
      });
      if (error) {
        toast({
          title: "Errore",
          description: "Non siamo riusciti ad aggiornare la fonte",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fonte aggiornata" });
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
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">tipo: {sourceType}</Badge>
        <Badge variant="outline">status: {status}</Badge>
        <span>Tipo e status non sono modificabili qui (usa archivia/ripristina).</span>
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
