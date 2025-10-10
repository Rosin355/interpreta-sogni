import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import ResearchSection from "@/components/ResearchSection";
import ExperienceSection from "@/components/ExperienceSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { DreamyBackground } from "@/components/animations/DreamyBackground";
import { initScrollAnimations } from "@/utils/gsap-animations";

const Index = () => {
  useEffect(() => {
    // Initialize GSAP scroll animations
    initScrollAnimations();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* WebGL Dreamy Background */}
      <DreamyBackground />
      
      {/* Content */}
      <div className="relative z-10">
        <Navigation />
        <HeroSection />
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
