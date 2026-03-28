import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import PillarsSection from "@/components/PillarsSection";
import TransformationSection from "@/components/TransformationSection";
import HomeCTA from "@/components/HomeCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <Navigation />
        <HeroSection />
        <PillarsSection />
        <TransformationSection />
        <HomeCTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
