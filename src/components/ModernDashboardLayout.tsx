import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Menu, 
  X,
  Settings,
  User as UserIcon,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "./UserMenu";
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
}

const NavItem = ({ icon: Icon, label, href, active, collapsed }: NavItemProps) => {
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
        <span className="text-sm font-medium tracking-wide">{label}</span>
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

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: BookOpen, label: "I Miei Sogni", href: "/my-dreams" },
    { icon: Sparkles, label: "Astrologia", href: "/astrology" },
    { icon: Beaker, label: "Alchimia", href: "/alchemy" },
    { icon: Users, label: "Sogni Condivisi", href: "/shared-with-me" },
    { icon: Headphones, label: "Percorsi Audio", href: "/audio-library" },
    { icon: Info, label: "Chi Siamo", href: "/about" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Disconnesso", description: "A presto!" });
    navigate("/");
  };

  return (
    <div className="relative min-h-screen bg-[#030303] text-white overflow-hidden font-sans">
      {/* Background Image Layer */}
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between bg-black/20 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold tracking-tight">ALCHEMIST</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-white/70 hover:text-white"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 transition-all duration-500 ease-in-out",
          "hidden lg:flex flex-col bg-black/20 backdrop-blur-2xl border-r border-white/5",
          "w-64"
        )}
      >
        <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold tracking-tighter text-xl">ALCHEMIST</span>
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavItem 
              key={item.href} 
              {...item} 
              active={location.pathname === item.href} 
              collapsed={false} 
            />
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Button 
            onClick={() => navigate("/dreams/new")}
            className="w-full bg-primary hover:bg-primary/80 text-white rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="ml-2">Nuovo Sogno</span>
          </Button>
          
          <button 
            onClick={handleLogout}
            className="mt-4 w-full flex items-center gap-3 px-3 py-2 text-white/40 hover:text-destructive transition-colors rounded-xl hover:bg-destructive/5"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Esci</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed inset-0 z-40 bg-black/90 backdrop-blur-2xl lg:hidden flex flex-col p-8 pt-24"
          >
            <nav className="flex-1 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 text-2xl font-semibold",
                    location.pathname === item.href ? "text-primary" : "text-white/60"
                  )}
                >
                  <item.icon className="w-8 h-8" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button 
              onClick={() => { navigate("/dreams/new"); setIsMobileMenuOpen(false); }}
              className="w-full bg-primary text-white py-6 text-xl rounded-2xl mt-8"
            >
              Nuovo Sogno
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className={cn(
        "relative z-10 min-h-screen transition-all duration-500 ease-in-out flex flex-col",
        "pt-16 lg:pt-0",
        "lg:ml-64"
      )}>
        {/* Top Header */}
        <header className="h-20 px-8 hidden lg:flex items-center justify-between sticky top-0 z-30 bg-[#030303]/40 backdrop-blur-md border-b border-white/5">
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

        {/* Content Wrapper */}
        <div className="p-8 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </div>

        {/* Minimal Dashboard Footer */}
        <footer className="p-8 pt-0 mt-auto border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/20">
          <p>© 2026 Dream Alchemist. Tutti i diritti riservati.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white/40 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/40 transition-colors">Termini</a>
            <a href="#" className="hover:text-white/40 transition-colors">Supporto</a>
          </div>
        </footer>
      </main>
    </div>
  );
};
