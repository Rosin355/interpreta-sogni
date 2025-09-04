import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background/95 to-secondary/20">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_50%)]" />
      
      <div className="container mx-auto px-6 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left side - Text content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Explore the{" "}
                <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                  Universe
                </span>{" "}
                of Your Dreams
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                Record, analyze, and discover patterns in your dreams while contributing to groundbreaking dream research.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium px-8 py-6 text-lg">
                Get Started
              </Button>
              <Button variant="outline" size="lg" className="border-primary/30 text-foreground hover:bg-primary/10 px-8 py-6 text-lg">
                Explore Dreams
              </Button>
            </div>
            
            {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-8">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">10,000+ Dreams Recorded</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">1,500+ Research Contributors</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-sm text-muted-foreground">75+ Countries</span>
              </div>
            </div>
          </div>
          
          {/* Right side - Dream Journal UI Preview */}
          <div className="relative">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Dream Journal</h3>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Record your dreams with rich details and emotional context
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/30 rounded-lg p-4 h-24 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
                    <span className="text-xs text-muted-foreground relative z-10">Flying</span>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-4 h-24 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-foreground">Black & White</span>
                    <span className="text-xs text-muted-foreground">Vivid</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 bg-green-500/30 rounded-full" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Nature Scene</span>
                      <p className="text-xs text-muted-foreground">Peaceful meadow with flowing water</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;