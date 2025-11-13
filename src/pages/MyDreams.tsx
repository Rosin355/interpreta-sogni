import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { getTagColor } from "@/utils/tag-colors";
import { dreamCategories, getDreamCategories } from "@/utils/dream-categories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MyDreams = () => {
  const navigate = useNavigate();
  const [dreams, setDreams] = useState<any[]>([]);
  const [filteredDreams, setFilteredDreams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchDreams();
  }, []);

  useEffect(() => {
    let filtered = dreams;

    // Filtro per categoria
    if (selectedCategory !== "all") {
      filtered = filtered.filter(dream => {
        if (!dream.tags || dream.tags.length === 0) {
          return selectedCategory === "other";
        }
        const categories = getDreamCategories(dream.tags);
        return categories.some(cat => cat.id === selectedCategory);
      });
    }

    // Filtro per ricerca
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
  }, [searchQuery, selectedCategory, dreams]);

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
      .order("dream_date", { ascending: false });

    if (error) {
      console.error("Errore nel caricamento dei sogni:", error);
    } else {
      setDreams(data || []);
      setFilteredDreams(data || []);
    }
    setLoading(false);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pt-24 pb-12">
        <div className="container mx-auto px-6">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">I Miei Sogni</h1>
              <p className="text-muted-foreground">
                {dreams.length} {dreams.length === 1 ? "sogno registrato" : "sogni registrati"}
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
            </div>
          </div>

          {/* Lista sogni */}
          {loading ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center">Caricamento...</p>
              </CardContent>
            </Card>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDreams.map((dream) => (
                <Card
                  key={dream.id}
                  onClick={() => navigate(`/dreams/${dream.id}`)}
                  className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Thumbnail Immagine */}
                  {dream.image_url ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={dream.image_url}
                        alt={dream.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                      <div className="text-muted-foreground/30">
                        <svg
                          className="w-16 h-16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{dream.title}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(dream.dream_date), "d MMMM yyyy", { locale: it })}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3 mb-3">
                      {dream.content}
                    </p>
                    {dream.mood && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Umore: <span className="font-medium">{dream.mood}</span>
                      </p>
                    )}
                    {dream.tags && dream.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {dream.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all duration-300 hover:scale-105 hover:animate-pulse ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MyDreams;
