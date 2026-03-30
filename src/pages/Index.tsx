import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import HomeHero from "@/components/HomeHero";
import PillarsSection from "@/components/PillarsSection";
import TransformationSection from "@/components/TransformationSection";
import HomeCTA from "@/components/HomeCTA";
import Footer from "@/components/Footer";
import IntroOverlay from "@/components/IntroOverlay";

const hasSeenIntro = () => {
  try {
    return sessionStorage.getItem("intro_seen") === "1";
  } catch {
    return false;
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const forceIntro = searchParams.get("intro") === "1";
  const [showIntro, setShowIntro] = useState(!hasSeenIntro() || forceIntro);

  return (
    <div className="min-h-screen bg-background">
      {showIntro && <IntroOverlay onComplete={() => setShowIntro(false)} />}
      <div className="relative z-10" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <Navigation />
        <HomeHero />
        <PillarsSection />
        <TransformationSection />
        <HomeCTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
