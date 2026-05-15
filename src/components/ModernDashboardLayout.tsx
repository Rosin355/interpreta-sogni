import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Beaker,
  Users,
  Headphones,
  Info,
  Plus,
  Search,
  Bell,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "./UserMenu";
import ComingSoonDialog from "./ComingSoonDialog";
import MobileBottomNav from "./mobile/MobileBottomNav";
import MobileMoreSheet from "./mobile/MobileMoreSheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import dashboardBg from "@/assets/mystic-dashboard-bg.png";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
  collapsed?: boolean;
  comingSoon?: boolean;
  onComingSoonClick?: () => void;
}

const NavItem = ({ icon: Icon, label, href, active, collapsed, comingSoon, onComingSoonClick }: NavItemProps) => {
  if (comingSoon) {
    return (
      <button
        type="button"
        onClick={onComingSoonClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group relative text-left",
          "text-white/45 hover:text-white/80 hover:bg-white/5"
        )}
      >
        <Icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
        {!collapsed && (
          <>
            <span className="text-sm font-bodoni-heading tracking-wide flex-1">{label}</span>
            <span
              className="text-[9px] uppercase tracking-[0.22em]"
              style={{ color: "hsl(var(--mystic-glow))" }}
            >
              Presto
            </span>
          </>
        )}
      </button>
    );
  }
  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group relative",
        active 
          ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10" 
          : "text-white/60 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className={cn("w-5 h-5 shrink-0", active ? "text-white" : "group-hover:scale-110 transition-transform")} />
      {!collapsed && (
        <span className="text-sm font-bodoni-heading tracking-wide">{label}</span>
      )}
      {active && (
        <motion.div 
          layoutId="activeNav"
          className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  );
};

export const ModernDashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc('is_super_admin', { _user_id: user.id });
      if (!cancelled) setIsSuperAdmin(!!data);
    })();
    return () => { cancelled = true; };
  }, []);

  const navItems: Array<{ icon: React.ElementType; label: string; href: string; comingSoon?: boolean }> = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: BookOpen, label: "I Miei Sogni", href: "/my-dreams" },
    { icon: Sparkles, label: "Astrologia", href: "/astrology" },
    { icon: Beaker, label: "Alchimia", href: "/alchemy" },
    { icon: Headphones, label: "Percorsi Sonori", href: "/audio-library", comingSoon: true },
    { icon: Users, label: "Sogni Condivisi", href: "/shared-with-me" },
    { icon: Info, label: "Chi Siamo", href: "/about" },
    ...(isSuperAdmin ? [{ icon: Shield, label: "Admin", href: "/admin" }] : []),
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Disconnesso", description: "A presto!" });
    navigate("/");
  };

  const openMobileMenu = () => {
    // Prefetch differito: non saturare il main thread al primo tap del menu
    setIsMobileMenuOpen((open) => !open);
  };

  return (
    <div className="relative h-screen bg-[#030303] text-white overflow-hidden font-sans flex">
      {/* Background Image Layer (Fixed to Viewport) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img 
          src={dashboardBg} 
          alt="Dashboard Background" 
          className="w-full h-full object-cover opacity-40 scale-105 blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303]/80 via-transparent to-[#030303]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-transparent to-transparent" />
      </div>

      {/* Decorative Glows */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none z-0" />

      {/* Mobile TopBar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between bg-black/60 backdrop-blur-xl border-b border-white/5 z-50">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/dreamalchemist_logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-editorial uppercase tracking-[0.1em] text-sm">DREAM ALCHEMIST</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifiche"
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full text-white/70 hover:text-white active:bg-white/10"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
          </button>
          <UserMenu />
        </div>
      </div>

      {/* Sidebar - Truly Fixed Height and Position */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col bg-black/40 backdrop-blur-3xl border-r border-white/5",
          "w-64 h-full shrink-0 relative z-40"
        )}
      >
        <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/dreamalchemist_logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-editorial uppercase tracking-[0.12em] text-lg text-white whitespace-nowrap">DREAM ALCHEMIST</span>
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={location.pathname === item.href}
              collapsed={false}
              onComingSoonClick={() => setComingSoonOpen(true)}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <Button 
            onClick={() => navigate("/dreams/new")}
            className="w-full bg-primary hover:bg-primary/80 text-white rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="ml-2">Nuovo Sogno</span>
          </Button>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-white/40 hover:text-destructive transition-colors rounded-xl hover:bg-destructive/5"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Esci</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay - no AnimatePresence to avoid exit animation race */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-2xl lg:hidden flex flex-col p-4 pt-24"
          style={{ animation: "menuFadeIn 140ms ease-out both" }}
        >
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const handleNav = (e: React.MouseEvent | React.PointerEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMobileMenuOpen(false);
                if (item.comingSoon) {
                  Promise.resolve().then(() => setComingSoonOpen(true));
                  return;
                }
                if (!isActive) {
                  Promise.resolve().then(() => {
                    startTransition(() => navigate(item.href));
                  });
                }
              };
              return (
                <button
                  type="button"
                  key={item.href}
                  onPointerDown={() => { if (!item.comingSoon) prefetchRoute(item.href); }}
                  onFocus={() => { if (!item.comingSoon) prefetchRoute(item.href); }}
                  onClick={handleNav}
                  className={cn(
                    "relative flex w-full min-h-[64px] items-center gap-4 rounded-xl px-4 py-3 text-2xl font-bodoni-heading tracking-wide text-left active:bg-white/10 transition-colors touch-manipulation",
                    item.comingSoon ? "text-white/45" : isActive ? "text-primary bg-white/5" : "text-white/70"
                  )}
                >
                  <item.icon className="w-8 h-8 shrink-0" />
                  <span className="flex-1 leading-none">{item.label}</span>
                  {item.comingSoon && (
                    <span
                      className="text-[10px] uppercase tracking-[0.24em]"
                      style={{ color: "hsl(var(--mystic-glow))" }}
                    >
                      Presto
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <Button
            type="button"
            onPointerDown={() => prefetchRoute("/dreams/new")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMobileMenuOpen(false);
              Promise.resolve().then(() => {
                startTransition(() => navigate("/dreams/new"));
              });
            }}
            className="w-full bg-primary text-white py-6 text-xl rounded-2xl mt-8 touch-manipulation"
          >
            Nuovo Sogno
          </Button>
          <style>{`@keyframes menuFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
        </div>
      )}

      {/* Main Content Area - Fixed Height with Internal Scroll */}
      <main className={cn(
        "relative z-10 h-full flex-1 flex flex-col overflow-hidden",
        "pt-16 lg:pt-0"
      )}>
        {/* Top Header */}
        <header className="h-20 px-8 hidden lg:flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5 shrink-0">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-2 w-96 group focus-within:border-primary/50 transition-all">
            <Search className="w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Cerca tra i tuoi sogni..." 
              className="bg-transparent border-none focus:ring-0 text-sm ml-3 w-full text-white placeholder:text-white/30"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-white/60 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
            </button>
            <div className="h-8 w-px bg-white/10" />
            <UserMenu />
          </div>
        </header>

        {/* Scrollable Content Wrapper */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>

          {/* Minimal Dashboard Footer - Now properly inside the scroll area */}
          <footer className="mt-20 border-t border-white/5 pt-8 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/20">
            <p>© 2026 Dream Alchemist. Tutti i diritti riservati.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white/40 transition-colors">Privacy</a>
              <a href="#" className="hover:text-white/40 transition-colors">Termini</a>
              <a href="#" className="hover:text-white/40 transition-colors">Supporto</a>
            </div>
          </footer>
        </div>
      </main>
      <ComingSoonDialog open={comingSoonOpen} onOpenChange={setComingSoonOpen} />
    </div>
  );
};
