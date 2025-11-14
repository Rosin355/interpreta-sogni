import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, TestTube } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

  useEffect(() => {
    loadPreferences();
    checkPermission();
  }, []);

  const checkPermission = () => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  };

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const updatedPrefs = { ...preferences, ...newPreferences };
    
    // Ensure time format is HH:MM:SS
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
        title: "Errore",
        description: "Impossibile salvare le preferenze",
        variant: "destructive",
      });
    } else {
      setPreferences(updatedPrefs);
      toast({
        title: "Salvato",
        description: "Preferenze notifiche aggiornate",
      });
      scheduleNotification(updatedPrefs.preferred_time);
    }

    setLoading(false);
  };

  const scheduleNotification = (time: string) => {
    if (!preferences.enabled || permission !== "granted") return;

    const [hours, minutes] = time.split(":").map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime();

    // Store timeout ID in localStorage to persist across page reloads
    const timeoutId = setTimeout(() => {
      showNotification();
      // Schedule next day
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

      // Update last notification sent
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
    if (enabled && permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return;
    }
    await savePreferences({ enabled });
  };

  const handleTimeChange = async (time: string) => {
    await savePreferences({ preferred_time: time });
  };

  const testNotification = () => {
    if (permission !== "granted") {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {preferences.enabled ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
            <CardTitle>Promemoria Mattutini</CardTitle>
          </div>
          <Badge variant={permission === "granted" ? "default" : permission === "denied" ? "destructive" : "secondary"}>
            {permission === "granted" ? "Attivo" : permission === "denied" ? "Negato" : "Non configurato"}
          </Badge>
        </div>
        <CardDescription>
          Ricevi una notifica ogni mattina per registrare i tuoi sogni
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="notifications-enabled">Abilita notifiche</Label>
          <Switch
            id="notifications-enabled"
            checked={preferences.enabled}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        {preferences.enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="notification-time">Orario preferito</Label>
              <Select value={preferences.preferred_time} onValueChange={handleTimeChange} disabled={loading}>
                <SelectTrigger id="notification-time">
                  <SelectValue placeholder="Seleziona orario" />
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

            <Button
              variant="outline"
              size="sm"
              onClick={testNotification}
              disabled={permission !== "granted"}
              className="w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Testa notifica
            </Button>
          </>
        )}

        {permission === "default" && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            💡 Quando abiliti le notifiche, ti verrà chiesto di concedere il permesso dal browser
          </div>
        )}

        {permission === "denied" && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            ⚠️ Hai negato il permesso per le notifiche. Per attivarle, vai nelle impostazioni del browser e consenti le notifiche per questo sito.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationManager;
