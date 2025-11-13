import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import CreateCollectionDialog from "@/components/CreateCollectionDialog";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  dream_count?: number;
}

const Collections = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchCollections();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchCollections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: collectionsData, error: collectionsError } = await supabase
        .from("dream_collections" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (collectionsError) throw collectionsError;

      // Fetch dream counts for each collection
      const collectionsWithCounts = await Promise.all(
        (collectionsData || []).map(async (collection: any) => {
          const { count } = await supabase
            .from("dream_collection_items" as any)
            .select("*", { count: "exact", head: true })
            .eq("collection_id", collection.id);

          return { ...collection, dream_count: count || 0 };
        })
      );

      setCollections(collectionsWithCounts as any);
    } catch (error: any) {
      toast.error("Errore nel caricamento delle collezioni");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Sei sicuro di voler eliminare questa collezione?")) return;

    try {
      const { error } = await supabase
        .from("dream_collections" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Collezione eliminata");
      fetchCollections();
    } catch (error: any) {
      toast.error("Errore nell'eliminazione");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <Navigation />
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Le Mie Collezioni</h1>
            <p className="text-muted-foreground">
              Organizza i tuoi sogni in album tematici
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nuova Collezione
          </Button>
        </div>

        {collections.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Nessuna collezione ancora</h3>
              <p className="text-muted-foreground mb-6">
                Crea la tua prima collezione per organizzare i sogni
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crea Collezione
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden group"
                onClick={() => navigate(`/collections/${collection.id}`)}
              >
                {collection.cover_image_url ? (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={collection.cover_image_url}
                      alt={collection.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <FolderOpen className="h-16 w-16 text-primary/40" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{collection.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {collection.description || "Nessuna descrizione"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(collection.id, e)}
                      className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {collection.dream_count} {collection.dream_count === 1 ? "sogno" : "sogni"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateCollectionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchCollections}
      />
    </div>
  );
};

export default Collections;
