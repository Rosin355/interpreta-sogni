import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Admin-only test/debug panel for search-knowledge: dry_run first (zero provider
// calls), then a real semantic search. Shows source title / domain / similarity
// and a short content preview. Embeddings are NEVER shown. Uses the existing
// authenticated Supabase client session (JWT attached automatically).

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

const ANY_DOMAIN = "__any__";

type DryRunResult = {
  query_length: number;
  estimated_query_tokens: number;
  model: string;
  match_count: number;
  match_threshold: number;
  provider_call: boolean;
};

type SearchResult = {
  source_id: string;
  source_title: string;
  domain: string;
  language: string;
  chunk_index: number;
  content: string;
  token_count: number | null;
  similarity: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FRIENDLY_ERROR =
  "Non siamo riusciti a eseguire la ricerca. Controlla i log della funzione.";

const extractErrorCode = async (fnErr: unknown): Promise<string | undefined> => {
  try {
    const ctx = await (fnErr as { context?: Response }).context?.json?.();
    return (ctx?.error_code as string | undefined) ?? (ctx?.error as string | undefined);
  } catch {
    return undefined;
  }
};

const KnowledgeSearchTestDialog = ({ open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"idle" | "dry_running" | "searching">("idle");
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<string>(ANY_DOMAIN);
  const [language, setLanguage] = useState("it");
  const [matchCount, setMatchCount] = useState(5);
  const [matchThreshold, setMatchThreshold] = useState(0.7);
  const [dry, setDry] = useState<DryRunResult | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = phase !== "idle";

  useEffect(() => {
    if (open) {
      setPhase("idle");
      setDry(null);
      setResults(null);
      setError(null);
    }
  }, [open]);

  const buildBody = (mode: "dry_run" | "search") => ({
    query: query.trim(),
    domain: domain === ANY_DOMAIN ? undefined : domain,
    language: language.trim() || undefined,
    match_count: matchCount,
    match_threshold: matchThreshold,
    mode,
  });

  const runDryRun = async () => {
    if (query.trim().length < 3) {
      setError("La query deve avere almeno 3 caratteri.");
      return;
    }
    setPhase("dry_running");
    setError(null);
    setResults(null);
    const { data, error: fnErr } = await supabase.functions.invoke("search-knowledge", {
      body: buildBody("dry_run"),
    });
    if (fnErr) {
      const code = await extractErrorCode(fnErr);
      setPhase("idle");
      setError(code ? `${FRIENDLY_ERROR} (codice: ${code})` : FRIENDLY_ERROR);
      return;
    }
    setDry(data as DryRunResult);
    setPhase("idle");
    toast({
      title: "Dry run completato",
      description: "Nessuna chiamata al provider. Conferma per eseguire la ricerca.",
    });
  };

  const runSearch = async () => {
    setPhase("searching");
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke("search-knowledge", {
      body: buildBody("search"),
    });
    if (fnErr) {
      const code = await extractErrorCode(fnErr);
      setPhase("idle");
      setError(code ? `${FRIENDLY_ERROR} (codice: ${code})` : FRIENDLY_ERROR);
      return;
    }
    const payload = data as { results: SearchResult[]; result_count: number };
    setResults(payload.results ?? []);
    setPhase("idle");
    toast({
      title: "Ricerca completata",
      description: `${payload.result_count} risultati.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test ricerca Knowledge Base</DialogTitle>
          <DialogDescription>
            Pannello di test/debug. Il dry run non chiama il provider; la ricerca
            genera un embedding della query con OpenAI e restituisce i chunk più
            simili dalle fonti <code>active</code>. Gli embedding non vengono mai mostrati.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kb-search-query">Query</Label>
            <Textarea
              id="kb-search-query"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setDry(null); setResults(null); }}
              rows={3}
              placeholder="Es. simbolismo del serpente nei sogni alchemici"
              disabled={busy}
            />
            <div className="text-xs text-muted-foreground text-right">
              {query.trim().length} caratteri {query.trim().length < 3 && "(min 3)"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dominio (opzionale)</Label>
              <Select value={domain} onValueChange={(v) => { setDomain(v); setDry(null); }} disabled={busy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_DOMAIN}>Qualsiasi</SelectItem>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-search-lang">Lingua (opzionale)</Label>
              <Input
                id="kb-search-lang"
                value={language}
                onChange={(e) => { setLanguage(e.target.value); setDry(null); }}
                placeholder="it"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-search-count">match_count (1–10)</Label>
              <Input
                id="kb-search-count"
                type="number"
                min={1}
                max={10}
                value={matchCount}
                onChange={(e) => { setMatchCount(Number(e.target.value)); setDry(null); }}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-search-threshold">match_threshold (0–1)</Label>
              <Input
                id="kb-search-threshold"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={matchThreshold}
                onChange={(e) => { setMatchThreshold(Number(e.target.value)); setDry(null); }}
                disabled={busy}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {dry && !results && !error && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <Row label="Token query stimati" value={dry.estimated_query_tokens} />
              <Row label="Modello" value={dry.model} />
              <Row label="match_count" value={dry.match_count} />
              <Row label="match_threshold" value={dry.match_threshold} />
              <Row label="Chiamata al provider" value={dry.provider_call ? "sì" : "no"} />
            </div>
          )}

          {results && !error && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{results.length} risultati</p>
              {results.length === 0 && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Nessun chunk sopra la soglia. Prova ad abbassare <code>match_threshold</code>.
                </div>
              )}
              {results.map((r, i) => (
                <div key={`${r.source_id}-${r.chunk_index}-${i}`} className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{r.source_title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{r.domain}</Badge>
                      <Badge variant="secondary">sim {r.similarity.toFixed(4)}</Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    chunk #{r.chunk_index} · {r.language}
                    {typeof r.token_count === "number" ? ` · ${r.token_count} token` : ""}
                  </p>
                  <p className="text-foreground/90 line-clamp-3">
                    {r.content.length > 280 ? `${r.content.slice(0, 280)}…` : r.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Chiudi
          </Button>
          {!dry ? (
            <Button onClick={runDryRun} disabled={busy || query.trim().length < 3} className="gap-2">
              {phase === "dry_running" && <Loader2 className="h-4 w-4 animate-spin" />}
              Esegui dry run
            </Button>
          ) : (
            <Button onClick={runSearch} disabled={busy} className="gap-2">
              {phase === "searching" && <Loader2 className="h-4 w-4 animate-spin" />}
              Conferma ricerca
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

export default KnowledgeSearchTestDialog;
