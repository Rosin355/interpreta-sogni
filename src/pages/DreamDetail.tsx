import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTagColor } from "@/utils/tag-colors";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Edit, Trash2, Sparkles, Image as ImageIcon, Share2, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AlchemistChat } from "@/components/AlchemistChat";
import { DreamDiaryExport } from "@/components/DreamDiaryExport";
import { TTSButton } from "@/components/TTSButton";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import { ShareDreamUnified } from "@/components/ShareDreamUnified";
import { ProfessionalCommentForm } from "@/components/ProfessionalCommentForm";
import { CustomPromptInput, isCustomPromptValid } from "@/components/CustomPromptInput";
import { AlchemicalBadge } from "@/components/AlchemicalBadge";
import { cn } from "@/lib/utils";
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
  const [hasAstrologicalContext, setHasAstrologicalContext] = useState(false);
  const [natalChartData, setNatalChartData] = useState<any>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isUserOwner, setIsUserOwner] = useState(false);
  const [isProfessional, setIsProfessional] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [useAiAutoPrompt, setUseAiAutoPrompt] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchDream();
    loadNatalChartData();
    loadComments();
    checkProfessionalStatus();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    // Real-time subscription for new comments
    const channel = supabase
      .channel(`dream-comments-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "professional_comments",
          filter: `dream_id=eq.${id}`,
        },
        (payload) => {
          console.log("New comment received:", payload);
          toast({
            title: "💬 Nuovo feedback ricevuto!",
            description: "Un professionista ha commentato il tuo sogno",
          });
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const loadNatalChartData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('natal_chart_data')
        .eq('id', user.id)
        .single();

      if (profile?.natal_chart_data) {
        setNatalChartData(profile.natal_chart_data);
      }
    } catch (error) {
      console.error('Error loading natal chart:', error);
    }
  };

  const loadComments = async () => {
    if (!id) return;

    try {
      const { data: commentsData, error } = await supabase
        .from("professional_comments")
        .select("*")
        .eq("dream_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Enrich with professional data
      const enrichedComments = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", comment.professional_id)
            .single();

          const { data: profData } = await supabase
            .from("professional_profiles")
            .select("specialization")
            .eq("user_id", comment.professional_id)
            .single();

          return {
            ...comment,
            professional_name: profileData?.username || "Professionista",
            specialization: profData?.specialization || "Specialista",
          };
        })
      );

      setComments(enrichedComments);
    } catch (error: any) {
      console.error("Error loading comments:", error);
    }
  };

  const checkProfessionalStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;

      // Check if user is a professional
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "professional")
        .single();

      setIsProfessional(!!roleData);

      // Check if professional can comment (has accepted share)
      if (roleData) {
        const { data: shareData } = await supabase
          .from("dream_shares")
          .select("status")
          .eq("dream_id", id)
          .eq("professional_id", user.id)
          .eq("status", "accepted")
          .single();

        setCanComment(!!shareData);
      }
    } catch (error: any) {
      console.error("Error checking professional status:", error);
    }
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?mode=login");
    }
  };

  const fetchDream = async () => {
    if (!id) return;

    const { data: { user } } = await supabase.auth.getUser();
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
      setIsUserOwner(user?.id === data.user_id);
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
      // Usa la nuova funzione con supporto astrologico
      const { data, error } = await supabase.functions.invoke('interpret-dream-with-astrology', {
        body: { 
          dreamId: id,
          dreamContent: dream.content,
          dreamTags: dream.tags || [],
          dreamMood: dream.mood
        }
      });

      if (error) {
        // Estrai il messaggio reale dall'errore della Edge Function
        let errorMessage = error.message || "Impossibile interpretare il sogno";
        try {
          const errBody = error.context ? await error.context.json() : null;
          if (errBody?.error) errorMessage = errBody.error;
          else if (errBody?.message) errorMessage = errBody.message;
        } catch {}
        console.error('Interpretation error details:', errorMessage, error);

        // Logga l'errore nella tabella error_logs
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('error_logs').insert({
            user_id: user.id,
            error_code: 'INTERPRETATION_FAILED',
            error_message_user: errorMessage,
            error_message_technical: JSON.stringify({ message: error.message, context: errorMessage }),
            function_name: 'interpret-dream-with-astrology',
            dream_id: id,
            metadata: { dreamId: id }
          });
        }

        toast({
          title: "Errore nell'interpretazione",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (data?.interpretation) {
        setDream({ 
          ...dream, 
          interpretation: data.interpretation,
          interpretation_summary: data.interpretation_summary 
        });
        setHasAstrologicalContext(data.hasAstrologicalContext || false);
        
        toast({
          title: "Successo",
          description: data.hasAstrologicalContext 
            ? "✨ Interpretazione astrologica generata!" 
            : "Interpretazione generata con successo!",
        });
      }
    } catch (error: any) {
      console.error('Errore interpretazione:', error);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('error_logs').insert({
          user_id: user.id,
          error_code: 'INTERPRETATION_EXCEPTION',
          error_message_user: error?.message || "Errore sconosciuto",
          error_message_technical: String(error),
          function_name: 'interpret-dream-with-astrology',
          dream_id: id,
        });
      }

      toast({
        title: "Errore",
        description: error?.message || "Si è verificato un errore durante l'interpretazione",
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

    const effectiveStyle = style || regenerateStyle;
    const effectiveAutoStyle = !style && !regenerateStyle;
    const hasCustomPrompt = !useAiAutoPrompt && !!customPrompt;

    const mapImageErrorCode = (code?: string, fallback?: string, details?: string) => {
      switch (code) {
        case 'AI_RATE_LIMIT':
        case 'RATE_LIMIT':
          return "Limite richieste raggiunto. Attendi qualche minuto e riprova.";
        case 'AI_CREDITS_EXHAUSTED':
          return "Crediti AI esauriti. Contatta il supporto per assistenza.";
        case 'IMAGE_SAFETY_BLOCKED':
          return "L'immagine è stata bloccata dai filtri di sicurezza. Prova a modificare la descrizione del sogno.";
        case 'VALIDATION_ERROR':
          return `Dati non validi: ${details || 'Verifica il contenuto del sogno'}`;
        case 'FORBIDDEN':
          return "Non sei autorizzato a generare immagini per questo sogno.";
        case 'DREAM_NOT_FOUND':
          return "Sogno non trovato. Ricarica la pagina.";
        default:
          return fallback || "Impossibile generare l'immagine";
      }
    };

    try {
      const { data, error } = await supabase.functions.invoke('generate-dream-image', {
        body: {
          dreamId: id,
          content: dream.content,
          mood: dream.mood,
          imageStyle: effectiveStyle,
          autoStyle: effectiveAutoStyle,
          customPrompt: useAiAutoPrompt ? undefined : (customPrompt || undefined)
        }
      });

      if (error) {
        // Estrai il body reale dell'errore dalla Edge Function
        let errBody: any = null;
        try {
          errBody = error.context ? await error.context.json() : null;
        } catch {}

        const errorCode = errBody?.errorCode;
        const serverError = errBody?.error || errBody?.message || error.message;
        const errorMessage = mapImageErrorCode(errorCode, serverError, errBody?.details);

        console.error('Errore generazione immagine:', { errorCode, serverError, error });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('error_logs').insert({
            user_id: user.id,
            error_code: errorCode || 'IMAGE_GENERATION_FAILED',
            error_message_user: errorMessage,
            error_message_technical: JSON.stringify({ message: error.message, body: errBody }),
            function_name: 'generate-dream-image',
            dream_id: id,
            metadata: { imageStyle: effectiveStyle, autoStyle: effectiveAutoStyle, hasCustomPrompt }
          });
        }

        toast({
          title: "Errore Generazione Immagine",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (data?.error) {
        // Errore restituito nel body con status 200
        const errorMessage = mapImageErrorCode(data.errorCode, data.error, data.details);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('error_logs').insert({
            user_id: user.id,
            error_code: data.errorCode || 'IMAGE_GENERATION_FAILED',
            error_message_user: errorMessage,
            error_message_technical: JSON.stringify(data),
            function_name: 'generate-dream-image',
            dream_id: id,
            metadata: { imageStyle: effectiveStyle, autoStyle: effectiveAutoStyle, hasCustomPrompt }
          });
        }

        toast({
          title: "Errore Generazione Immagine",
          description: errorMessage,
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
      } else {
        toast({
          title: "Errore",
          description: "Risposta non valida dal server. Riprova.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Errore inaspettato:', error);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('error_logs').insert({
          user_id: user.id,
          error_code: 'IMAGE_GENERATION_EXCEPTION',
          error_message_user: error?.message || "Errore sconosciuto",
          error_message_technical: String(error),
          function_name: 'generate-dream-image',
          dream_id: id,
          metadata: { imageStyle: effectiveStyle, autoStyle: effectiveAutoStyle, hasCustomPrompt }
        });
      }

      toast({
        title: "Errore",
        description: error?.message || "Si è verificato un errore imprevisto durante la generazione",
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
        <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pb-12" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
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
      <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pb-12" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
        <div className="container mx-auto px-6 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/my-dreams")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna ai Miei Sogni
          </Button>

          <Card className="mb-6 overflow-hidden border-border/80 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--dream-space)/0.55)_100%)]">
            <CardHeader className="space-y-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                      Diario onirico
                    </p>
                    <CardTitle className="text-3xl sm:text-4xl">{dream.title}</CardTitle>
                    <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
                      {format(new Date(dream.dream_date), "d MMMM yyyy", { locale: it })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {dream.alchemical_phase && (
                      <AlchemicalBadge phase={dream.alchemical_phase} size="sm" />
                    )}
                    {dream.mood && (
                      <Badge variant="outline" className="border-border bg-card/70 text-muted-foreground">
                        Umore: {dream.mood}
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-border bg-card/70 text-foreground">
                      {dream.visibility === "public" ? "Pubblico" : "Privato"}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 self-start">
                  {isUserOwner && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setShareDialogOpen(true)}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Condividi</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {dream.image_url ? (
                <section className="space-y-4 border-t border-border/60 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                        Visione generata
                      </p>
                      <h3 className="text-lg font-semibold">Immagine del sogno</h3>
                    </div>
                    <Badge variant="outline" className="capitalize border-border bg-card/70 text-foreground">
                      {dream.image_style || 'auto'}
                    </Badge>
                  </div>
                  <div className="group relative aspect-video overflow-hidden rounded-lg border border-border/70 bg-background/30">
                    <ImageZoomModal src={dream.image_url} alt={dream.title}>
                      <img
                        src={dream.image_url}
                        alt={dream.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-background/0 transition-all duration-300 group-hover:bg-background/20">
                        <div className="rounded-full border border-border bg-card/90 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                            <line x1="11" y1="8" x2="11" y2="14"/>
                            <line x1="8" y1="11" x2="14" y2="11"/>
                          </svg>
                        </div>
                      </div>
                    </ImageZoomModal>
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
                        <CustomPromptInput
                          value={customPrompt}
                          onChange={setCustomPrompt}
                          disabled={imageGenerating}
                          useAiAuto={useAiAutoPrompt}
                          onAiAutoChange={setUseAiAutoPrompt}
                        />
                        <Button
                          onClick={() => handleGenerateImage()}
                          disabled={imageGenerating || !isCustomPromptValid(customPrompt, useAiAutoPrompt)}
                          className="w-full"
                        >
                          {imageGenerating ? "Generazione..." : "Rigenera"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </section>
              ) : (
                <section className="space-y-3 rounded-lg border border-dashed border-border/70 bg-background/20 p-8 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
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
                </section>
              )}

              <section className="grid gap-6 border-t border-border/60 pt-6 md:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                        Narrazione
                      </p>
                      <h3 className="text-lg font-semibold">Descrizione</h3>
                    </div>
                    <TTSButton text={dream.content} label="Ascolta descrizione" />
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{dream.content}</p>
                </div>

                <div className="space-y-5 rounded-lg border border-border/70 bg-background/20 p-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                      Scheda rapida
                    </p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                      <span className="text-muted-foreground">Data</span>
                      <span className="text-right font-medium text-foreground">
                        {format(new Date(dream.dream_date), "d MMM yyyy", { locale: it })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                      <span className="text-muted-foreground">Visibilità</span>
                      <span className="font-medium text-foreground">
                        {dream.visibility === "public" ? "Pubblico" : "Privato"}
                      </span>
                    </div>
                    {dream.mood && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Umore</span>
                        <span className="font-medium text-foreground">{dream.mood}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {dream.tags && dream.tags.length > 0 && (
                <section className="space-y-3 border-t border-border/60 pt-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                      Simboli ricorrenti
                    </p>
                    <h3 className="text-lg font-semibold">Tag</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dream.tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-medium transition-transform duration-300 hover:scale-105",
                          getTagColor(tag),
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3 border-t border-border/60 pt-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Controllo accesso
                  </p>
                  <h3 className="text-lg font-semibold">Visibilità</h3>
                </div>
                <Select
                  value={dream.visibility || "private"}
                  onValueChange={async (value) => {
                    const isPrivate = value === "private";
                    const { error } = await supabase
                      .from("dreams")
                      .update({ visibility: value, is_private: isPrivate })
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
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">🔒 Privato</SelectItem>
                    <SelectItem value="public">🌍 Pubblico</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {dream.visibility === "public"
                    ? "Questo sogno è visibile a tutti gli utenti nella pagina Esplora"
                    : "Solo tu puoi vedere questo sogno"}
                </p>
              </section>
            </CardContent>
          </Card>

          {/* Interpretazione AI */}
          <Card className="border-border/80 bg-card/70">
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>Interpretazione AI</CardTitle>
                  {hasAstrologicalContext && natalChartData && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
                            <Sparkles className="h-3 w-3" />
                            Astrologica
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="space-y-2 text-xs">
                            <p className="font-semibold">Interpretazione con Tema Natale</p>
                            <div className="space-y-1">
                              {natalChartData.planets?.chiron && (
                                <p>• Chirone in {natalChartData.planets.chiron.sign}</p>
                              )}
                              {natalChartData.planets?.mercury && (
                                <p>• Mercurio in {natalChartData.planets.mercury.sign}</p>
                              )}
                              {natalChartData.planets?.venus && (
                                <p>• Venere in {natalChartData.planets.venus.sign}</p>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {dream.interpretation && (
                  <TTSButton 
                    text={dream.interpretation} 
                    label="Leggi ad alta voce" 
                    voiceId="cnDF6tD6CWVBeLKYlCXW"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {dream.interpretation ? (
                <div className="space-y-4 border-t border-border/60 pt-6">
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="mb-4 text-2xl font-bold text-foreground" {...props} />,
                        h2: ({node, ...props}) => <h2 className="mb-3 text-xl font-bold text-foreground" {...props} />,
                        h3: ({node, ...props}) => <h3 className="mb-2 text-lg font-semibold text-foreground" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 text-muted-foreground" {...props} />,
                        ul: ({node, ...props}) => <ul className="mb-3 list-disc list-inside space-y-1 text-muted-foreground" {...props} />,
                        ol: ({node, ...props}) => <ol className="mb-3 list-decimal list-inside space-y-1 text-muted-foreground" {...props} />,
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
                <div className="py-8 text-center">
                  <p className="mb-4 text-muted-foreground">
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

          {(comments.length > 0 || canComment) && (
            <Card className="mb-6 border-border/80 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Feedback Professionali
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {comments.length > 0 && (
                  <div className="space-y-4 border-t border-border/60 pt-6">
                    {comments.map((comment) => (
                      <Card key={comment.id} className="border-border/70 bg-background/20">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold">{comment.professional_name}</p>
                              <p className="text-sm text-muted-foreground">{comment.specialization}</p>
                            </div>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {format(new Date(comment.created_at), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                            </p>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{comment.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {canComment && (
                  <ProfessionalCommentForm
                    dreamId={id!}
                    dreamOwnerId={dream.user_id}
                    onCommentAdded={loadComments}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Chat with Alchemist */}
          <AlchemistChat dreamId={id!} hasInterpretation={!!dream.interpretation} exportButton={<DreamDiaryExport mode="single" dream={dream} />} />
        </div>
      </div>

      {/* Unified Share Dialog */}
      <ShareDreamUnified
        dreamId={id!}
        dreamTitle={dream.title}
        shareToken={dream.share_token || null}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        onShareTokenChange={(token) => setDream({ ...dream, share_token: token })}
      />
    </>
  );
};

export default DreamDetail;
