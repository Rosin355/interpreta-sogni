import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import ResearchSection from "@/components/ResearchSection";
import ExperienceSection from "@/components/ExperienceSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { ShaderAnimation } from "@/components/ui/shader-animation";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="relative">
        {/* Unified shader background for hero and features */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="h-full w-full">
            <ShaderAnimation />
          </div>
        </div>
        <div className="relative z-10">
          <HeroSection />
          <FeaturesSection />
        </div>
      </div>
      <ResearchSection />
      <ExperienceSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
