import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Eye, Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PublicDream {
  id: string;
  title: string;
  content: string;
  dream_date: string;
  mood: string | null;
  image_url: string | null;
  tags: string[] | null;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface PublicCollection {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  user_id: string;
  dream_count?: number;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

export default function Explore() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dreams, setDreams] = useState<PublicDream[]>([]);
  const [collections, setCollections] = useState<PublicCollection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dreams");

  useEffect(() => {
    fetchPublicContent();
  }, []);

  const fetchPublicContent = async () => {
    try {
      setLoading(true);

      // Fetch public dreams (no join to profiles since there's no FK and profiles has restrictive RLS)
      const { data: dreamsData, error: dreamsError } = await supabase
        .from("dreams")
        .select("*")
        .eq("visibility", "public")
        .eq("is_private", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (dreamsError) throw dreamsError;
      setDreams(dreamsData as any || []);

      // Collections are not public yet, placeholder for future
      setCollections([]);
    } catch (error: any) {
      toast.error("Errore nel caricamento dei contenuti");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDreams = dreams.filter(
    (dream) =>
      dream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dream.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dream.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Esplora</h1>
            <p className="text-muted-foreground">
              Scopri sogni e collezioni condivise dalla community
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca sogni per titolo, contenuto o tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="dreams">
                Sogni ({filteredDreams.length})
              </TabsTrigger>
              <TabsTrigger value="collections">
                Collezioni ({collections.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dreams" className="space-y-4 mt-6">
              {filteredDreams.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "Nessun sogno trovato con la ricerca corrente"
                        : "Non ci sono ancora sogni pubblici da esplorare"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredDreams.map((dream) => (
                    <Card
                      key={dream.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                      onClick={() => navigate(`/dreams/${dream.id}`)}
                    >
                      {dream.image_url && (
                        <div className="aspect-video w-full overflow-hidden">
                          <img
                            src={dream.image_url}
                            alt={dream.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={dream.profiles?.avatar_url || ""} />
                            <AvatarFallback>
                              {dream.profiles?.username?.slice(0, 2).toUpperCase() || "AN"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {dream.profiles?.username || "Anonimo"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(dream.dream_date), "d MMM yyyy", { locale: it })}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                            {dream.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {dream.content}
                          </p>
                        </div>

                        {dream.tags && dream.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {dream.tags.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {dream.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{dream.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>Pubblico</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="collections" className="mt-6">
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">
                    Le collezioni pubbliche saranno disponibili presto
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
