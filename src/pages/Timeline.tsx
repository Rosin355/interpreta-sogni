import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, isWithinInterval } from "date-fns";
import { it } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlchemicalBadge } from "@/components/AlchemicalBadge";
import { AlchemicalPhase } from "@/utils/alchemical-phases";

interface Dream {
  id: string;
  title: string;
  content: string;
  dream_date: string;
  mood: string | null;
  image_url: string | null;
  tags: string[] | null;
  alchemical_phase: string | null;
}

type TimeFilter = "all" | "week" | "month" | "year";

const Timeline = () => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [filteredDreams, setFilteredDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchDreams();
  }, []);

  useEffect(() => {
    filterDreamsByTime();
  }, [timeFilter, selectedPhase, dreams]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchDreams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("dreams")
        .select("*")
        .eq("user_id", user.id)
        .order("dream_date", { ascending: true });

      if (error) throw error;
      setDreams(data || []);
      setFilteredDreams(data || []);
    } catch (error: any) {
      toast.error("Errore nel caricamento dei sogni");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterDreamsByTime = () => {
    let filtered = dreams;

    // Filtro temporale
    if (timeFilter !== "all") {
      const now = new Date();
      let start: Date;
      let end: Date;

      switch (timeFilter) {
        case "week":
          start = startOfWeek(now, { locale: it });
          end = endOfWeek(now, { locale: it });
          break;
        case "month":
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case "year":
          start = startOfYear(now);
          end = endOfYear(now);
          break;
        default:
          break;
      }

      if (start! && end!) {
        filtered = filtered.filter((dream) => {
          const dreamDate = new Date(dream.dream_date);
          return isWithinInterval(dreamDate, { start, end });
        });
      }
    }

    // Filtro per fase alchemica
    if (selectedPhase !== "all") {
      filtered = filtered.filter(dream => dream.alchemical_phase === selectedPhase);
    }

    setFilteredDreams(filtered);
  };

  const groupDreamsByMonth = () => {
    const groups: { [key: string]: Dream[] } = {};

    filteredDreams.forEach((dream) => {
      const monthYear = format(new Date(dream.dream_date), "MMMM yyyy", { locale: it });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(dream);
    });

    return Object.entries(groups).sort((a, b) => {
      return new Date(a[1][0].dream_date).getTime() - new Date(b[1][0].dream_date).getTime();
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
        <Navigation />
        <div className="container mx-auto px-4 py-8" style={{ marginTop: 'calc(5rem + var(--safe-area-inset-top, 0px))' }}>
          <div className="animate-pulse">Caricamento...</div>
        </div>
      </div>
    );
  }

  const groupedDreams = groupDreamsByMonth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <Navigation />
      <div className="container mx-auto px-4 py-8" style={{ marginTop: 'calc(5rem + var(--safe-area-inset-top, 0px))' }}>
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Timeline dei Sogni</h1>
            <p className="text-muted-foreground">
              Esplora l'evoluzione dei tuoi sogni nel tempo
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={timeFilter} onValueChange={(value: TimeFilter) => setTimeFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i sogni</SelectItem>
                  <SelectItem value="week">Questa settimana</SelectItem>
                  <SelectItem value="month">Questo mese</SelectItem>
                  <SelectItem value="year">Quest'anno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tutte le fasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le fasi</SelectItem>
                <SelectItem value="nigredo">Nigredo</SelectItem>
                <SelectItem value="albedo">Albedo</SelectItem>
                <SelectItem value="rubedo">Rubedo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredDreams.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <p className="text-muted-foreground">
                Nessun sogno trovato per il periodo selezionato
              </p>
            </CardContent>
          </Card>
        ) : (
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={3}
            centerOnInit
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" size="icon" onClick={() => zoomIn()}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => zoomOut()}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => resetTransform()}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>

                <TransformComponent
                  wrapperClass="!w-full !h-[calc(100vh-300px)] border border-border/80 rounded-lg bg-card/50"
                  contentClass="!w-full !h-full"
                >
                  <div className="relative min-h-full p-8">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-[linear-gradient(180deg,hsl(var(--primary)/0.7)_0%,hsl(var(--accent)/0.35)_50%,hsl(var(--primary)/0.7)_100%)]" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-16 -translate-x-1/2 bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,transparent_72%)] blur-2xl" />

                    <div className="space-y-12">
                      {groupedDreams.map(([monthYear, monthDreams], groupIndex) => (
                        <div key={monthYear} className="relative">
                          <div className="absolute left-1/2 z-10 -translate-x-1/2">
                            <Badge
                              variant="outline"
                              className="border-primary/30 bg-card/90 px-4 py-2 text-sm font-medium uppercase tracking-[0.22em] text-foreground"
                            >
                              {monthYear}
                            </Badge>
                          </div>

                          <div className="mt-14 space-y-10">
                            {monthDreams.map((dream, index) => {
                              const isLeft = index % 2 === 0;
                              return (
                                <div
                                  key={dream.id}
                                  className={`relative flex ${isLeft ? "justify-start" : "justify-end"}`}
                                >
                                  <div className="absolute left-1/2 top-10 -translate-x-1/2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-card text-xs text-primary shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
                                      ✦
                                    </div>
                                  </div>

                                  <Card
                                    className={`group w-[45%] cursor-pointer overflow-hidden border-border/80 bg-card/75 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_60px_hsl(var(--background)/0.35)] ${
                                      isLeft ? "mr-[55%]" : "ml-[55%]"
                                    }`}
                                    onClick={() => navigate(`/dreams/${dream.id}`)}
                                  >
                                    {dream.image_url && (
                                      <div className="h-32 overflow-hidden rounded-t-lg">
                                        <img
                                          src={dream.image_url}
                                          alt={dream.title}
                                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                        />
                                      </div>
                                    )}
                                    <CardContent className="space-y-4 p-5">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="mb-2 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                                            {String(index + 1).padStart(2, "0")} · Traccia onirica
                                          </p>
                                          <h3 className="line-clamp-1 text-lg font-semibold">{dream.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          {dream.alchemical_phase && (
                                            <AlchemicalBadge
                                              phase={dream.alchemical_phase as AlchemicalPhase}
                                              size="sm"
                                              showIcon={false}
                                            />
                                          )}
                                        </div>
                                      </div>

                                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                        {format(new Date(dream.dream_date), "d MMMM yyyy", {
                                          locale: it,
                                        })}
                                      </p>

                                      <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                                        {dream.content}
                                      </p>

                                      <div className="flex flex-wrap items-center gap-2">
                                        {dream.mood && (
                                          <Badge variant="outline" className="border-border bg-background/50 text-muted-foreground">
                                            {dream.mood}
                                          </Badge>
                                        )}
                                        {dream.tags?.slice(0, 3).map((tag, tagIndex) => (
                                          <Badge
                                            key={tagIndex}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
      </div>
    </div>
  );
};

export default Timeline;
