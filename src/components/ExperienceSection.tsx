const ExperienceSection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-secondary/10">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Experience Dream Catcher
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Document, analyze, and share your dreams with our intuitive interface
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left side - App Interface Preview */}
          <div className="relative">
            <div className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border border-border/50 rounded-3xl p-8 shadow-2xl">
              <div className="bg-secondary/30 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Dream Catcher - My Dreams</h3>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center">
                        <span className="text-blue-200 text-sm">🌊</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Ocean Journey</h4>
                        <p className="text-sm text-muted-foreground">Swimming with dolphins in crystal clear water...</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/30 rounded-full flex items-center justify-center">
                        <span className="text-green-200 text-sm">🌳</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Forest Adventure</h4>
                        <p className="text-sm text-muted-foreground">Walking through an enchanted forest...</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center">
                        <span className="text-purple-200 text-sm">✨</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Flying Dream</h4>
                        <p className="text-sm text-muted-foreground">Soaring above the clouds with complete freedom...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - Features */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Detailed Dream Journal</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Record every detail of your dreams with emotion tagging, person recognition, and rich content formatting.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Pattern Analysis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Identify recurring themes, emotions and patterns in your dream history with visual analytics.
                </p>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Dream Sharing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Share dreams selectively with friends or dream circles to gain new perspectives.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;