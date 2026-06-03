import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldAlert, FileText } from "lucide-react";

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

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const BUCKET = "knowledge-sources";

const MetaSchema = z.object({
  title: z.string().trim().min(3, "Titolo: minimo 3 caratteri").max(200),
  domain: z.enum(DOMAINS),
  language: z.string().trim().min(2).max(8),
  author: z.string().trim().max(200).optional(),
  origin: z.string().trim().max(500).optional(),
  tags: z.array(z.string()).max(50),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "documento";

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

const KnowledgePdfUploadForm = ({ onCreated, onCancel }: Props) => {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"idle" | "uploading" | "registering">("idle");

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<typeof DOMAINS[number]>("alchemy");
  const [language, setLanguage] = useState("it");
  const [author, setAuthor] = useState("");
  const [origin, setOrigin] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const submitting = phase !== "idle";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== "application/pdf") {
      toast({
        title: "File non valido",
        description: "Carica un PDF (application/pdf).",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    if (f && f.size > MAX_BYTES) {
      toast({
        title: "File troppo grande",
        description: "Dimensione massima: 50 MB.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: "Nessun file selezionato",
        description: "Carica un documento PDF.",
        variant: "destructive",
      });
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 64);

    const parsed = MetaSchema.safeParse({
      title,
      domain,
      language,
      author: author || undefined,
      origin: origin || undefined,
      tags,
    });

    if (!parsed.success) {
      toast({
        title: "Dati non validi",
        description: parsed.error.errors[0]?.message ?? "Controlla i campi",
        variant: "destructive",
      });
      return;
    }

    const storagePath = `${parsed.data.domain}/${Date.now()}-${slugify(parsed.data.title)}.pdf`;

    setPhase("uploading");
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (upErr) {
      console.error("[KnowledgePdfUploadForm] upload error", upErr);
      setPhase("idle");
      toast({
        title: "Upload fallito",
        description:
          upErr.message ??
          "Verifica i permessi admin e che il bucket 'knowledge-sources' esista.",
        variant: "destructive",
      });
      return;
    }

    setPhase("registering");
    const { error: fnErr } = await supabase.functions.invoke("ingest-knowledge-source", {
      body: {
        source_type: "pdf",
        storage_path: storagePath,
        title: parsed.data.title,
        domain: parsed.data.domain,
        language: parsed.data.language,
        author: parsed.data.author,
        origin: parsed.data.origin,
        tags: parsed.data.tags,
        status: "draft",
      },
    });

    if (fnErr) {
      let detail: string | undefined;
      try {
        const ctx = await (fnErr as { context?: Response }).context?.json?.();
        detail = ctx?.error;
      } catch {
        /* ignore */
      }
      // cleanup orphan file
      await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => undefined);
      setPhase("idle");
      toast({
        title: "Registrazione fallita",
        description: detail ?? "Il file è stato rimosso. Riprova.",
        variant: "destructive",
      });
      return;
    }

    setPhase("idle");
    toast({ title: "PDF caricato e registrato come fonte (draft)" });
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Carica solo materiale curatoriale (testi alchemici, astrologici, simbolici).
          Mai sogni privati degli utenti né documenti con dati personali.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="kb-pdf-file">Documento PDF</Label>
        <Input
          id="kb-pdf-file"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={submitting}
          required
        />
        {file && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span className="truncate">{file.name}</span>
            <span>· {(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Max 50 MB. Il file verrà salvato nel bucket privato{" "}
          <code>knowledge-sources</code>. L'estrazione del testo avverrà in una fase
          successiva.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kb-pdf-title">Titolo</Label>
        <Input
          id="kb-pdf-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Es: Mysterium Coniunctionis — estratto"
          disabled={submitting}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Dominio</Label>
          <Select
            value={domain}
            onValueChange={(v) => setDomain(v as typeof DOMAINS[number])}
            disabled={submitting}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="kb-pdf-language">Lingua</Label>
          <Input
            id="kb-pdf-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="it"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kb-pdf-author">Autore (opzionale)</Label>
          <Input
            id="kb-pdf-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Es: C.G. Jung"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kb-pdf-origin">Origine (opzionale)</Label>
          <Input
            id="kb-pdf-origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Libro, URL, riferimento…"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kb-pdf-tags">Tag (separati da virgola)</Label>
        <Input
          id="kb-pdf-tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="alchimia, coniunctio, archetipo"
          disabled={submitting}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Annulla
        </Button>
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {phase === "uploading"
            ? "Caricamento…"
            : phase === "registering"
            ? "Registrazione…"
            : "Carica PDF"}
        </Button>
      </div>
    </form>
  );
};

export default KnowledgePdfUploadForm;
