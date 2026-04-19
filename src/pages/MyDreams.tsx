import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { getTagColor } from "@/utils/tag-colors";
import { dreamCategories, getDreamCategories } from "@/utils/dream-categories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import { DreamCardSkeleton } from "@/components/ui/dream-skeleton";
import { AlchemicalBadge } from "@/components/AlchemicalBadge";
import { AlchemicalPhase } from "@/utils/alchemical-phases";

const PAGE_SIZE = 12;

const DreamImage = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
};

const MyDreams = () => {
  const navigate = useNavigate();
  const [dreams, setDreams] = useState<any[]>([]);
  const [filteredDreams, setFilteredDreams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let filtered = dreams;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(dream => {
        if (!dream.tags || dream.tags.length === 0) {
          return selectedCategory === "other";
        }
        const categories = getDreamCategories(dream.tags);
        return categories.some(cat => cat.id === selectedCategory);
      });
    }

    if (selectedPhase !== "all") {
      filtered = filtered.filter(dream => dream.alchemical_phase === selectedPhase);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (dream) =>
          dream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dream.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dream.tags?.some((tag: string) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    setFilteredDreams(filtered);
  }, [searchQuery, selectedCategory, selectedPhase, dreams]);

  const SELECT_FIELDS = "id, title, dream_date, mood, tags, image_url, alchemical_phase, content";

  const fetchInitial = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?mode=login");
      return;
    }

    // Conteggio totale in parallelo con la prima pagina
    const [countRes, pageRes] = await Promise.all([
      supabase
        .from("dreams")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("dreams")
        .select(SELECT_FIELDS)
        .eq("user_id", user.id)
        .order("dream_date", { ascending: false })
        .range(0, PAGE_SIZE - 1),
    ]);

    if (pageRes.error) {
      console.error("Errore nel caricamento dei sogni:", pageRes.error);
    } else {
      const data = pageRes.data || [];
      setDreams(data);
      setFilteredDreams(data);
      setOffset(data.length);
      setHasMore(data.length === PAGE_SIZE);
    }

    if (!countRes.error) {
      setTotalCount(countRes.count || 0);
    }

    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?mode=login");
      return;
    }

    const { data, error } = await supabase
      .from("dreams")
      .select(SELECT_FIELDS)
      .eq("user_id", user.id)
      .order("dream_date", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Errore nel caricamento ulteriore:", error);
    } else {
      const batch = data || [];
      setDreams(prev => [...prev, ...batch]);
      setOffset(prev => prev + batch.length);
      setHasMore(batch.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pb-12" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
        <div className="container mx-auto px-6">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">I Miei Sogni</h1>
              <p className="text-muted-foreground">
                {totalCount} {totalCount === 1 ? "sogno registrato" : "sogni registrati"}
              </p>
            </div>
            <Button onClick={() => navigate("/dreams/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuovo Sogno
            </Button>
          </div>

          {/* Barra di ricerca e filtri */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cerca nei tuoi sogni..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tutte le categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {dreamCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Lista sogni */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <DreamCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredDreams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                {searchQuery ? (
                  <p className="text-muted-foreground">
                    Nessun sogno trovato per "{searchQuery}"
                  </p>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Non hai ancora registrato nessun sogno
                    </p>
                    <Button onClick={() => navigate("/dreams/new")} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Crea il tuo primo sogno
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDreams.map((dream, index) => (
                  <Card
                    key={dream.id}
                    className="group cursor-pointer overflow-hidden border-border/80 bg-card/70 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_60px_hsl(var(--background)/0.35)]"
                  >
                    {dream.image_url ? (
                      <div
                        className="aspect-video w-full overflow-hidden bg-muted"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('.image-zoom-wrapper')) {
                            e.stopPropagation();
                          } else {
                            navigate(`/dreams/${dream.id}`);
                          }
                        }}
                      >
                        <div className="image-zoom-wrapper h-full w-full">
                          <ImageZoomModal src={dream.image_url} alt={dream.title}>
                            <DreamImage src={dream.image_url} alt={dream.title} />
                          </ImageZoomModal>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="aspect-video w-full bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--dream-space)/0.75)_100%)] flex items-center justify-center"
                        onClick={() => navigate(`/dreams/${dream.id}`)}
                      >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                          <span className="text-xs uppercase tracking-[0.32em]">Sogno</span>
                          <span className="text-3xl">✦</span>
                        </div>
                      </div>
                    )}

                    <CardHeader onClick={() => navigate(`/dreams/${dream.id}`)} className="cursor-pointer space-y-4 border-b border-border/60">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="mb-2 text-xs uppercase tracking-[0.32em] text-muted-foreground">
                            {String(index + 1).padStart(2, "0")} · Diario onirico
                          </p>
                          <CardTitle className="line-clamp-2 text-xl">{dream.title}</CardTitle>
                        </div>
                        {dream.alchemical_phase && (
                          <AlchemicalBadge phase={dream.alchemical_phase as AlchemicalPhase} size="sm" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(dream.dream_date), "d MMMM yyyy", { locale: it })}
                      </p>
                    </CardHeader>

                    <CardContent onClick={() => navigate(`/dreams/${dream.id}`)} className="cursor-pointer space-y-4 pt-5">
                      <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
                        {dream.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {dream.mood && (
                          <span className="rounded-full border border-border bg-background/50 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            {dream.mood}
                          </span>
                        )}
                        {dream.tags?.slice(0, 4).map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium border ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <Button
                    onClick={loadMore}
                    disabled={loadingMore}
                    variant="outline"
                    className="gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Caricamento...
                      </>
                    ) : (
                      "Carica altri sogni"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default MyDreams;
