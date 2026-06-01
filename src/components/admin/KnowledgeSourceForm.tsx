import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldAlert } from "lucide-react";

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

const SOURCE_TYPES = ["manual_text", "note", "markdown", "txt"] as const;
const STATUSES = ["draft", "active"] as const;

const Schema = z.object({
  title: z.string().trim().min(3, "Minimo 3 caratteri").max(200),
  domain: z.enum(DOMAINS),
  source_type: z.enum(SOURCE_TYPES),
  status: z.enum(STATUSES),
  language: z.string().trim().min(2).max(8),
  author: z.string().trim().max(200).optional(),
  origin: z.string().trim().max(500).optional(),
  tags: z.array(z.string()).max(50),
  raw_text: z.string().min(100, "Minimo 100 caratteri").max(200_000),
});

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

const KnowledgeSourceForm = ({ onCreated, onCancel }: Props) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<typeof DOMAINS[number]>("alchemy");
  const [sourceType, setSourceType] = useState<typeof SOURCE_TYPES[number]>("manual_text");
  const [status, setStatus] = useState<typeof STATUSES[number]>("draft");
  const [language, setLanguage] = useState("it");
  const [author, setAuthor] = useState("");
  const [origin, setOrigin] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [rawText, setRawText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 64);

    const parsed = Schema.safeParse({
      title,
      domain,
      source_type: sourceType,
      status,
      language,
      author: author || undefined,
      origin: origin || undefined,
      tags,
      raw_text: rawText,
    });

    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast({
        title: "Dati non validi",
        description: first?.message ?? "Controlla i campi del form",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("ingest-knowledge-source", {
        body: parsed.data,
      });
      if (error) {
        let detail: string | undefined;
        try {
          const ctx = await (error as { context?: Response }).context?.json?.();
          detail = ctx?.error;
        } catch {
          /* ignore */
        }
        toast({
          title: "Errore",
          description:
            detail ??
            "Non siamo riusciti a salvare la fonte. Verifica i permessi admin e riprova.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Fonte salvata nella Knowledge Base" });
      onCreated();
    } catch (err) {
      console.error("[KnowledgeSourceForm] submit error", err);
      toast({
        title: "Errore",
        description: "Non siamo riusciti a salvare la fonte. Verifica i permessi admin e riprova.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          La Knowledge Base contiene solo materiale curatoriale. Non inserire sogni
          privati degli utenti.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="kb-title">Titolo</Label>
        <Input
          id="kb-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Es: Simbologia alchemica del fuoco"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Dominio</Label>
          <Select value={domain} onValueChange={(v) => setDomain(v as typeof DOMAINS[number])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tipo sorgente</Label>
          <Select value={sourceType} onValueChange={(v) => setSourceType(v as typeof SOURCE_TYPES[number])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOURCE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof STATUSES[number])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="kb-language">Lingua</Label>
          <Input
            id="kb-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="it"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kb-author">Autore (opzionale)</Label>
          <Input
            id="kb-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Es: C.G. Jung"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kb-origin">Origine (opzionale)</Label>
          <Input
            id="kb-origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Libro, URL, riferimento…"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kb-tags">Tag (separati da virgola)</Label>
        <Input
          id="kb-tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="fuoco, trasformazione, archetipo"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="kb-raw">Testo</Label>
        <p className="text-xs text-muted-foreground">
          Inserisci qui testi di riferimento alchemici, astrologici o simbolici che
          potranno guidare le future interpretazioni AI.
        </p>
        <Textarea
          id="kb-raw"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={12}
          placeholder="Incolla il testo curatoriale completo…"
          required
        />
        <div className="text-xs text-muted-foreground text-right">
          {rawText.length} caratteri {rawText.length < 100 && "(min 100)"}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Annulla
        </Button>
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Salva fonte
        </Button>
      </div>
    </form>
  );
};

export default KnowledgeSourceForm;
