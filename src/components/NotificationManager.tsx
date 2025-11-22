import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, BellOff, TestTube, Loader2, Info, Smartphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useWonderPush } from "@/hooks/useWonderPush";

interface NotificationPreferences {
  enabled: boolean;
  preferred_time: string;
  last_notification_sent: string | null;
}

const NotificationManager = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: false,
    preferred_time: "08:00:00",
    last_notification_sent: null,
  });
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { isNative, isInitialized, installationId } = useWonderPush();

  useEffect(() => {
    loadPreferences();
    checkPermission();
    detectIOS();
  }, []);

  const detectIOS = () => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
  };

  const checkPermission = () => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  };

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Auth error:", authError);
        toast({
          title: "Errore di autenticazione",
          description: "Effettua nuovamente il login",
          variant: "destructive",
        });
        return;
      }
      
      if (!user) return;

      const { data, error } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPreferences({
          enabled: (data as any).enabled,
          preferred_time: (data as any).preferred_time,
          last_notification_sent: (data as any).last_notification_sent,
        });
      } else if (error && error.code !== "PGRST116") {
        console.error("Error loading preferences:", error);
        toast({
          title: "Errore caricamento",
          description: "Impossibile caricare le preferenze",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Non supportato",
        description: "Le notifiche non sono supportate dal tuo browser",
        variant: "destructive",
      });
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      toast({
        title: "Permesso concesso",
        description: "Riceverai promemoria per registrare i tuoi sogni",
      });
      return true;
    } else {
      toast({
        title: "Permesso negato",
        description: "Non potrai ricevere notifiche push",
        variant: "destructive",
      });
      return false;
    }
  };

  const savePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      setSaving(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Errore di autenticazione",
          description: "Effettua nuovamente il login per salvare le preferenze",
          variant: "destructive",
        });
        return;
      }

      const updatedPrefs = { ...preferences, ...newPreferences };
      
      let timeToSave = updatedPrefs.preferred_time;
      if (timeToSave && timeToSave.split(':').length === 2) {
        timeToSave = `${timeToSave}:00`;
      }

      const { error } = await supabase
        .from("notification_preferences" as any)
        .upsert({
          user_id: user.id,
          enabled: updatedPrefs.enabled,
          preferred_time: timeToSave,
        } as any);

      if (error) {
        console.error("Error saving preferences:", error);
        toast({
          title: "Errore nel salvataggio",
          description: error.message || "Verifica di essere connesso e riprova",
          variant: "destructive",
        });
      } else {
        setPreferences(updatedPrefs);
        toast({
          title: "✅ Salvato con successo",
          description: "Le tue preferenze sono state aggiornate",
        });
        
        if (updatedPrefs.enabled && !isNative) {
          scheduleNotification(updatedPrefs.preferred_time);
        }
      }
    } catch (error: any) {
      console.error("Unexpected error saving preferences:", error);
      toast({
        title: "Errore imprevisto",
        description: error.message || "Riprova tra qualche istante",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const scheduleNotification = (time: string) => {
    if (!preferences.enabled || permission !== "granted" || isNative) return;

    const [hours, minutes] = time.split(":").map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      showNotification();
      scheduleNotification(time);
    }, timeUntilNotification);

    localStorage.setItem("notificationTimeoutId", String(timeoutId));
  };

  const showNotification = () => {
    if (permission === "granted") {
      new Notification("Ricorda di registrare i tuoi sogni! 🌙", {
        body: "Hai sognato qualcosa stanotte? Registralo prima di dimenticarlo!",
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: "dream-reminder",
        requireInteraction: false,
      });

      saveLastNotificationTime();
    }
  };

  const saveLastNotificationTime = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notification_preferences" as any)
      .update({ last_notification_sent: new Date().toISOString() } as any)
      .eq("user_id", user.id);
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled && permission !== "granted" && !isNative) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    await savePreferences({ enabled });
  };

  const handleTimeChange = async (time: string) => {
    await savePreferences({ preferred_time: time });
  };

  const testNotification = () => {
    if (permission !== "granted" && !isNative) {
      toast({
        title: "Permesso necessario",
        description: "Abilita prima le notifiche",
        variant: "destructive",
      });
      return;
    }
    showNotification();
  };

  const timeOptions = Array.from({ length: 5 }, (_, i) => {
    const hour = 7 + i;
    return {
      value: `${hour.toString().padStart(2, "0")}:00:00`,
      label: `${hour}:00`,
    };
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {preferences.enabled ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle>Notifiche Sogni</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isNative && isInitialized && (
              <Badge variant="secondary">
                <Smartphone className="h-3 w-3 mr-1" />
                Native
              </Badge>
            )}
            <Badge variant={permission === "granted" || isInitialized ? "default" : permission === "denied" ? "destructive" : "secondary"}>
              {permission === "granted" || isInitialized
                ? "✓ Abilitate"
                : permission === "denied"
                ? "✗ Negate"
                : "⚠ Da configurare"}
            </Badge>
          </div>
        </div>
        <CardDescription>
          {isNative 
            ? "Ricevi notifiche push native sul tuo dispositivo mobile" 
            : "Ricevi promemoria quotidiani per registrare i tuoi sogni"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isNative && isInitialized && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              ✅ Le notifiche push native sono attive su questo dispositivo!
            </AlertDescription>
          </Alert>
        )}
        
        {isIOS && permission !== "granted" && !isNative && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <strong>Utente iOS/Safari:</strong>
              <ol className="mt-2 ml-4 list-decimal text-sm space-y-1">
                <li>Aggiungi Dream Catcher alla schermata Home</li>
                <li>Apri l'app dalla schermata Home</li>
                <li>Abilita le notifiche quando richiesto</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {permission === "denied" && !isNative && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Le notifiche sono bloccate. Vai nelle impostazioni del browser per abilitarle.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="notifications">Abilita notifiche</Label>
            <p className="text-sm text-muted-foreground">
              Ricevi promemoria per registrare i tuoi sogni
            </p>
          </div>
          <Switch
            id="notifications"
            checked={preferences.enabled}
            onCheckedChange={handleToggle}
            disabled={loading || saving}
          />
        </div>

        {preferences.enabled && (permission === "granted" || isInitialized) && (
          <>
            <div className="space-y-2">
              <Label htmlFor="time">Orario preferito per il promemoria</Label>
              <Select
                value={preferences.preferred_time.substring(0, 5)}
                onValueChange={handleTimeChange}
                disabled={loading || saving}
              >
                <SelectTrigger id="time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isNative && (
              <Button
                variant="outline"
                size="sm"
                onClick={testNotification}
                disabled={loading || saving}
              >
                <TestTube className="mr-2 h-4 w-4" />
                Prova notifica
              </Button>
            )}
          </>
        )}

        {permission !== "granted" && !preferences.enabled && !isNative && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Attiva l'interruttore per abilitare le notifiche. Ti verrà chiesto di concedere il permesso dal browser.
            </AlertDescription>
          </Alert>
        )}

        {saving && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Salvataggio in corso...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationManager;
