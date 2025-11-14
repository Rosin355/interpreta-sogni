import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTagColor } from "@/utils/tag-colors";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Trash2, Sparkles, Image as ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { VoiceNoteRecorder } from "@/components/VoiceNoteRecorder";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const DreamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dream, setDream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [interpretationLoading, setInterpretationLoading] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [regenerateStyle, setRegenerateStyle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

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
    if (!id) return;
    
    setInterpretationLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('interpret-dream', {
        body: { dreamId: id }
      });

      if (error) {
        console.error('Errore nell\'interpretazione:', error);
        toast({
          title: "Errore",
          description: error.message || "Impossibile interpretare il sogno",
          variant: "destructive",
        });
      } else if (data?.interpretation) {
        setDream({ ...dream, interpretation: data.interpretation });
        toast({
          title: "Successo",
          description: "Interpretazione generata con successo!",
        });
      }
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'interpretazione",
        variant: "destructive",
      });
    } finally {
      setInterpretationLoading(false);
    }
  };

  const handleGenerateImage = async (style?: string) => {
    if (!id || !dream) return;

    setImageGenerating(true);
    setDialogOpen(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-dream-image', {
        body: {
          dreamId: id,
          content: dream.content,
          mood: dream.mood,
          imageStyle: style || regenerateStyle,
          autoStyle: !style && !regenerateStyle
        }
      });

      if (error) {
        console.error('Errore generazione immagine:', error);
        toast({
          title: "Errore",
          description: error.message || "Impossibile generare l'immagine",
          variant: "destructive",
        });
      } else if (data?.image_url) {
        setDream({ 
          ...dream, 
          image_url: data.image_url, 
          image_style: data.image_style 
        });
        toast({
          title: "Successo",
          description: "Immagine generata con successo!",
        });
      }
    } catch (error) {
      console.error('Errore:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione",
        variant: "destructive",
      });
    } finally {
      setImageGenerating(false);
      setRegenerateStyle("");
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pb-12" style={{ paddingTop: 'calc(6rem + var(--safe-area-inset-top, 0px))' }}>
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
      <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pb-12" style={{ paddingTop: 'calc(6rem + var(--safe-area-inset-top, 0px))' }}>
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
              {/* Immagine Generata */}
              {dream.image_url ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Immagine del Sogno</h3>
                    <Badge variant="secondary" className="capitalize">
                      {dream.image_style || 'auto'}
                    </Badge>
                  </div>
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <img
                      src={dream.image_url}
                      alt={dream.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={imageGenerating}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Rigenera Immagine
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rigenera Immagine</DialogTitle>
                        <DialogDescription>
                          Scegli uno stile per la nuova immagine del sogno
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="regen-style">Stile</Label>
                          <Select
                            value={regenerateStyle}
                            onValueChange={setRegenerateStyle}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Lascia scegliere all'AI" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="realistico">🎬 Realistico</SelectItem>
                              <SelectItem value="onirico">✨ Onirico/Surreale</SelectItem>
                              <SelectItem value="artistico">🎨 Artistico/Pittorico</SelectItem>
                              <SelectItem value="minimalista">⚪ Minimalista</SelectItem>
                              <SelectItem value="fantastico">🧙 Fantastico</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={() => handleGenerateImage()}
                          disabled={imageGenerating}
                          className="w-full"
                        >
                          {imageGenerating ? "Generazione..." : "Rigenera"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nessuna immagine generata per questo sogno
                  </p>
                  <Button
                    onClick={() => handleGenerateImage()}
                    disabled={imageGenerating}
                    variant="outline"
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {imageGenerating ? "Generazione..." : "Genera Immagine"}
                  </Button>
                </div>
              )}
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
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-300 hover:scale-105 hover:animate-pulse ${getTagColor(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Visibilità */}
              <div>
                <h3 className="font-semibold mb-2">Visibilità</h3>
                <Select
                  value={dream.visibility || "private"}
                  onValueChange={async (value) => {
                    const { error } = await supabase
                      .from("dreams")
                      .update({ visibility: value })
                      .eq("id", id);
                    
                    if (error) {
                      toast({
                        title: "Errore",
                        description: "Impossibile aggiornare la visibilità",
                        variant: "destructive",
                      });
                    } else {
                      setDream({ ...dream, visibility: value });
                      toast({
                        title: "Visibilità aggiornata",
                        description: value === "public" 
                          ? "Il tuo sogno è ora pubblico e visibile nella pagina Esplora" 
                          : "Il tuo sogno è ora privato",
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">🔒 Privato</SelectItem>
                    <SelectItem value="public">🌍 Pubblico</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  {dream.visibility === "public" 
                    ? "Questo sogno è visibile a tutti gli utenti nella pagina Esplora" 
                    : "Solo tu puoi vedere questo sogno"}
                </p>
              </div>
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
                <div className="space-y-4">
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-foreground mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold text-foreground mb-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-foreground mb-2" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                        p: ({node, ...props}) => <p className="text-muted-foreground mb-3" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside text-muted-foreground mb-3 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside text-muted-foreground mb-3 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-muted-foreground" {...props} />,
                      }}
                    >
                      {dream.interpretation}
                    </ReactMarkdown>
                  </div>
                  <Button
                    onClick={handleInterpret}
                    disabled={interpretationLoading}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {interpretationLoading ? "Rigenerazione..." : "Rigenera Interpretazione"}
                  </Button>
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

          {/* Voice Notes */}
          <VoiceNoteRecorder dreamId={id!} />
        </div>
      </div>
    </>
  );
};

export default DreamDetail;
