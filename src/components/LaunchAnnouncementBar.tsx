import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLaunchSettings } from "@/hooks/useLaunchSettings";

const MESSAGE =
  "Dream Alchemist è gratuita fino al 19 luglio 2026 — approfitta del lancio con uno sconto imperdibile.";

const STORAGE_KEY = "launch_bar_hidden_until";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const LaunchAnnouncementBar = () => {
  const { enabled, loading } = useLaunchSettings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const until = raw ? parseInt(raw, 10) : 0;
      setVisible(!until || Date.now() > until);
    } catch {
      setVisible(true);
    }
  }, []);

  const handleHide = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + SEVEN_DAYS_MS));
    } catch {}
    setVisible(false);
  };

  // Sync bar height as CSS var so navbar can offset itself responsively
  useEffect(() => {
    const active = !loading && enabled && visible;
    const root = document.documentElement;
    const update = () => {
      const isMobile = window.matchMedia("(max-width: 639px)").matches;
      root.style.setProperty(
        "--launch-bar-h",
        active ? (isMobile ? "36px" : "32px") : "0px",
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      root.style.setProperty("--launch-bar-h", "0px");
    };
  }, [loading, enabled, visible]);

  if (loading || !enabled || !visible) return null;

  const items = Array.from({ length: 6 });

  return (
    <div
      role="region"
      aria-label="Annuncio di lancio gratuito"
      className="fixed top-0 inset-x-0 z-[60] h-9 sm:h-8 overflow-hidden border-b border-primary/30 bg-gradient-to-r from-[#1a0020] via-[#2a0030] to-[#1a0020] backdrop-blur-md"
    >
      <div className="relative flex h-full items-center pr-10">
        <div
          className="flex animate-launch-marquee whitespace-nowrap will-change-transform motion-reduce:animate-none"
          aria-hidden="true"
        >
          {items.map((_, i) => (
            <span
              key={i}
              className="flex items-center gap-3 px-8 text-[11px] sm:text-[12px] uppercase tracking-[0.22em] text-white font-medium"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
            >
              <Sparkles className="h-3 w-3 text-primary shrink-0" />
              {MESSAGE}
              <span className="text-primary/70">✦</span>
            </span>
          ))}
        </div>

        {/* Screen reader only static message */}
        <span className="sr-only">{MESSAGE}</span>

        <button
          type="button"
          onClick={handleHide}
          aria-label="Nascondi annuncio per 7 giorni"
          className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <style>{`
        @keyframes launch-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-launch-marquee {
          animation: launch-marquee 38s linear infinite;
        }
      `}</style>
    </div>
  );
};
