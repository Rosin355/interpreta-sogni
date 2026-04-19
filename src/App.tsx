import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { GlobalNotificationManager } from "@/components/GlobalNotificationManager";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import MysticCursor from "@/components/ui/MysticCursor";
import { MysticLoader } from "@/components/ui/MysticLoader";
import { AppCacheProvider } from "@/contexts/AppCacheContext";
import { RouteProgressBar } from "@/components/loading/RouteProgressBar";
import { RouteFadeTransition } from "@/components/loading/RouteFadeTransition";
import { RouteSwitchOverlay } from "@/components/loading/RouteSwitchOverlay";
import { startRoutePrefetch } from "@/utils/route-prefetch";

// Eager load - Landing page
import Index from "./pages/Index";

// Lazy load - All other pages
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyDreams = lazy(() => import("./pages/MyDreams"));
const NewDream = lazy(() => import("./pages/NewDream"));
const EditDream = lazy(() => import("./pages/EditDream"));
const DreamDetail = lazy(() => import("./pages/DreamDetail"));
const Explore = lazy(() => import("./pages/Explore"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const About = lazy(() => import("./pages/About"));
const Astrology = lazy(() => import("./pages/Astrology"));
const Alchemy = lazy(() => import("./pages/Alchemy"));
const ProfessionalVerification = lazy(() => import("./pages/ProfessionalVerification"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SharedDreams = lazy(() => import("./pages/SharedDreams"));
const SharedDreamsReceived = lazy(() => import("./pages/SharedDreamsReceived"));
const SharedDreamPublic = lazy(() => import("./pages/SharedDreamPublic"));
const AudioLibrary = lazy(() => import("./pages/AudioLibrary"));
const AudioAdmin = lazy(() => import("./pages/AudioAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Mystic loading fallback component
const PageLoader = () => (
  <MysticLoader fullScreen size="lg" text="Entrando nel mondo dei sogni..." />
);

/**
 * Marker montato come figlio del Suspense: incrementa loadingTick quando
 * il chunk lazy della nuova route è effettivamente pronto e renderizzato.
 */
const RouteMountMarker = ({ onMount }: { onMount: () => void }) => {
  const location = useLocation();
  useEffect(() => {
    onMount();
  }, [location.pathname, onMount]);
  return null;
};

const AppRouter = () => {
  const [loadingTick, setLoadingTick] = useState(0);
  const tickRef = useRef(0);
  const handleMount = () => {
    tickRef.current += 1;
    setLoadingTick(tickRef.current);
  };

  useEffect(() => {
    startRoutePrefetch();
  }, []);

  return (
    <>
      <RouteProgressBar loadingTick={loadingTick} />
      <RouteSwitchOverlay loadingTick={loadingTick} />
      <Suspense fallback={<PageLoader />}>
        <RouteMountMarker onMount={handleMount} />
        <RouteFadeTransition>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-dreams" element={<MyDreams />} />
            <Route path="/dreams/new" element={<NewDream />} />
            <Route path="/dreams/:id/edit" element={<EditDream />} />
            <Route path="/dreams/:id" element={<DreamDetail />} />

            <Route path="/explore" element={<Explore />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/astrology" element={<Astrology />} />
            <Route path="/alchemy" element={<Alchemy />} />
            <Route path="/about" element={<About />} />
            <Route path="/professional-verification" element={<ProfessionalVerification />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/shared-dreams" element={<SharedDreams />} />
            <Route path="/shared-with-me" element={<SharedDreamsReceived />} />
            <Route path="/dream/shared/:token" element={<SharedDreamPublic />} />
            <Route path="/audio-library" element={<AudioLibrary />} />
            <Route path="/admin/audio" element={<AudioAdmin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RouteFadeTransition>
      </Suspense>
    </>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <TooltipProvider>
      <AppCacheProvider>
      <GlobalNotificationManager>
        <Toaster />
        <Sonner />
        <MysticCursor />
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </GlobalNotificationManager>
      </AppCacheProvider>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
