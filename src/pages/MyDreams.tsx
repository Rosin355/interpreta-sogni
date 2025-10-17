import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const MyDreams = () => {
  const navigate = useNavigate();
  const [dreams, setDreams] = useState<any[]>([]);
  const [filteredDreams, setFilteredDreams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchDreams();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = dreams.filter(
        (dream) =>
          dream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dream.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dream.tags?.some((tag: string) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
      setFilteredDreams(filtered);
    } else {
      setFilteredDreams(dreams);
    }
  }, [searchQuery, dreams]);

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

          {/* Barra di ricerca */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cerca nei tuoi sogni..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
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
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
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
