import { useState, useEffect } from "react";
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
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
                  <Label htmlFor="tags">Tag (separati da virgole)</Label>
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
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? "Salvataggio..." : "Salva Sogno"}
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
