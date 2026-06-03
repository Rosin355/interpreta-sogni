import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import KnowledgeProcessAction from "@/components/admin/KnowledgeProcessAction";

type KnowledgeSource = {
  id: string;
  title: string;
  domain: string;
  source_type: string;
  status: string;
  language: string;
  tags: string[] | null;
  updated_at: string;
};

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
];

const STATUSES = ["draft", "active", "archived"];

const statusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
  if (status === "active") return "default";
  if (status === "draft") return "secondary";
  return "outline";
};

interface Props {
  refreshKey: number;
  onProcessed: () => void;
}

const KnowledgeSourcesList = ({ refreshKey, onProcessed }: Props) => {
  const [rows, setRows] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [domain, setDomain] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [language, setLanguage] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("ai_knowledge_sources")
        .select("id, title, domain, source_type, status, language, tags, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as KnowledgeSource[]);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const languages = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.language && s.add(r.language));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (domain !== "all" && r.domain !== domain) return false;
      if (status !== "all" && r.status !== status) return false;
      if (language !== "all" && r.language !== language) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, domain, status, language, search]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input
          placeholder="Cerca per titolo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={domain} onValueChange={setDomain}>
          <SelectTrigger>
            <SelectValue placeholder="Dominio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i domini</SelectItem>
            {DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger>
            <SelectValue placeholder="Lingua" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le lingue</SelectItem>
            {languages.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">
            Errore nel caricamento: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {rows.length === 0
              ? "Nessuna fonte nella Knowledge Base. Inizia aggiungendo un testo di riferimento."
              : "Nessuna fonte corrisponde ai filtri selezionati."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Dominio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lingua</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Aggiornato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[280px] truncate">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground">{r.domain}</TableCell>
                  <TableCell className="text-muted-foreground">{r.source_type}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground uppercase text-xs">{r.language}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(r.tags ?? []).slice(0, 4).map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                      {(r.tags?.length ?? 0) > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{(r.tags?.length ?? 0) - 4}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(r.updated_at).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <KnowledgeProcessAction
                      sourceId={r.id}
                      title={r.title}
                      onProcessed={onProcessed}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* TODO: azioni edit/archive/activate richiedono Edge Function dedicata o nuove policy RLS UPDATE admin. */}
    </div>
  );
};

export default KnowledgeSourcesList;
