import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Sparkles, TrendingUp, ExternalLink } from "lucide-react";

interface AttributionRow {
  id: string;
  source: string;
  dream_id: string | null;
  created_at: string;
}

interface TopDream {
  dream_id: string;
  count: number;
  title: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  visione: "Community",
  direct: "Diretto",
  share_email: "Email Condivisa",
  share_link: "Link Condiviso",
  other: "Altro",
};

const AdminAttributionStats = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AttributionRow[]>([]);
  const [topDreams, setTopDreams] = useState<TopDream[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Ultimi 60 giorni di attribuzioni (admin RLS permette di vedere tutte)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data: attrs, error } = await supabase
          .from("signup_attributions")
          .select("id, source, dream_id, created_at")
          .gte("created_at", sixtyDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(1000);

        if (error) throw error;
        const list = (attrs || []) as AttributionRow[];
        setRows(list);

        // Top 5 sogni magnetici
        const counts = new Map<string, number>();
        list.forEach((r) => {
          if (r.dream_id) counts.set(r.dream_id, (counts.get(r.dream_id) || 0) + 1);
        });
        const sorted = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        if (sorted.length > 0) {
          const ids = sorted.map(([id]) => id);
          const { data: dreams } = await supabase
            .from("dreams")
            .select("id, title")
            .in("id", ids);
          const titleMap = new Map((dreams || []).map((d: any) => [d.id, d.title]));
          setTopDreams(
            sorted.map(([dream_id, count]) => ({
              dream_id,
              count,
              title: titleMap.get(dream_id) ?? null,
            }))
          );
        } else {
          setTopDreams([]);
        }
      } catch (err) {
        console.error("[AdminAttributionStats]", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Calcoli intervalli
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const last30 = rows.filter((r) => now - new Date(r.created_at).getTime() <= 30 * DAY);
  const prev30 = rows.filter((r) => {
    const t = now - new Date(r.created_at).getTime();
    return t > 30 * DAY && t <= 60 * DAY;
  });

  const totalLast30 = last30.length;
  const totalPrev30 = prev30.length;
  const visioneLast30 = last30.filter((r) => r.source === "visione").length;

  const delta =
    totalPrev30 === 0
      ? totalLast30 > 0
        ? 100
        : 0
      : Math.round(((totalLast30 - totalPrev30) / totalPrev30) * 100);

  // Distribuzione per source (ultimi 30gg)
  const sourceCounts = new Map<string, number>();
  last30.forEach((r) => sourceCounts.set(r.source, (sourceCounts.get(r.source) || 0) + 1));
  const sourceList = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-[0.2em] text-[10px]">
              Iscrizioni 30gg
            </CardDescription>
            <CardTitle className="text-3xl">{totalLast30}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {delta >= 0 ? "+" : ""}
              {delta}% vs 30gg precedenti
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-[0.2em] text-[10px]">
              Da Community
            </CardDescription>
            <CardTitle className="text-3xl">{visioneLast30}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {totalLast30 > 0
                ? `${Math.round((visioneLast30 / totalLast30) * 100)}% delle iscrizioni`
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-[0.2em] text-[10px]">
              Sogni magnetici
            </CardDescription>
            <CardTitle className="text-3xl">{topDreams.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Sogni che hanno convertito almeno 1 iscrizione
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top dreams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4 text-primary" />
            Top 5 Sogni Magnetici
          </CardTitle>
          <CardDescription>
            Sogni pubblici che hanno generato più iscrizioni (ultimi 60gg)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topDreams.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nessuna conversione registrata ancora. I sogni condivisi che porteranno nuovi
              iscritti appariranno qui.
            </p>
          ) : (
            <ul className="space-y-2">
              {topDreams.map((d, i) => (
                <li
                  key={d.dream_id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-5">
                      #{i + 1}
                    </span>
                    <span className="truncate text-sm">
                      {d.title || <em className="text-muted-foreground">Senza titolo</em>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">
                      {d.count}{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        iscriz.
                      </span>
                    </span>
                    <Link
                      to={`/visione/${d.dream_id}`}
                      target="_blank"
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Apri visione"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Source distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuzione per Sorgente (30gg)</CardTitle>
        </CardHeader>
        <CardContent>
          {sourceList.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nessun dato.</p>
          ) : (
            <ul className="space-y-2">
              {sourceList.map(([src, count]) => {
                const pct = totalLast30 > 0 ? (count / totalLast30) * 100 : 0;
                return (
                  <li key={src} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{SOURCE_LABELS[src] || src}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {count} ({Math.round(pct)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAttributionStats;
