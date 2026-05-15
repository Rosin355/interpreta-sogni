import { startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Users, Headphones, Info, Shield, LogOut, User as UserIcon, Settings, Beaker } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/utils/route-prefetch";

interface MobileMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  onComingSoon: () => void;
  onLogout: () => void;
}

interface MoreItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  comingSoon?: boolean;
  action?: "logout";
  adminOnly?: boolean;
}

export const MobileMoreSheet = ({
  open,
  onOpenChange,
  isSuperAdmin,
  onComingSoon,
  onLogout,
}: MobileMoreSheetProps) => {
  const navigate = useNavigate();

  const items: MoreItem[] = [
    { icon: Users, label: "Sogni Condivisi", href: "/shared-with-me" },
    { icon: Headphones, label: "Percorsi Sonori", comingSoon: true },
    { icon: UserIcon, label: "Profilo", href: "/profile" },
    { icon: Settings, label: "Impostazioni", href: "/settings" },
    { icon: Info, label: "Chi Siamo", href: "/about" },
    ...(isSuperAdmin ? [{ icon: Shield, label: "Admin", href: "/admin" } as MoreItem] : []),
  ];

  const handleClick = (item: MoreItem) => () => {
    onOpenChange(false);
    if (item.comingSoon) {
      Promise.resolve().then(() => onComingSoon());
      return;
    }
    if (item.href) {
      Promise.resolve().then(() => startTransition(() => navigate(item.href!)));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "lg:hidden bg-[#0a0610]/95 backdrop-blur-2xl border-t border-mystic-violet/20",
          "rounded-t-3xl p-0 max-h-[85vh]"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <SheetHeader className="px-6 pt-2 pb-4 text-center">
          <div className="ed-asterism justify-center">
            <span className="ed-line" />
            <span style={{ color: "hsl(var(--mystic-glow))" }}>※</span>
            <span className="ed-line" />
          </div>
          <SheetTitle
            className="font-editorial uppercase tracking-[0.22em] text-foreground text-center pt-3"
            style={{ fontSize: "14px" }}
          >
            Menu
          </SheetTitle>
        </SheetHeader>

        <nav className="px-4 pb-6 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onPointerDown={() => item.href && prefetchRoute(item.href)}
                onClick={handleClick(item)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left",
                  "text-white/75 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors",
                  "min-h-[52px] touch-manipulation"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 font-bodoni-heading tracking-wide text-[15px]">
                  {item.label}
                </span>
                {item.comingSoon && (
                  <span
                    className="text-[9px] uppercase tracking-[0.22em]"
                    style={{ color: "hsl(var(--mystic-glow))" }}
                  >
                    Presto
                  </span>
                )}
              </button>
            );
          })}

          <div className="my-3 h-px bg-white/5" />

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              Promise.resolve().then(() => onLogout());
            }}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left",
              "text-destructive/80 hover:text-destructive hover:bg-destructive/10 active:bg-destructive/15",
              "min-h-[52px] touch-manipulation transition-colors"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="flex-1 font-bodoni-heading tracking-wide text-[15px]">Esci</span>
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMoreSheet;
