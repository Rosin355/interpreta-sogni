import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Trash2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DreamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dream, setDream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [interpretationLoading, setInterpretationLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchDream();
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?mode=login");
    }
  };

  const fetchDream = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("dreams")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Errore nel caricamento del sogno:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il sogno",
        variant: "destructive",
      });
      navigate("/my-dreams");
    } else {
      setDream(data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("dreams").delete().eq("id", id);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il sogno",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Successo",
        description: "Sogno eliminato con successo",
      });
      navigate("/my-dreams");
    }
  };

  const handleInterpret = async () => {
    setInterpretationLoading(true);
    
    // Placeholder per futura implementazione AI
    toast({
      title: "Funzionalità in arrivo",
      description: "L'interpretazione AI sarà disponibile presto!",
    });
    
    setInterpretationLoading(false);
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pt-24 pb-12">
          <div className="container mx-auto px-6">
            <p className="text-center text-muted-foreground">Caricamento...</p>
          </div>
        </div>
      </>
    );
  }

  if (!dream) return null;

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pt-24 pb-12">
        <div className="container mx-auto px-6 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/my-dreams")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna ai Miei Sogni
          </Button>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{dream.title}</CardTitle>
                  <p className="text-muted-foreground">
                    {format(new Date(dream.dream_date), "d MMMM yyyy", { locale: it })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/dreams/${id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
                        <AlertDialogDescription>
                          Sei sicuro di voler eliminare questo sogno? Questa azione non può
                          essere annullata.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                          Elimina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {dream.mood && (
                <div>
                  <h3 className="font-semibold mb-2">Umore</h3>
                  <p className="text-muted-foreground">{dream.mood}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Descrizione</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{dream.content}</p>
              </div>

              {dream.tags && dream.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Tag</h3>
                  <div className="flex flex-wrap gap-2">
                    {dream.tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interpretazione AI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Interpretazione AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dream.interpretation ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {dream.interpretation}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Non hai ancora richiesto un'interpretazione per questo sogno
                  </p>
                  <Button
                    onClick={handleInterpret}
                    disabled={interpretationLoading}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {interpretationLoading
                      ? "Interpretazione in corso..."
                      : "Interpreta con AI"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default DreamDetail;
