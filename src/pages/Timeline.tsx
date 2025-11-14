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

interface Dream {
  id: string;
  title: string;
  content: string;
  dream_date: string;
  mood: string | null;
  image_url: string | null;
  tags: string[] | null;
}

type TimeFilter = "all" | "week" | "month" | "year";

const Timeline = () => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [filteredDreams, setFilteredDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchDreams();
  }, []);

  useEffect(() => {
    filterDreamsByTime();
  }, [timeFilter, dreams]);

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
    if (timeFilter === "all") {
      setFilteredDreams(dreams);
      return;
    }

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
        setFilteredDreams(dreams);
        return;
    }

    const filtered = dreams.filter((dream) => {
      const dreamDate = new Date(dream.dream_date);
      return isWithinInterval(dreamDate, { start, end });
    });

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Timeline dei Sogni</h1>
            <p className="text-muted-foreground">
              Esplora l'evoluzione dei tuoi sogni nel tempo
            </p>
          </div>
          <div className="flex items-center gap-4">
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
                  wrapperClass="!w-full !h-[calc(100vh-300px)] border rounded-lg bg-card/50"
                  contentClass="!w-full !h-full"
                >
                  <div className="relative p-8 min-h-full">
                    {/* Vertical timeline line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-primary" />

                    {/* Timeline items */}
                    <div className="space-y-12">
                      {groupedDreams.map(([monthYear, monthDreams], groupIndex) => (
                        <div key={monthYear} className="relative">
                          {/* Month header */}
                          <div className="absolute left-1/2 -translate-x-1/2 z-10">
                            <Badge
                              variant="secondary"
                              className="text-sm font-semibold px-4 py-2 bg-primary text-primary-foreground"
                            >
                              {monthYear}
                            </Badge>
                          </div>

                          {/* Dreams in this month */}
                          <div className="mt-12 space-y-8">
                            {monthDreams.map((dream, index) => {
                              const isLeft = index % 2 === 0;
                              return (
                                <div
                                  key={dream.id}
                                  className={`relative flex ${
                                    isLeft ? "justify-start" : "justify-end"
                                  }`}
                                >
                                  {/* Connector dot */}
                                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 rounded-full bg-primary border-4 border-background" />
                                  </div>

                                  {/* Dream card */}
                                  <Card
                                    className={`w-[45%] cursor-pointer hover:shadow-xl transition-all duration-300 ${
                                      isLeft ? "mr-[55%]" : "ml-[55%]"
                                    }`}
                                    onClick={() => navigate(`/dreams/${dream.id}`)}
                                  >
                                    {dream.image_url && (
                                      <div className="h-32 overflow-hidden rounded-t-lg">
                                        <img
                                          src={dream.image_url}
                                          alt={dream.title}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    <CardContent className="p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-lg line-clamp-1">
                                          {dream.title}
                                        </h3>
                                        {dream.mood && (
                                          <Badge variant="secondary">{dream.mood}</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        {format(new Date(dream.dream_date), "d MMMM yyyy", {
                                          locale: it,
                                        })}
                                      </p>
                                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                        {dream.content}
                                      </p>
                                      <div className="flex flex-wrap gap-1">
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
