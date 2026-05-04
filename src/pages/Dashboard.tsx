import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NotificationManager from "@/components/NotificationManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, TrendingUp, Calendar, Download, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { dreamCategories, categorizeDreams, getCategoryFromTag } from "@/utils/dream-categories";
import { calculateInsights, getTemporalData } from "@/utils/dream-insights";
import { exportDashboardToPDF } from "@/utils/pdf-export";
import { DreamDiaryExport } from "@/components/DreamDiaryExport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/dream-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { AlchemicalJourneyMap } from "@/components/AlchemicalJourneyMap";
import { AlchemicalTransitionsList } from "@/components/AlchemicalTransitionsList";
import { calculateUserJourney, type UserJourney } from "@/utils/alchemical-phases";

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
  const [journey, setJourney] = useState<UserJourney | null>(null);

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // DEBUG: Log autenticazione
    console.log('[Dashboard] DEBUG Auth:', {
      hasUser: !!user,
      userId: user?.id,
      expectedUserId: 'c4547d62-ee36-463d-8ce3-077310e2c6ac',
      isMatch: user?.id === 'c4547d62-ee36-463d-8ce3-077310e2c6ac',
      authError: authError?.message
    });
    
    if (!user) return;

    // Unified query - fetch all dreams and slice for recent
    const { data: allData, error } = await supabase
      .from("dreams")
      .select("*")
      .eq("user_id", user.id)
      .order("dream_date", { ascending: false });

    // DEBUG: Log query risultati
    console.log('[Dashboard] DEBUG Dreams Query:', {
      dreamsCount: allData?.length || 0,
      error: error?.message,
      errorCode: (error as any)?.code,
      errorDetails: (error as any)?.details,
      firstDreamTitle: allData?.[0]?.title,
      queryUserId: user.id
    });

    if (error) {
      console.error("Errore nel caricamento dei sogni:", error);
    } else {
      setAllDreams(allData || []);
      setDreams(allData?.slice(0, 5) || []);
      
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
      
      // Calcola percorso alchemico
      if (allData && allData.length > 0) {
        const userJourney = calculateUserJourney(allData);
        setJourney(userJourney);
      }
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
    <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-white/60">Benvenuto nel tuo diario dei sogni</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleExportPDF} 
              disabled={exporting || allDreams.length === 0}
              className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white"
              size="default"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{exporting ? "Esportazione..." : "Report"}</span>
            </Button>
            {allDreams.length > 0 && (
              <DreamDiaryExport 
                mode="all" 
                allDreams={allDreams}
                triggerLabel="Diario"
              />
            )}
          </div>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Sogni Totali</CardTitle>
                  <BookOpen className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Questa Settimana</CardTitle>
                  <TrendingUp className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.thisWeek}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Questo Mese</CardTitle>
                  <Calendar className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.thisMonth}</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Percorso Alchemico */}
        {!loading && journey && allDreams.length > 0 && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Il Tuo Percorso Alchemico</CardTitle>
              <CardDescription className="text-white/60">
                Una lettura sintetica della fase che stai attraversando.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AlchemicalJourneyMap
                currentPhase={journey.currentPhase}
                distribution={journey.distribution}
                compact={true}
              />
              <AlchemicalTransitionsList transitions={journey.transitions} compact={true} />
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => navigate("/alchemy")}
                  className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white"
                >
                  Esplora il Tuo Viaggio Completo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insights */}
        {!loading && insights.length > 0 && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <CardTitle className="text-white">Insights</CardTitle>
              </div>
              <CardDescription className="text-white/60">Scopri pattern interessanti nei tuoi sogni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border backdrop-blur-md ${
                      insight.type === 'positive'
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : insight.type === 'warning'
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-primary/10 border-primary/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{insight.icon}</span>
                      <div>
                        <h4 className="font-semibold mb-1 text-white">{insight.title}</h4>
                        <p className="text-sm text-white/60">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notification Manager */}
        <div className="mb-8">
          <NotificationManager />
        </div>

        {/* Analisi Categorie Sogni */}
        {loading ? (
          <ChartSkeleton />
        ) : allDreams.length > 0 && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm" id="category-chart">
            <CardHeader>
              <CardTitle className="text-white">Distribuzione Tipi di Sogni</CardTitle>
              <CardDescription className="text-white/60">Analisi delle categorie dei tuoi sogni</CardDescription>
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
                          backgroundColor: 'rgba(0,0,0,0.8)', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '0.75rem',
                          backdropFilter: 'blur(10px)'
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
                      <div key={id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color, boxShadow: `0 0 10px ${category.color}` }}
                          />
                          <span className="font-medium text-white/80">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">{count}</div>
                          <div className="text-xs text-white/40">{percentage}%</div>
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
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm" id="temporal-chart">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Evoluzione Temporale</CardTitle>
                  <CardDescription className="text-white/60">Come sono cambiati i tuoi sogni nel tempo</CardDescription>
                </div>
                <Select value={temporalPeriod} onValueChange={(value: any) => setTemporalPeriod(value)}>
                  <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10 text-white backdrop-blur-xl">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fill: 'rgba(255,255,255,0.4)' }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fill: 'rgba(255,255,255,0.4)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      backdropFilter: 'blur(10px)'
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
                      radius={[2, 2, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Sogni recenti */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Sogni Recenti</CardTitle>
                <CardDescription className="text-white/60">I tuoi ultimi sogni registrati</CardDescription>
              </div>
              <Button onClick={() => navigate("/dreams/new")} className="gap-2 bg-primary hover:bg-primary/80 text-white border-none shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                <Plus className="h-4 w-4" />
                Nuovo Sogno
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full bg-white/5" />
                ))}
              </div>
            ) : dreams.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 mb-4">
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
                    className="p-4 border border-white/10 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-white group-hover:text-primary transition-colors">{dream.title}</h3>
                      <span className="text-sm text-white/40">
                        {format(new Date(dream.dream_date), "d MMM yyyy", { locale: it })}
                      </span>
                    </div>
                    <p className="text-white/60 line-clamp-2">{dream.content}</p>
                    {dream.tags && dream.tags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {dream.tags.slice(0, 3).map((tag: string, idx: number) => {
                          const category = getCategoryFromTag(tag);
                          return (
                            <span
                              key={idx}
                              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border"
                              style={{
                                backgroundColor: `${category.color}22`,
                                color: category.color,
                                borderColor: `${category.color}44`
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
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white mt-4"
                >
                  Vedi Tutti i Sogni
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
};

export default Dashboard;
