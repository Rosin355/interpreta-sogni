import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const hasBeenDismissed = localStorage.getItem('pwa-prompt-dismissed');
    
    if (isStandalone || hasBeenDismissed || !isMobile) {
      return;
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt (Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 10 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 10000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show after 10 seconds
    if (iOS) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 10000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isMobile]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <Card className="w-full max-w-md p-6 pointer-events-auto animate-in slide-in-from-bottom-5 duration-500 shadow-elegant border-primary/20">
        <button
          onClick={handleDismiss}
          className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shrink-0">
              <span className="text-2xl">💭</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">
                Installa Dream's Alchemist
              </h3>
              <p className="text-sm text-muted-foreground">
                Accedi più velocemente e usa l'app offline come un'app nativa
              </p>
            </div>
          </div>

          {isIOS ? (
            <div className="space-y-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
              <p className="font-medium text-foreground">Come installare su iOS:</p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Tocca il pulsante Condividi <span className="inline-block">⬆️</span> in basso</li>
                <li>Scorri e seleziona "Aggiungi a Home"</li>
                <li>Tocca "Aggiungi" in alto a destra</li>
              </ol>
            </div>
          ) : (
            <Button 
              onClick={handleInstallClick}
              className="w-full"
              size="lg"
            >
              Installa Ora
            </Button>
          )}

          <button
            onClick={handleDismiss}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Non mostrare più
          </button>
        </div>
      </Card>
    </div>
  );
};
