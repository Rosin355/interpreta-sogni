import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import ManifestoSection from "@/components/ManifestoSection";
import FeaturesSection from "@/components/FeaturesSection";
import ResearchSection from "@/components/ResearchSection";
import ExperienceSection from "@/components/ExperienceSection";

import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <Navigation />
        <HeroSection />
        <ManifestoSection />
        <FeaturesSection />
        <ResearchSection />
        <ExperienceSection />
        
        <CTASection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
