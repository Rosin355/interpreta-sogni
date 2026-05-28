import { startTransition } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, Sparkles, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/utils/route-prefetch";

interface TabItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const TABS: TabItem[] = [
  { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
  { icon: BookOpen, label: "Diario", href: "/my-dreams" },
  { icon: Sparkles, label: "Astro", href: "/astrology" },
];

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export const MobileBottomNav = ({ onMoreClick }: MobileBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === href) return;
    Promise.resolve().then(() => startTransition(() => navigate(href)));
  };

  const renderTab = (tab: TabItem) => {
    const active = location.pathname === tab.href;
    const Icon = tab.icon;
    return (
      <button
        key={tab.href}
        type="button"
        aria-label={tab.label}
        aria-current={active ? "page" : undefined}
        onPointerDown={() => prefetchRoute(tab.href)}
        onFocus={() => prefetchRoute(tab.href)}
        onClick={go(tab.href)}
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] touch-manipulation transition-colors",
          active ? "text-white" : "text-white/55 hover:text-white/80 active:text-white"
        )}
      >
        {active && (
          <span
            aria-hidden
            className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
            style={{
              background: "hsl(var(--mystic-glow))",
              boxShadow: "0 0 12px hsl(var(--mystic-glow) / 0.8)",
            }}
          />
        )}
        <Icon
          className={cn("w-5 h-5 transition-transform", active && "scale-110")}
          style={active ? { filter: "drop-shadow(0 0 6px hsl(var(--mystic-glow) / 0.6))" } : undefined}
        />
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-bodoni-heading leading-none"
          style={active ? { color: "hsl(var(--mystic-glow))" } : undefined}
        >
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Navigazione principale"
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-[60]",
        "bg-black/85 backdrop-blur-2xl border-t border-white/10"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Glow superiore */}
      <div
        aria-hidden
        className="absolute inset-x-0 -top-px h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--mystic-glow) / 0.4) 50%, transparent 100%)",
        }}
      />

      <div className="relative flex items-stretch justify-around px-2 pt-1">
        {renderTab(TABS[0])}
        {renderTab(TABS[1])}

        {/* FAB centrale */}
        <div className="flex flex-col items-center justify-end flex-1">
          <button
            type="button"
            aria-label="Nuovo Sogno"
            onPointerDown={() => prefetchRoute("/dreams/new")}
            onClick={(e) => {
              e.preventDefault();
              Promise.resolve().then(() =>
                startTransition(() => navigate("/dreams/new"))
              );
            }}
            className={cn(
              "relative -translate-y-4 flex items-center justify-center",
              "w-14 h-14 rounded-full",
              "bg-gradient-to-br from-primary to-purple-600",
              "border border-white/20",
              "shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.7)]",
              "active:scale-95 transition-transform touch-manipulation"
            )}
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full opacity-60 blur-md"
              style={{ background: "hsl(var(--primary) / 0.5)" }}
            />
            <Plus className="relative w-7 h-7 text-white" strokeWidth={2.5} />
          </button>
          <span
            className="text-[9px] uppercase tracking-[0.18em] font-bodoni-heading leading-none -mt-2 mb-1 text-white/70"
          >
            Nuovo
          </span>
        </div>

        {renderTab(TABS[2])}

        {/* Tab "Altro" */}
        <button
          type="button"
          aria-label="Altro"
          onClick={onMoreClick}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-white/55 hover:text-white/80 active:text-white touch-manipulation transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-[0.18em] font-bodoni-heading leading-none">
            Altro
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
