import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Zap, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useStats } from "@/hooks/useStats";

const Hero = () => {
  const { stats, loading } = useStats();

  return (
    <section className="pt-24 pb-16 bg-gradient-to-b from-muted/50 to-background">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Heading */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Premium Digital Assets for{" "}
              <span className="text-primary">Roblox Developers</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover high-quality game assets, scripts, and 3D models from talented creators worldwide. 
              Build your dream game with confidence.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button asChild size="lg">
              <Link to="/shop">Browse Marketplace</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/creators">Start Selling</Link>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-2">
                {loading ? "..." : `$${(stats.totalRevenue / 1000).toFixed(1)}K+`}
              </div>
              <div className="text-muted-foreground text-sm">
                Revenue Generated
              </div>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-2">
                {loading ? "..." : stats.totalSales}
              </div>
              <div className="text-muted-foreground text-sm">
                Total Sales
              </div>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-2">
                {loading ? "..." : stats.totalProducts}
              </div>
              <div className="text-muted-foreground text-sm">
                Products Available
              </div>
            </Card>
          </div>

          {/* Trust Badge */}
          <div className="mt-12">
            <p className="text-sm text-muted-foreground">
              Trusted by <span className="font-semibold text-primary">{loading ? "..." : `${stats.totalCreators}+`}</span> developers worldwide
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;