import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Loader2, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { getTagColor } from "@/utils/tag-colors";
import { dreamCategories, getDreamCategories } from "@/utils/dream-categories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import { DreamCardSkeleton } from "@/components/ui/dream-skeleton";
import { AlchemicalBadge } from "@/components/AlchemicalBadge";
import { AlchemicalPhase } from "@/utils/alchemical-phases";
import { useDreamsList } from "@/hooks/useDreamsList";

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
  const {
    dreams,
    loading,
    loadingMore,
    isRefreshing: isDreamsRefreshing,
    totalCount,
    hasMore,
    loadMore,
    refresh,
  } = useDreamsList();

  const [filteredDreams, setFilteredDreams] = useState<any[]>(dreams);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");

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

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 break-words">I Miei Sogni</h1>
            <p className="text-white/60 flex items-center gap-2 text-sm">
              <span>{totalCount} {totalCount === 1 ? "sogno registrato" : "sogni registrati"}</span>
              {isDreamsRefreshing && (
                <Loader2 className="h-3 w-3 animate-spin text-white/40" />
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refresh({ force: true })}
                    disabled={isDreamsRefreshing}
                    aria-label="Aggiorna sogni"
                    className="text-white/40 hover:text-white hover:bg-white/10"
                  >
                    <RefreshCw className={`h-4 w-4 ${isDreamsRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-black/80 border-white/10 text-white backdrop-blur-md">Aggiorna</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={() => navigate("/dreams/new")} className="gap-2 bg-primary hover:bg-primary/80 text-white border-none shadow-[0_0_15px_rgba(var(--primary),0.3)]">
              <Plus className="h-4 w-4" />
              Nuovo Sogno
            </Button>
          </div>
        </div>

        {/* Barra di ricerca e filtri */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              placeholder="Cerca nei tuoi sogni..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-white/40 shrink-0" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="flex-1 min-w-[140px] sm:flex-none sm:w-[200px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Tutte le categorie" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10 text-white backdrop-blur-xl">
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {dreamCategories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color, boxShadow: `0 0 8px ${category.color}88` }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger className="flex-1 min-w-[130px] sm:flex-none sm:w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Tutte le fasi" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10 text-white backdrop-blur-xl">
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
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              {searchQuery ? (
                <p className="text-white/40">
                  Nessun sogno trovato per "{searchQuery}"
                </p>
              ) : (
                <>
                  <p className="text-white/40 mb-4">
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
                  className="group cursor-pointer overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-primary/50 hover:bg-white/10 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                >
                  {dream.image_url ? (
                    <div
                      className="aspect-video w-full overflow-hidden bg-black/20"
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
                      className="aspect-video w-full bg-gradient-to-br from-white/5 to-primary/5 flex items-center justify-center"
                      onClick={() => navigate(`/dreams/${dream.id}`)}
                    >
                      <div className="flex flex-col items-center gap-2 text-white/20 group-hover:text-primary/40 transition-colors">
                        <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Sogno</span>
                        <span className="text-3xl">✦</span>
                      </div>
                    </div>
                  )}

                  <CardHeader onClick={() => navigate(`/dreams/${dream.id}`)} className="cursor-pointer space-y-4 border-b border-white/5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
                          {String(index + 1).padStart(2, "0")} · Diario onirico
                        </p>
                        <CardTitle className="line-clamp-2 text-xl text-white group-hover:text-primary transition-colors">{dream.title}</CardTitle>
                      </div>
                      {dream.alchemical_phase && (
                        <AlchemicalBadge phase={dream.alchemical_phase as AlchemicalPhase} size="sm" />
                      )}
                    </div>
                    <p className="text-xs text-white/30 font-medium">
                      {format(new Date(dream.dream_date), "d MMMM yyyy", { locale: it })}
                    </p>
                  </CardHeader>

                  <CardContent onClick={() => navigate(`/dreams/${dream.id}`)} className="cursor-pointer space-y-4 pt-5">
                    <p className="line-clamp-4 text-sm leading-relaxed text-white/60">
                      {dream.content}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {dream.mood && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                          {dream.mood}
                        </span>
                      )}
                      {dream.tags?.slice(0, 4).map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full font-bold border ${getTagColor(tag)}`}
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
              <div className="mt-12 flex justify-center">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-8"
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
  );
};

export default MyDreams;
