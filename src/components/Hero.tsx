import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  const stats = [
    { label: "Processed Sales", value: "$2.1M+", icon: TrendingUp },
    { label: "Total Purchases", value: "11.5K+", icon: Zap },
    { label: "Products Uploaded", value: "24.3K+", icon: Shield },
  ];

  return (
    <section className="min-h-screen flex items-center justify-center pt-20 pb-10">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Heading */}
          <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              The All-In-One Platform{" "}
              <span className="gradient-text">for Roblox Developers</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Discover premium game assets, scripts, and 3D models from the world's 
              most talented creators. Build your dream game today.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 animate-fade-in-up">
            <Link to="/shop">
              <Button size="lg" className="btn-gaming text-lg px-8 py-4 group">
                Browse Marketplace
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-4 border-primary/30 hover:border-primary bg-card/30 backdrop-blur-sm"
              >
                Start Selling
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 animate-fade-in">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card 
                  key={stat.label} 
                  className="glass p-6 hover-lift group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-3 rounded-lg bg-gradient-primary glow-primary group-hover:animate-glow-pulse">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold gradient-text mb-2">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {stat.label}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Featured Badge */}
          <div className="mt-16 animate-fade-in">
            <div className="inline-flex items-center px-6 py-3 rounded-full glass border border-primary/30 glow-primary">
              <Zap className="w-4 h-4 text-primary mr-2 animate-float" />
              <span className="text-sm font-medium">
                Trusted by <span className="text-primary font-bold">10,000+</span> developers worldwide
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      </div>
    </section>
  );
};

export default Hero;