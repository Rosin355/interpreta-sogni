import { Card } from "@/components/ui/card";

const features = [
  {
    icon: "🌙",
    title: "Dream Journal",
    description: "Record and explore your dreams in a private digital journal with intelligent analysis"
  },
  {
    icon: "🔄",
    title: "Dream Patterns",
    description: "Discover recurring themes and emotions in your dream history with visual analytics"
  },
  {
    icon: "👥",
    title: "Dream Circles",
    description: "Share dreams with trusted friends or dream circles and gain new perspectives"
  },
  {
    icon: "🌍",
    title: "Research Initiative",
    description: "Contribute to our global dream research and help map the collective dreamscape"
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-background to-secondary/10">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Unlock the Power of Your Dreams
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Our intuitive tools help you document, analyze, and understand your dreams while 
            participating in groundbreaking dream research.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gradient-to-br from-card/80 to-card/40 border-border/50 p-8 hover:scale-105 transition-transform duration-300">
              <div className="text-center space-y-4">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;