import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useStats } from "@/hooks/useStats";

const Index = () => {
  const { products, loading: productsLoading } = useProducts();
  const { stats, loading: statsLoading } = useStats();
  
  // Get featured products (limit to 6 for display)
  const featuredProducts = products
    .filter(product => product.is_featured)
    .slice(0, 6)
    .map(product => ({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image_url || "/placeholder.svg",
      rating: product.rating,
      downloads: product.downloads,
      category: product.category,
      isTopRated: product.is_top_rated,
      isNew: product.is_new
    }));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <Hero />

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Discover our most popular digital assets from top creators
              </p>
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </div>
            )}

            <div className="text-center">
              <Button asChild size="lg">
                <Link to="/shop">
                  View All Products
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose LuzonDev?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The trusted marketplace for digital creators and developers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure Transactions</h3>
              <p className="text-muted-foreground">
                All payments processed securely with instant downloads and buyer protection
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Access</h3>
              <p className="text-muted-foreground">
                Download your purchases immediately after payment with no waiting time
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Quality Assets</h3>
              <p className="text-muted-foreground">
                All assets are reviewed to ensure high quality for your projects
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">
                {statsLoading ? "..." : stats.totalProducts}
              </div>
              <div className="text-muted-foreground">Digital Assets</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">
                {statsLoading ? "..." : stats.totalCreators}
              </div>
              <div className="text-muted-foreground">Active Creators</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">
                {statsLoading ? "..." : stats.totalSales}
              </div>
              <div className="text-muted-foreground">Happy Customers</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our community of creators and start earning money from your digital assets today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/creators">Start Selling</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/shop">Browse Marketplace</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
