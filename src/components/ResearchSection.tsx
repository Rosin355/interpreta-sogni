import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const dreamPatterns = [
  "Flying", "Falling", "Chase", "Lost", "Water", 
  "Family", "Childhood", "Test", "Late", "Teeth"
];

const ResearchSection = () => {
  return (
    <section id="research" className="py-24 bg-gradient-to-b from-secondary/10 to-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Mapping the Dreamverse Together
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
            Our global dream research initiative aims to map collective dream patterns, understand emotional contexts, 
            and create a comprehensive atlas of the human dreamscape. By participating, you contribute to ground-breaking 
            research about how we dream.
          </p>
          <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium">
            Explore Research Insights
          </Button>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Research benefits */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-primary text-xl">🔒</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">Anonymized Contributions</h4>
                  <p className="text-muted-foreground">
                    Your dream data is shared anonymously to protect your privacy while advancing our understanding
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-primary text-xl">🧠</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">Pattern Recognition</h4>
                  <p className="text-muted-foreground">
                    Advanced algorithms identify patterns across thousands of dreams, revealing shared human experiences
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - Dream patterns and stats */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">Global Dream Patterns</h3>
              <div className="grid grid-cols-2 gap-3">
                {dreamPatterns.map((pattern, index) => (
                  <Card key={index} className="bg-gradient-to-r from-card/60 to-card/30 border-border/30 p-4 text-center hover:from-primary/10 hover:to-primary/5 transition-all duration-300">
                    <span className="text-foreground font-medium">{pattern}</span>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-card/80 to-card/40 border border-border/50 rounded-2xl p-8">
              <p className="text-sm text-muted-foreground mb-4">Analyzing dream patterns across</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-primary">10,000+</span>
                  <span className="text-muted-foreground">recorded dreams worldwide</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-blue-400">42%</span>
                  <span className="text-muted-foreground">report emotional dreams</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-green-400">23%</span>
                  <span className="text-muted-foreground">experience lucid dreams</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-purple-400">78%</span>
                  <span className="text-muted-foreground">recall dreams weekly</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResearchSection;