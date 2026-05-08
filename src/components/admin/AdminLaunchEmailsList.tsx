import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logSuperAdminAccess } from "@/utils/audit-logger";

interface Row {
  id: string;
  user_id: string;
  email: string | null;
  wants_updates: boolean;
  acknowledged_at: string;
}

const AdminLaunchEmailsList = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("launch_announcement_acknowledgments")
        .select("id, user_id, email, wants_updates, acknowledged_at")
        .order("acknowledged_at", { ascending: false });
      setRows((data as Row[]) || []);
      setLoading(false);
      await logSuperAdminAccess(
        "profiles",
        "view_launch_acknowledgments",
        undefined,
        { count: data?.length ?? 0 }
      );
    })();
  }, []);

  const subscribers = rows.filter((r) => r.email && r.wants_updates);

  const exportCsv = () => {
    const header = "email,wants_updates,acknowledged_at,user_id\n";
    const body = rows
      .map(
        (r) =>
          `${r.email ?? ""},${r.wants_updates},${r.acknowledged_at},${r.user_id}`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `launch-acknowledgments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Pre-Lancio</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} prese visione · {subscribers.length} iscritti alla newsletter
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Esporta CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nessuna presa visione registrata.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate font-medium">
                    {r.email || <span className="text-muted-foreground italic">— nessuna email —</span>}
                  </span>
                  {r.wants_updates && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                      Newsletter
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                  {r.user_id}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(r.acknowledged_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default AdminLaunchEmailsList;
