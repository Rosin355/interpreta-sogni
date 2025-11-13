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
import { Loader2, Download, CheckCircle2, Smartphone, TrendingUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [dreamStats, setDreamStats] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    topCategory: "-"
  });

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
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
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

      // Find top category
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
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Il Mio Profilo</h1>
            <p className="text-muted-foreground">
              Gestisci le tue informazioni personali e le impostazioni dell'app
            </p>
          </div>

          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Personali</CardTitle>
              <CardDescription>Aggiorna il tuo profilo e le tue informazioni</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {username.slice(0, 2).toUpperCase() || "US"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Il tuo username"
                  />
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

          {/* PWA Status */}
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
                    <p className="text-sm text-muted-foreground">
                      Stai usando la versione nativa dell'app
                    </p>
                  </div>
                  <Badge variant="secondary">Attiva</Badge>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Installa Dream Catcher sul tuo dispositivo per accesso rapido e funzionalità offline
                  </p>
                  <Button onClick={handleInstallPWA} variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Installa App
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

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
