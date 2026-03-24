import { useState, useEffect, useCallback } from "react";
import Navigation from "@/components/Navigation";
import HomeHero from "@/components/HomeHero";
import PillarsSection from "@/components/PillarsSection";
import TransformationSection from "@/components/TransformationSection";
import HomeCTA from "@/components/HomeCTA";
import Footer from "@/components/Footer";
import IntroOverlay from "@/components/IntroOverlay";

const Index = () => {
  const [showIntro, setShowIntro] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("intro_seen");
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
          <HomeHero />
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
