import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const Dashboard = () => {
  const navigate = useNavigate();
  const [dreams, setDreams] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchDreams();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?mode=login");
    }
  };

  const fetchDreams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("dreams")
      .select("*")
      .eq("user_id", user.id)
      .order("dream_date", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Errore nel caricamento dei sogni:", error);
    } else {
      setDreams(data || []);
      
      // Calcola statistiche
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      setStats({
        total: data?.length || 0,
        thisWeek: data?.filter(d => new Date(d.created_at) > weekAgo).length || 0,
        thisMonth: data?.filter(d => new Date(d.created_at) > monthAgo).length || 0,
      });
    }
    setLoading(false);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pt-24 pb-12">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Benvenuto nel tuo diario dei sogni</p>
          </div>

          {/* Statistiche */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sogni Totali</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Questa Settimana</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.thisWeek}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Questo Mese</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.thisMonth}</div>
              </CardContent>
            </Card>
          </div>

          {/* Sogni recenti */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sogni Recenti</CardTitle>
                  <CardDescription>I tuoi ultimi sogni registrati</CardDescription>
                </div>
                <Button onClick={() => navigate("/dreams/new")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuovo Sogno
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Caricamento...</p>
              ) : dreams.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    Non hai ancora registrato nessun sogno
                  </p>
                  <Button onClick={() => navigate("/dreams/new")} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Crea il tuo primo sogno
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {dreams.map((dream) => (
                    <div
                      key={dream.id}
                      onClick={() => navigate(`/dreams/${dream.id}`)}
                      className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{dream.title}</h3>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(dream.dream_date), "d MMM yyyy", { locale: it })}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{dream.content}</p>
                      {dream.tags && dream.tags.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {dream.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => navigate("/my-dreams")}
                    className="w-full"
                  >
                    Vedi Tutti i Sogni
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
