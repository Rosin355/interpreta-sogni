import { Sparkles } from "lucide-react";

const MESSAGE =
  "Dream Alchemist è gratuita fino al 19 luglio 2026 — approfitta del lancio e accedi a tutto senza limiti";

export const LaunchAnnouncementBar = () => {
  // Repeat the message so the marquee reads continuously
  const items = Array.from({ length: 6 });

  return (
    <div className="fixed top-0 inset-x-0 z-[60] h-8 overflow-hidden border-b border-primary/20 bg-gradient-to-r from-[#1a0020] via-[#2a0030] to-[#1a0020] backdrop-blur-md">
      <div className="relative flex h-full items-center">
        <div className="flex animate-launch-marquee whitespace-nowrap will-change-transform">
          {items.map((_, i) => (
            <span
              key={i}
              className="flex items-center gap-3 px-8 text-[11px] uppercase tracking-[0.25em] text-white/85"
            >
              <Sparkles className="h-3 w-3 text-primary shrink-0" />
              {MESSAGE}
              <span className="text-primary/60">✦</span>
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes launch-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-launch-marquee {
          animation: launch-marquee 38s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-launch-marquee { animation: none; }
        }
      `}</style>
    </div>
  );
};
