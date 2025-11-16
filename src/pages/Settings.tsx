import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, Palette, Shield, Trash2, Download } from "lucide-react";
import Navigation from "@/components/Navigation";
import NotificationManager from "@/components/NotificationManager";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTheme } from "next-themes";
export default function Settings() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    theme,
    setTheme
  } = useTheme();
  const {
    isSupported,
    isSubscribed,
    loading: pushLoading,
    subscribe,
    unsubscribe
  } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    setLoading(false);
  };
  const handleClearCache = () => {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
      toast({
        title: "Cache cancellata",
        description: "La cache dell'app è stata svuotata con successo"
      });
    }
  };
  const handleExportData = async () => {
    try {
      const {
        data: dreams,
        error
      } = await supabase.from('dreams').select('*').eq('user_id', user.id);
      if (error) throw error;
      const dataStr = JSON.stringify(dreams, null, 2);
      const dataBlob = new Blob([dataStr], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dreams-export-${new Date().toISOString()}.json`;
      link.click();
      toast({
        title: "Dati esportati",
        description: "I tuoi dati sono stati scaricati con successo"
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile e tutti i tuoi dati verranno eliminati.");
    if (!confirmed) return;
    try {
      // Delete all user data first
      await supabase.from('dreams').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
      toast({
        title: "Account eliminato",
        description: "Il tuo account è stato eliminato. Verrai reindirizzato alla home."
      });
      setTimeout(() => {
        supabase.auth.signOut();
        navigate("/");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8" style={{ marginTop: 'calc(5rem + var(--safe-area-inset-top, 0px))' }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Impostazioni</h1>
            <p className="text-muted-foreground">
              Configura la tua esperienza con Dream's Alchemist
            </p>
          </div>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifiche
              </CardTitle>
              <CardDescription>Gestisci le notifiche push per i promemoria dei sogni</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <NotificationManager />
              
              {isSupported && <>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Notifiche Push</Label>
                        <p className="text-sm text-muted-foreground">
                          Ricevi notifiche push direttamente sul tuo dispositivo
                        </p>
                      </div>
                      <Switch checked={isSubscribed} onCheckedChange={checked => {
                    if (checked) {
                      subscribe();
                    } else {
                      unsubscribe();
                    }
                  }} disabled={pushLoading} />
                    </div>
                  </div>
                  
                  {isSubscribed && <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm">
                        ✅ Notifiche push attive! Riceverai promemoria per registrare i tuoi sogni.
                      </p>
                    </div>}
                </>}
              
              {!isSupported && <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Le notifiche push non sono supportate su questo dispositivo.
                  </p>
                </div>}
            </CardContent>
          </Card>

          {/* Appearance */}
          

          {/* PWA Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni App</CardTitle>
              <CardDescription>Gestisci cache e storage dell'applicazione</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cache dell'app</Label>
                  <p className="text-sm text-muted-foreground">
                    Cancella la cache per liberare spazio
                  </p>
                </div>
                <Button variant="outline" onClick={handleClearCache}>
                  Cancella Cache
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy e Sicurezza
              </CardTitle>
              <CardDescription>Gestisci i tuoi dati e la sicurezza dell'account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Esporta i tuoi dati</Label>
                  <p className="text-sm text-muted-foreground">
                    Scarica una copia di tutti i tuoi sogni
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="mr-2 h-4 w-4" />
                  Esporta
                </Button>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-destructive">Elimina Account</Label>
                    <p className="text-sm text-muted-foreground">
                      Elimina permanentemente il tuo account e tutti i dati
                    </p>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versione</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Build</span>
                <span className="font-medium">2024.11</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>;
}