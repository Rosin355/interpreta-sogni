import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

declare global {
  interface Window {
    WonderPush: any;
  }
}

export const useWonderPush = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [installationId, setInstallationId] = useState<string | null>(null);

  useEffect(() => {
    const isNativeApp = Capacitor.isNativePlatform();
    setIsNative(isNativeApp);

    if (isNativeApp) {
      initializeNativePush();
    }
  }, []);

  const initializeNativePush = async () => {
    try {
      // Check permissions
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission denied');
        return;
      }

      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();

      // Listen for registration
      await PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ', token.value);
        
        // Save device token to database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveDeviceToken(user.id, token.value, Capacitor.getPlatform());
          setInstallationId(token.value);
        }

        setIsInitialized(true);
      });

      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ', error);
        toast.error('Errore nella registrazione delle notifiche push');
      });

      // Listen for push notifications received
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification) => {
          console.log('Push notification received: ', notification);
          toast.info(notification.title || 'Nuova notifica', {
            description: notification.body,
          });
        }
      );

      // Listen for push notification actions
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification) => {
          console.log('Push notification action performed', notification);
          // Navigate to /dreams/new when notification is tapped
          if (notification.notification.data?.action === 'record_dream') {
            window.location.href = '/dreams/new';
          }
        }
      );
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      toast.error('Errore nell\'inizializzazione delle notifiche push');
    }
  };

  const saveDeviceToken = async (
    userId: string,
    token: string,
    platform: string
  ) => {
    try {
      const { error } = await supabase.from('wonderpush_devices').upsert({
        user_id: userId,
        installation_id: token,
        device_platform: platform,
        device_model: Capacitor.getPlatform(),
      });

      if (error) throw error;
      console.log('Device token saved successfully');
    } catch (error) {
      console.error('Error saving device token:', error);
    }
  };

  const unregister = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && installationId) {
        // Remove from database
        await supabase
          .from('wonderpush_devices')
          .delete()
          .eq('user_id', user.id)
          .eq('installation_id', installationId);
      }

      // Unregister from system
      await PushNotifications.removeAllListeners();
      setIsInitialized(false);
      setInstallationId(null);
      
      toast.success('Notifiche push disattivate');
    } catch (error) {
      console.error('Error unregistering push:', error);
      toast.error('Errore nella disattivazione delle notifiche');
    }
  };

  return {
    isNative,
    isInitialized,
    installationId,
    unregister,
  };
};
