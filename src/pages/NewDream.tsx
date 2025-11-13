import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, CalendarIcon, Clock, Image, ChevronDown, Sparkles, Plus } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getCategoryFromTag } from "@/utils/dream-categories";

interface SuggestedTag {
  tag: string;
  confidence: number;
  category: string;
}

const NewDream = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    dream_date: new Date().toISOString().split("T")[0],
    dream_time: new Date().toTimeString().slice(0, 5),
    mood: "",
    tags: "",
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [autoStyle, setAutoStyle] = useState(true);
  const [imageStyle, setImageStyle] = useState("");
  const [generateImage, setGenerateImage] = useState(true);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<SuggestedTag[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const debounceTimerRef = useRef<number | null>(null);

  const moodOptions = [
    { value: "felicita", label: "😊 Felicità" },
    { value: "tristezza", label: "😢 Tristezza" },
    { value: "rabbia", label: "😠 Rabbia" },
    { value: "paura", label: "😨 Paura" },
    { value: "sorpresa", label: "😲 Sorpresa" },
    { value: "disgusto", label: "🤢 Disgusto" },
    { value: "ansia", label: "😰 Ansia" },
    { value: "calma", label: "😌 Calma" },
    { value: "eccitazione", label: "🤩 Eccitazione" },
    { value: "confusione", label: "😕 Confusione" },
    { value: "noia", label: "😑 Noia" },
    { value: "vergogna", label: "😳 Vergogna" },
    { value: "orgoglio", label: "😎 Orgoglio" },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!aiEnabled || !formData.content || formData.content.length < 20) {
      setSuggestedTags([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      analyzeDreamContent();
    }, 3000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData.content, aiEnabled]);

  const analyzeDreamContent = async () => {
    setIsAnalyzing(true);
    setSuggestedTags([]);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-tags', {
        body: { content: formData.content }
      });

      if (error) {
        console.error('Error analyzing dream:', error);
        if (error.message?.includes('Rate limit')) {
          toast({
            title: "Troppe richieste",
            description: "Aspetta qualche secondo prima di continuare a scrivere",
            variant: "destructive",
          });
        } else if (error.message?.includes('Payment required')) {
          toast({
            title: "Crediti insufficienti",
            description: "I crediti AI sono esauriti. Aggiungi crediti per continuare.",
            variant: "destructive",
          });
        }
        return;
      }

      if (data?.tags && Array.isArray(data.tags)) {
        setSuggestedTags(data.tags.sort((a: SuggestedTag, b: SuggestedTag) => b.confidence - a.confidence));
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addSuggestedTag = (tag: string) => {
    const currentTags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);
    
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag].join(", ");
      setFormData({ ...formData, tags: newTags });
      toast({
        title: "Tag aggiunto",
        description: `"${tag}" è stato aggiunto ai tuoi tag`,
      });
    }
    
    setSuggestedTags(prev => prev.filter(t => t.tag !== tag));
  };

  const addAllSuggestedTags = () => {
    const currentTags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);
    
    const newTags = suggestedTags
      .map(st => st.tag)
      .filter(tag => !currentTags.includes(tag));
    
    if (newTags.length > 0) {
      const allTags = [...currentTags, ...newTags].join(", ");
      setFormData({ ...formData, tags: allTags });
      toast({
        title: "Tag aggiunti",
        description: `${newTags.length} tag sono stati aggiunti`,
      });
      setSuggestedTags([]);
    }
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?mode=login");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Errore",
        description: "Titolo e descrizione sono obbligatori",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth?mode=login");
      return;
    }

    const tagsArray = formData.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);

    const { data, error } = await supabase
      .from("dreams")
      .insert({
        user_id: user.id,
        title: formData.title.trim(),
        content: formData.content.trim(),
        dream_date: formData.dream_date,
        mood: formData.mood.trim() || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Errore nel salvataggio del sogno:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il sogno. Riprova.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Successo",
        description: "Sogno salvato con successo!",
      });

      // Genera immagine se richiesto
      if (generateImage) {
        setImageGenerating(true);
        try {
          const { error: imageError } = await supabase.functions.invoke('generate-dream-image', {
            body: {
              dreamId: data.id,
              content: formData.content,
              mood: formData.mood,
              imageStyle: imageStyle,
              autoStyle: autoStyle
            }
          });

          if (imageError) {
            console.error('Errore generazione immagine:', imageError);
            toast({
              title: "Avviso",
              description: "Sogno salvato ma impossibile generare l'immagine. Puoi generarla in seguito.",
              variant: "default",
            });
          } else {
            toast({
              title: "Immagine generata!",
              description: "L'immagine del sogno è stata creata con successo",
            });
          }
        } catch (err) {
          console.error('Errore:', err);
        } finally {
          setImageGenerating(false);
        }
      }

      navigate(`/dreams/${data.id}`);
    }
    
    setLoading(false);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pt-24 pb-12">
        <div className="container mx-auto px-6 max-w-3xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alla Dashboard
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Nuovo Sogno</CardTitle>
              <CardDescription>
                Registra il tuo sogno e salvalo nel tuo diario personale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Titolo *</Label>
                  <Input
                    id="title"
                    placeholder="Es: Il volo sopra la città"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data del Sogno *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "PPP", { locale: it })
                        ) : (
                          <span>Seleziona una data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                            setFormData({
                              ...formData,
                              dream_date: format(date, "yyyy-MM-dd"),
                            });
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dream_time">Ora del Sogno</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dream_time"
                      type="time"
                      value={formData.dream_time}
                      onChange={(e) =>
                        setFormData({ ...formData, dream_time: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Descrizione del Sogno *</Label>
                  <Textarea
                    id="content"
                    placeholder="Descrivi il tuo sogno in dettaglio..."
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    rows={8}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mood">Umore</Label>
                  <Select
                    value={formData.mood}
                    onValueChange={(value) =>
                      setFormData({ ...formData, mood: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un'emozione" />
                    </SelectTrigger>
                    <SelectContent>
                      {moodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tags">Tag (separati da virgole)</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Beta
                      </Badge>
                      <Switch
                        checked={aiEnabled}
                        onCheckedChange={setAiEnabled}
                        id="ai-suggestions"
                      />
                    </div>
                  </div>
                  <Input
                    id="tags"
                    placeholder="Es: volo, città, libertà"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Usa tag per categorizzare e cercare facilmente i tuoi sogni
                    {aiEnabled && " · L'AI analizzerà il tuo sogno e suggerirà tag rilevanti"}
                  </p>
                  
                  {/* AI Suggested Tags */}
                  {aiEnabled && (isAnalyzing || suggestedTags.length > 0) && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Tag Suggeriti dall'AI
                        </div>
                        {suggestedTags.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={addAllSuggestedTags}
                            className="h-7 text-xs"
                          >
                            Aggiungi tutti
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {isAnalyzing ? (
                          <>
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-6 w-20" />
                          </>
                        ) : (
                          suggestedTags.map((suggested, idx) => {
                            const category = getCategoryFromTag(suggested.tag);
                            return (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary/10 transition-colors"
                                style={{ 
                                  borderColor: category.color,
                                  color: category.color 
                                }}
                                onClick={() => addSuggestedTag(suggested.tag)}
                              >
                                {suggested.tag}
                                <Plus className="h-3 w-3 ml-1" />
                              </Badge>
                            );
                          })
                        )}
                      </div>
                      
                      {!isAnalyzing && suggestedTags.length === 0 && formData.content.length >= 20 && (
                        <p className="text-xs text-muted-foreground">
                          Continua a scrivere per ricevere suggerimenti...
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Stile Visivo */}
                <Collapsible className="space-y-2">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Stile Visivo (opzionale)
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="auto-style" className="flex-1">
                        Lascia che l'AI scelga il miglior stile per il tuo sogno
                      </Label>
                      <Switch
                        id="auto-style"
                        checked={autoStyle}
                        onCheckedChange={setAutoStyle}
                      />
                    </div>

                    {!autoStyle && (
                      <div className="space-y-2">
                        <Label htmlFor="image-style">Seleziona Stile</Label>
                        <Select
                          value={imageStyle}
                          onValueChange={setImageStyle}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Scegli uno stile" />
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
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Checkbox Genera Immagine */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="generate-image"
                    checked={generateImage}
                    onCheckedChange={(checked) => setGenerateImage(checked as boolean)}
                  />
                  <Label
                    htmlFor="generate-image"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Genera immagine automaticamente con AI
                  </Label>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={loading || imageGenerating}
                    className="flex-1 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {imageGenerating ? "Generazione immagine..." : loading ? "Salvataggio..." : "Salva Sogno"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    disabled={loading}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default NewDream;
