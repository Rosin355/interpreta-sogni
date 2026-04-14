import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Archive, CheckCircle, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface ErrorLog {
  id: string;
  error_code: string;
  error_message_user: string;
  error_message_technical: string;
  function_name: string | null;
  dream_id: string | null;
  user_id: string | null;
  status: string | null;
  resolution_note: string | null;
  archived_at: string | null;
  created_at: string;
  metadata: any;
}

const statusColors: Record<string, string> = {
  new: "bg-red-500/20 text-red-400 border-red-500/30",
  investigating: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
};

const AdminErrorsList = () => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "investigating" | "resolved">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const fetchErrors = async () => {
    setLoading(true);
    let query = supabase
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!showArchived) {
      query = query.is("archived_at", null);
    }
    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching error logs:", error);
    } else {
      setErrors(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchErrors();
  }, [filter, showArchived]);

  const updateStatus = async (errorId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === "resolved" && resolutionNotes[errorId]) {
      updates.resolution_note = resolutionNotes[errorId];
    }
    const { error } = await supabase
      .from("error_logs")
      .update(updates)
      .eq("id", errorId);

    if (error) {
      toast({ title: "Errore", description: "Impossibile aggiornare lo stato", variant: "destructive" });
    } else {
      toast({ title: "Aggiornato", description: `Stato cambiato in "${newStatus}"` });
      fetchErrors();
    }
  };

  const archiveError = async (errorId: string) => {
    const { error } = await supabase
      .from("error_logs")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", errorId);

    if (error) {
      toast({ title: "Errore", description: "Impossibile archiviare", variant: "destructive" });
    } else {
      toast({ title: "Archiviato" });
      fetchErrors();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "new", "investigating", "resolved"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Tutti" : f === "new" ? "Nuovi" : f === "investigating" ? "In analisi" : "Risolti"}
          </Button>
        ))}
        <Button
          size="sm"
          variant={showArchived ? "default" : "outline"}
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="h-4 w-4 mr-1" />
          {showArchived ? "Nascondi archiviati" : "Mostra archiviati"}
        </Button>
      </div>

      {errors.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            Nessun errore trovato con i filtri selezionati
          </CardContent>
        </Card>
      ) : (
        errors.map((err) => (
          <Card key={err.id} className="border-l-4" style={{ borderLeftColor: err.status === "new" ? "#ef4444" : err.status === "investigating" ? "#eab308" : "#22c55e" }}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <CardTitle className="text-sm font-mono">{err.error_code}</CardTitle>
                  <Badge variant="outline" className={statusColors[err.status || "new"]}>
                    {err.status || "new"}
                  </Badge>
                  {err.function_name && (
                    <Badge variant="secondary" className="text-xs">{err.function_name}</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(err.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">{err.error_message_user}</p>
                <details className="mt-1">
                  <summary className="text-xs text-muted-foreground cursor-pointer">Dettagli tecnici</summary>
                  <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                    {err.error_message_technical}
                  </pre>
                </details>
              </div>

              {err.resolution_note && (
                <div className="text-sm bg-green-500/10 p-2 rounded border border-green-500/20">
                  <strong>Nota di risoluzione:</strong> {err.resolution_note}
                </div>
              )}

              <div className="flex flex-wrap items-end gap-2">
                {err.status !== "resolved" && (
                  <>
                    <Textarea
                      placeholder="Nota di risoluzione (opzionale)..."
                      className="flex-1 min-w-[200px] h-10 text-xs"
                      value={resolutionNotes[err.id] || ""}
                      onChange={(e) => setResolutionNotes((prev) => ({ ...prev, [err.id]: e.target.value }))}
                    />
                    {err.status === "new" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(err.id, "investigating")}>
                        In analisi
                      </Button>
                    )}
                    <Button size="sm" variant="default" onClick={() => updateStatus(err.id, "resolved")}>
                      Risolto
                    </Button>
                  </>
                )}
                {!err.archived_at && (
                  <Button size="sm" variant="ghost" onClick={() => archiveError(err.id)}>
                    <Archive className="h-4 w-4 mr-1" /> Archivia
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default AdminErrorsList;
