import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  // Featured products
  const featuredProducts = [
    {
      id: "1",
      title: "Advanced Sword Combat System",
      price: 24.99,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
      rating: 4.8,
      downloads: 2340,
      category: "Scripts",
      isTopRated: true,
    },
    {
      id: "2",
      title: "Military Barrier Pack",
      price: 15.99,
      image: "https://images.unsplash.com/photo-1586953983027-d7508698d048?w=400&h=300&fit=crop",
      rating: 4.6,
      downloads: 1890,
      category: "3D Models",
      isTopRated: true,
    },
    {
      id: "3",
      title: "Village of Cobasna",
      price: 45.00,
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
      rating: 4.9,
      downloads: 567,
      category: "Maps",
      isTopRated: true,
    },
    {
      id: "4",
      title: "Five Seven Weapon",
      price: 8.99,
      image: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400&h=300&fit=crop",
      rating: 4.5,
      downloads: 3200,
      category: "3D Models",
    },
  ];

  const features = [
    {
      icon: Shield,
      title: "Secure Transactions",
      description: "All payments are processed securely with instant downloads and purchase protection.",
    },
    {
      icon: Zap,
      title: "Instant Access",
      description: "Download your purchases immediately after payment with no waiting time.",
    },
    {
      icon: Sparkles,
      title: "Premium Quality",
      description: "All assets are curated and tested to ensure the highest quality for your projects.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <Hero />

      {/* Featured Products */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold gradient-text mb-4">Featured Products</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover our most popular and highest-rated assets from top creators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {featuredProducts.map((product, index) => (
              <div 
                key={product.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ProductCard {...product} />
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/shop">
              <Button size="lg" variant="outline" className="bg-card/30 border-primary/30 hover:border-primary group">
                View All Products
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold gradient-text mb-4">Why Choose ClearlyDev?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The most trusted marketplace for Roblox developers and creators worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={feature.title} 
                  className="glass p-8 text-center hover-lift"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gradient-primary glow-primary mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <Card className="glass p-12 text-center">
            <h2 className="text-4xl font-bold gradient-text mb-4">
              Ready to Start Selling?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of creators earning money by selling their Roblox assets. 
              Start your journey today and turn your creativity into income.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button size="lg" className="btn-gaming text-lg px-8 py-4">
                  Start Selling Today
                </Button>
              </Link>
              <Link to="/shop">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-4 border-primary/30 hover:border-primary bg-card/30"
                >
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
