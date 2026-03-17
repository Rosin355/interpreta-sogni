import { useState } from "react";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const [loading, setLoading] = useState(false);

  const subscribe = async () => {
    setLoading(true);
    toast.error("Le notifiche push via service worker sono state disattivate in questa versione web.");
    setLoading(false);
    return false;
  };

  const unsubscribe = async () => {
    setLoading(true);
    toast.error("Non ci sono sottoscrizioni push PWA attive da gestire.");
    setLoading(false);
    return false;
  };

  return {
    isSupported: false,
    isSubscribed: false,
    loading,
    subscribe,
    unsubscribe,
  };
};