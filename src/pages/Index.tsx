import { useState, useEffect, useCallback } from "react";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import PillarsSection from "@/components/PillarsSection";
import TransformationSection from "@/components/TransformationSection";
import HomeCTA from "@/components/HomeCTA";
import Footer from "@/components/Footer";
import IntroOverlay from "@/components/IntroOverlay";

const getIntroSeen = () => {
  try {
    return sessionStorage.getItem("intro_seen");
  } catch {
    return null;
  }
};

const clearIntroSeen = () => {
  try {
    sessionStorage.removeItem("intro_seen");
  } catch {
    // Ignore storage failures and fallback to showing intro.
  }
};

const Index = () => {
  const [showIntro, setShowIntro] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    // Clear intro flag on page load to allow re-viewing during development
    // In production, the intro shows once per browser session
    const urlParams = new URLSearchParams(window.location.search);
    const forceIntro = urlParams.get("intro") === "1";
    
    if (forceIntro) {
      clearIntroSeen();
    }
    
    const seen = getIntroSeen();
    if (!seen) {
      setShowIntro(true);
    } else {
      setIntroComplete(true);
    }
  }, []);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    setIntroComplete(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {showIntro && <IntroOverlay onComplete={handleIntroComplete} />}

      {introComplete && (
        <div className="relative z-10" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <Navigation />
          <HeroSection />
          <PillarsSection />
          <TransformationSection />
          <HomeCTA />
          <Footer />
        </div>
      )}
    </div>
  );
};

export default Index;
