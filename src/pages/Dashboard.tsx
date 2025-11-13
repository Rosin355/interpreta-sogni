import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, TrendingUp, Calendar, Download, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { dreamCategories, categorizeDreams } from "@/utils/dream-categories";
import { calculateInsights, getTemporalData } from "@/utils/dream-insights";
import { exportDashboardToPDF } from "@/utils/pdf-export";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dreams, setDreams] = useState<any[]>([]);
  const [allDreams, setAllDreams] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [temporalPeriod, setTemporalPeriod] = useState<'30d' | '3m' | '6m' | '1y'>('30d');
  const [insights, setInsights] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

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

    // Fetch ultimi 5 sogni per la sezione recenti
    const { data: recentData, error: recentError } = await supabase
      .from("dreams")
      .select("*")
      .eq("user_id", user.id)
      .order("dream_date", { ascending: false })
      .limit(5);

    // Fetch tutti i sogni per le statistiche
    const { data: allData, error: allError } = await supabase
      .from("dreams")
      .select("*")
      .eq("user_id", user.id);

    if (recentError || allError) {
      console.error("Errore nel caricamento dei sogni:", recentError || allError);
    } else {
      setDreams(recentData || []);
      setAllDreams(allData || []);
      
      // Calcola statistiche
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      setStats({
        total: allData?.length || 0,
        thisWeek: allData?.filter(d => new Date(d.created_at) > weekAgo).length || 0,
        thisMonth: allData?.filter(d => new Date(d.created_at) > monthAgo).length || 0,
      });
      
      // Calcola insights
      setInsights(calculateInsights(allData || []));
    }
    setLoading(false);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const categoryData = categorizeDreams(allDreams);
      await exportDashboardToPDF('Utente', stats, categoryData, insights);
      toast({
        title: "Report esportato!",
        description: "Il tuo report PDF è stato scaricato con successo.",
      });
    } catch (error) {
      console.error('Errore export PDF:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'esportazione del report.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pt-24 pb-12">
        <div className="container mx-auto px-6">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
              <p className="text-muted-foreground">Benvenuto nel tuo diario dei sogni</p>
            </div>
            <Button 
              onClick={handleExportPDF} 
              disabled={exporting || allDreams.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Esportazione..." : "Esporta Report PDF"}
            </Button>
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

          {/* Insights */}
          {!loading && insights.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle>Insights</CardTitle>
                </div>
                <CardDescription>Scopri pattern interessanti nei tuoi sogni</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        insight.type === 'positive'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : insight.type === 'warning'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-primary/10 border-primary/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{insight.icon}</span>
                        <div>
                          <h4 className="font-semibold mb-1">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analisi Categorie Sogni */}
          {!loading && allDreams.length > 0 && (
            <Card className="mb-8" id="category-chart">
              <CardHeader>
                <CardTitle>Distribuzione Tipi di Sogni</CardTitle>
                <CardDescription>Analisi delle categorie dei tuoi sogni</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-full md:w-1/2">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(categorizeDreams(allDreams)).map(([id, count]) => {
                            const category = dreamCategories.find(c => c.id === id) || dreamCategories[dreamCategories.length - 1];
                            return {
                              name: category.name,
                              value: count,
                              color: category.color
                            };
                          })}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(categorizeDreams(allDreams)).map(([id], index) => {
                            const category = dreamCategories.find(c => c.id === id) || dreamCategories[dreamCategories.length - 1];
                            return <Cell key={`cell-${index}`} fill={category.color} />;
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 space-y-3">
                    {Object.entries(categorizeDreams(allDreams)).map(([id, count]) => {
                      const category = dreamCategories.find(c => c.id === id) || dreamCategories[dreamCategories.length - 1];
                      const percentage = ((count / allDreams.length) * 100).toFixed(1);
                      return (
                        <div key={id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{count}</div>
                            <div className="text-xs text-muted-foreground">{percentage}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evoluzione Temporale */}
          {!loading && allDreams.length > 0 && (
            <Card className="mb-8" id="temporal-chart">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Evoluzione Temporale</CardTitle>
                    <CardDescription>Come sono cambiati i tuoi sogni nel tempo</CardDescription>
                  </div>
                  <Select value={temporalPeriod} onValueChange={(value: any) => setTemporalPeriod(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
                      <SelectItem value="3m">Ultimi 3 mesi</SelectItem>
                      <SelectItem value="6m">Ultimi 6 mesi</SelectItem>
                      <SelectItem value="1y">Ultimo anno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getTemporalData(allDreams, temporalPeriod)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Legend />
                    {dreamCategories.map(category => (
                      <Bar 
                        key={category.id} 
                        dataKey={category.id} 
                        stackId="a"
                        fill={category.color}
                        name={category.name}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

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
                          {dream.tags.slice(0, 3).map((tag: string, idx: number) => {
                            const { getCategoryFromTag } = require("@/utils/dream-categories");
                            const category = getCategoryFromTag(tag);
                            return (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 rounded font-medium border"
                                style={{
                                  backgroundColor: `${category.color}33`,
                                  color: category.color,
                                  borderColor: `${category.color}66`
                                }}
                              >
                                {tag}
                              </span>
                            );
                          })}
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
