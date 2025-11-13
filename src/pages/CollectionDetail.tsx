import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Plus, X } from "lucide-react";
import { toast } from "sonner";
import CreateCollectionDialog from "@/components/CreateCollectionDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
}

interface Dream {
  id: string;
  title: string;
  content: string;
  dream_date: string;
  mood: string | null;
  image_url: string | null;
  tags: string[] | null;
}

const CollectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [allDreams, setAllDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDreamsDialogOpen, setAddDreamsDialogOpen] = useState(false);
  const [selectedDreams, setSelectedDreams] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
    fetchCollectionData();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchCollectionData = async () => {
    try {
      // Fetch collection details
      const { data: collectionData, error: collectionError } = await supabase
        .from("dream_collections")
        .select("*")
        .eq("id", id)
        .single();

      if (collectionError) throw collectionError;
      setCollection(collectionData);

      // Fetch dreams in this collection
      const { data: itemsData, error: itemsError } = await supabase
        .from("dream_collection_items")
        .select("dream_id")
        .eq("collection_id", id);

      if (itemsError) throw itemsError;

      const dreamIds = itemsData.map((item) => item.dream_id);

      if (dreamIds.length > 0) {
        const { data: dreamsData, error: dreamsError } = await supabase
          .from("dreams")
          .select("*")
          .in("id", dreamIds)
          .order("dream_date", { ascending: false });

        if (dreamsError) throw dreamsError;
        setDreams(dreamsData || []);
      }
    } catch (error: any) {
      toast.error("Errore nel caricamento");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDreams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dreamsData, error } = await supabase
        .from("dreams")
        .select("*")
        .eq("user_id", user.id)
        .order("dream_date", { ascending: false });

      if (error) throw error;
      setAllDreams(dreamsData || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleRemoveDream = async (dreamId: string) => {
    try {
      const { error } = await supabase
        .from("dream_collection_items")
        .delete()
        .eq("collection_id", id)
        .eq("dream_id", dreamId);

      if (error) throw error;

      toast.success("Sogno rimosso dalla collezione");
      fetchCollectionData();
    } catch (error: any) {
      toast.error("Errore nella rimozione");
      console.error(error);
    }
  };

  const handleAddDreams = async () => {
    try {
      const items = selectedDreams.map((dreamId) => ({
        collection_id: id,
        dream_id: dreamId,
      }));

      const { error } = await supabase
        .from("dream_collection_items")
        .insert(items);

      if (error) throw error;

      toast.success(`${selectedDreams.length} sogni aggiunti`);
      setAddDreamsDialogOpen(false);
      setSelectedDreams([]);
      fetchCollectionData();
    } catch (error: any) {
      toast.error("Errore nell'aggiunta");
      console.error(error);
    }
  };

  const openAddDreamsDialog = () => {
    fetchAllDreams();
    setAddDreamsDialogOpen(true);
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

  if (!collection) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p>Collezione non trovata</p>
        </div>
      </div>
    );
  }

  const availableDreams = allDreams.filter(
    (dream) => !dreams.some((d) => d.id === dream.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/collections")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alle Collezioni
        </Button>

        {collection.cover_image_url && (
          <div className="relative h-64 rounded-lg overflow-hidden mb-6">
            <img
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          </div>
        )}

        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-muted-foreground text-lg">
                {collection.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {dreams.length} {dreams.length === 1 ? "sogno" : "sogni"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Modifica
            </Button>
            <Button onClick={openAddDreamsDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Sogni
            </Button>
          </div>
        </div>

        {dreams.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Questa collezione è vuota
              </p>
              <Button onClick={openAddDreamsDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi Sogni
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dreams.map((dream) => (
              <Card
                key={dream.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden group relative"
                onClick={() => navigate(`/dreams/${dream.id}`)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveDream(dream.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>

                {dream.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={dream.image_url}
                      alt={dream.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {dream.content}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {dream.tags?.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateCollectionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchCollectionData}
        initialData={collection}
      />

      <Dialog open={addDreamsDialogOpen} onOpenChange={setAddDreamsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aggiungi Sogni alla Collezione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {availableDreams.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Nessun sogno disponibile da aggiungere
              </p>
            ) : (
              availableDreams.map((dream) => (
                <div
                  key={dream.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedDreams.includes(dream.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDreams([...selectedDreams, dream.id]);
                      } else {
                        setSelectedDreams(
                          selectedDreams.filter((id) => id !== dream.id)
                        );
                      }
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{dream.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {dream.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setAddDreamsDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              onClick={handleAddDreams}
              disabled={selectedDreams.length === 0}
            >
              Aggiungi {selectedDreams.length > 0 && `(${selectedDreams.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionDetail;
