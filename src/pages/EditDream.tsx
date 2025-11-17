import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, CalendarIcon, Clock, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getCategoryFromTag } from "@/utils/dream-categories";

const EditDream = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    dream_date: new Date().toISOString().split("T")[0],
    dream_time: new Date().toTimeString().slice(0, 5),
    mood: "",
    tags: "",
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newTag, setNewTag] = useState("");
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [imageStyle, setImageStyle] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

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
    loadDream();
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth?mode=login");
    }
  };

  const loadDream = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from("dreams")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title,
          content: data.content,
          dream_date: data.dream_date,
          dream_time: data.dream_date.split("T")[1]?.slice(0, 5) || "00:00",
          mood: data.mood || "",
          tags: "", // We'll use tagsList instead
        });
        setTagsList(data.tags || []);
        setSelectedDate(new Date(data.dream_date));
        setImageUrl(data.image_url || "");
        setImageStyle(data.image_style || "");
      }
    } catch (error) {
      console.error("Error loading dream:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il sogno",
        variant: "destructive",
      });
      navigate("/my-dreams");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormData((prev) => ({
        ...prev,
        dream_date: format(date, "yyyy-MM-dd"),
      }));
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tagsList.includes(trimmedTag)) {
      setTagsList([...tagsList, trimmedTag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTagsList(tagsList.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const dreamDateTime = `${formData.dream_date}T${formData.dream_time}:00`;

      const { error } = await supabase
        .from("dreams")
        .update({
          title: formData.title,
          content: formData.content,
          dream_date: dreamDateTime,
          mood: formData.mood || null,
          tags: tagsList.length > 0 ? tagsList : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Sogno aggiornato con successo!",
      });

      navigate(`/dreams/${id}`);
    } catch (error) {
      console.error("Error updating dream:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del sogno",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!id) return;
    
    setImageGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-dream-image', {
        body: {
          dreamId: id,
          content: formData.content,
          mood: formData.mood,
          imageStyle: imageStyle && imageStyle !== 'auto' ? imageStyle : undefined,
          autoStyle: !imageStyle || imageStyle === 'auto',
          customPrompt: customPrompt || undefined
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
        setImageUrl(data.image_url);
        toast({
          title: "Successo",
          description: "Immagine generata con successo",
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
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background flex items-center justify-center" style={{ paddingTop: 'calc(6rem + var(--safe-area-inset-top, 0px))' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-dream-space to-background pb-12" style={{ paddingTop: 'calc(6rem + var(--safe-area-inset-top, 0px))' }}>
        <div className="container mx-auto px-6 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate(`/dreams/${id}`)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna al Sogno
          </Button>

          <Card className="bg-card/95 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-3xl">Modifica Sogno</CardTitle>
              <CardDescription>
                Aggiorna i dettagli del tuo sogno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Titolo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Es: Il volo sopra la città"
                    required
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data del Sogno</Label>
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
                            format(selectedDate, "d MMMM yyyy", { locale: it })
                          ) : (
                            <span>Seleziona data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dream_time">Ora</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="dream_time"
                        name="dream_time"
                        type="time"
                        value={formData.dream_time}
                        onChange={handleInputChange}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Mood */}
                <div className="space-y-2">
                  <Label htmlFor="mood">Umore</Label>
                  <Select value={formData.mood} onValueChange={(value) => handleSelectChange("mood", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Come ti sei sentito?" />
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

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">
                    Descrizione <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="Descrivi il tuo sogno in dettaglio..."
                    rows={10}
                    required
                  />
                </div>

                {/* Dream Image Section */}
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ImageIcon className="h-5 w-5" />
                      Immagine del Sogno
                    </CardTitle>
                    <CardDescription>
                      Genera un'immagine evocativa per visualizzare il tuo sogno
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {imageUrl && (
                      <div className="relative rounded-lg overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt="Dream visualization" 
                          className="w-full h-64 object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="imageStyle">Stile Immagine (opzionale)</Label>
                      <Select value={imageStyle || "auto"} onValueChange={setImageStyle}>
                        <SelectTrigger id="imageStyle">
                          <SelectValue placeholder="Lascia scegliere all'AI" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">✨ Automatico (AI sceglie)</SelectItem>
                          <SelectItem value="realistico">🎬 Realistico</SelectItem>
                          <SelectItem value="onirico">✨ Onirico</SelectItem>
                          <SelectItem value="artistico">🎨 Artistico</SelectItem>
                          <SelectItem value="minimalista">⚪ Minimalista</SelectItem>
                          <SelectItem value="fantastico">🌟 Fantastico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customPrompt">Suggerimenti Personalizzati (opzionale)</Label>
                      <Textarea
                        id="customPrompt"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="es: ambiente più scuro, scena più semplice, focus su un particolare elemento..."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Descrivi come vorresti che fosse l'immagine
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleRegenerateImage}
                      disabled={imageGenerating}
                      variant="outline"
                      className="w-full"
                    >
                      {imageGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Sparkles className="mr-2 h-4 w-4" />
                      {imageUrl ? "Rigenera Immagine" : "Genera Immagine"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tag</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(newTag);
                        }
                      }}
                      placeholder="Aggiungi un tag e premi Invio"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addTag(newTag)}
                    >
                      Aggiungi
                    </Button>
                  </div>
                  {tagsList.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tagsList.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/80 transition-colors"
                          style={{
                            background: `linear-gradient(135deg, ${getCategoryFromTag(tag).color}15, ${getCategoryFromTag(tag).color}30)`,
                            borderColor: getCategoryFromTag(tag).color,
                          }}
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Salvataggio..." : "Aggiorna Sogno"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/dreams/${id}`)}
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

export default EditDream;
