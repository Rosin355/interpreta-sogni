import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, CheckCircle2, Smartphone, TrendingUp, Upload, X, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import StreakCard from "@/components/StreakCard";
import { BirthDataForm } from "@/components/BirthDataForm";
import { NatalChartWheel } from "@/components/NatalChartWheel";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [dreamStats, setDreamStats] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    topCategory: "-"
  });
  const [natalChartData, setNatalChartData] = useState<any>(null);
  const [showNatalChartForm, setShowNatalChartForm] = useState(true);

  useEffect(() => {
    checkAuth();
    checkPWAStatus();
    loadProfile();
    loadDreamStats();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const checkPWAStatus = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsPWAInstalled(isStandalone);
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setUsername(data?.username || "");
      setAvatarUrl(data?.avatar_url || "");
      
      // Carica dati tema natale se presenti
      if (data?.natal_chart_data) {
        setNatalChartData(data.natal_chart_data);
        setShowNatalChartForm(false);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleNatalChartSuccess = () => {
    loadProfile(); // Ricarica il profilo per mostrare i nuovi dati
  };

  const loadDreamStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dreams, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const thisWeek = dreams?.filter(d => new Date(d.created_at) >= oneWeekAgo).length || 0;
      const thisMonth = dreams?.filter(d => new Date(d.created_at) >= oneMonthAgo).length || 0;

      const categories: Record<string, number> = {};
      dreams?.forEach(dream => {
        if (dream.tags && Array.isArray(dream.tags)) {
          dream.tags.forEach((tag: string) => {
            categories[tag] = (categories[tag] || 0) + 1;
          });
        }
      });

      const topCategory = Object.entries(categories).sort(([, a], [, b]) => b - a)[0]?.[0] || "-";

      setDreamStats({
        total: dreams?.length || 0,
        thisWeek,
        thisMonth,
        topCategory
      });
    } catch (error) {
      console.error('Error loading dream stats:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File troppo grande",
          description: "L'immagine deve essere inferiore a 2MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Formato non valido",
          description: "Carica un'immagine valida (JPEG, PNG, WEBP, GIF)",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      
      toast({
        title: "Avatar aggiornato",
        description: "La tua immagine profilo è stata aggiornata",
      });

    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploading(true);
      
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setAvatarUrl("");
      
      toast({
        title: "Avatar rimosso",
        description: "L'immagine profilo è stata rimossa",
      });

    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profilo aggiornato",
        description: "Le modifiche sono state salvate con successo",
      });

      loadProfile();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInstallPWA = () => {
    toast({
      title: "Installa l'app",
      description: "Cerca il pulsante 'Aggiungi a Home' nel menu del browser",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8" style={{ marginTop: 'calc(5rem + var(--safe-area-inset-top, 0px))' }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Il Mio Profilo</h1>
            <p className="text-muted-foreground">Gestisci le tue informazioni personali e le impostazioni dell'app</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informazioni Personali</CardTitle>
              <CardDescription>Aggiorna il tuo profilo e le tue informazioni</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-2xl">
                      {username.slice(0, 2).toUpperCase() || "US"}
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                  {avatarUrl && !uploading && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                      title="Rimuovi avatar"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="avatar" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Upload className="h-4 w-4" />
                        {avatarUrl ? "Cambia immagine profilo" : "Carica immagine profilo"}
                      </div>
                    </Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WEBP o GIF (max 2MB)</p>
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Il tuo username"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>Iscritto dal</Label>
                  <Input
                    value={profile?.created_at ? format(new Date(profile.created_at), "dd MMMM yyyy", { locale: it }) : "-"}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salva Modifiche
              </Button>
            </CardContent>
          </Card>

          {/* Natal Chart Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Il Tuo Tema Natale
              </CardTitle>
              <CardDescription>
                Scopri il tuo tema natale per interpretazioni più profonde dei tuoi sogni
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!natalChartData && showNatalChartForm && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                    <p className="text-sm text-muted-foreground mb-3">
                      Il tema natale ti permette di comprendere meglio i tuoi sogni attraverso 
                      l'astrologia. Le posizioni dei pianeti nel momento della tua nascita possono 
                      rivelare aspetti profondi della tua psiche e dei tuoi sogni ricorrenti.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li><strong>Chirone</strong> indica la tua ferita emotiva principale</li>
                      <li><strong>Mercurio</strong> rivela il tuo stile comunicativo</li>
                      <li><strong>Venere</strong> mostra il tuo modo di amare</li>
                    </ul>
                  </div>
                  
                  <BirthDataForm onSuccess={handleNatalChartSuccess} />
                </div>
              )}

              {natalChartData && (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <p className="font-semibold">Tema Natale Calcolato</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Il tuo tema natale è stato calcolato e verrà utilizzato per arricchire 
                      le interpretazioni dei tuoi sogni.
                    </p>
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-1">Data di Nascita</p>
                        <p className="font-medium">
                          {natalChartData.birthInfo?.date 
                            ? format(new Date(natalChartData.birthInfo.date), "dd MMMM yyyy", { locale: it })
                            : "-"}
                        </p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-1">Ora di Nascita</p>
                        <p className="font-medium">{natalChartData.birthInfo?.time || "-"}</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border sm:col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Luogo di Nascita</p>
                        <p className="font-medium text-sm">{natalChartData.birthInfo?.place || "-"}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-3">Posizioni Chiave</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {natalChartData.planets?.chiron && (
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs font-medium mb-1">Chirone</p>
                            <p className="text-sm">{natalChartData.planets.chiron.sign}</p>
                            <p className="text-xs text-muted-foreground">Casa {natalChartData.planets.chiron.house}</p>
                          </div>
                        )}
                        {natalChartData.planets?.mercury && (
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs font-medium mb-1">Mercurio</p>
                            <p className="text-sm">{natalChartData.planets.mercury.sign}</p>
                            <p className="text-xs text-muted-foreground">Casa {natalChartData.planets.mercury.house}</p>
                          </div>
                        )}
                        {natalChartData.planets?.venus && (
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs font-medium mb-1">Venere</p>
                            <p className="text-sm">{natalChartData.planets.venus.sign}</p>
                            <p className="text-xs text-muted-foreground">Casa {natalChartData.planets.venus.house}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowNatalChartForm(true)}
                      className="mt-4 w-full"
                    >
                      Ricalcola Tema Natale
                    </Button>
                  </div>

                  {/* Visualizzazione Grafica */}
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                    <h4 className="text-sm font-semibold mb-4 text-center">Cerchio Zodiacale</h4>
                    <NatalChartWheel data={natalChartData} size={320} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                App Nativa
              </CardTitle>
              <CardDescription>Installa l'app per un'esperienza migliore</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPWAInstalled ? (
                <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">App Installata</p>
                    <p className="text-sm text-muted-foreground">Stai usando la versione nativa dell'app</p>
                  </div>
                  <Badge variant="secondary">Attiva</Badge>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Installa Dream's Alchemist sul tuo dispositivo per accesso rapido e funzionalità offline
                  </p>
                  <Button onClick={handleInstallPWA} variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Installa App
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Natal Chart Section */}
          <StreakCard />

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Statistiche
              </CardTitle>
              <CardDescription>I tuoi progressi nel diario dei sogni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Sogni Totali</p>
                  <p className="text-2xl font-bold">{dreamStats.total}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Questa Settimana</p>
                  <p className="text-2xl font-bold">{dreamStats.thisWeek}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Questo Mese</p>
                  <p className="text-2xl font-bold">{dreamStats.thisMonth}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Categoria Top</p>
                  <p className="text-2xl font-bold truncate">{dreamStats.topCategory}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
