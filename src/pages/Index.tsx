import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import ResearchSection from "@/components/ResearchSection";
import ExperienceSection from "@/components/ExperienceSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <ResearchSection />
      <ExperienceSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
