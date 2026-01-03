import { useState, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Moon, Sun, ArrowRight, Search, LayoutDashboard } from "lucide-react";

const Index = () => {
  const { products, loading: productsLoading } = useProducts();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  
  // Smart algorithm to automatically feature products
  const getFeaturedProducts = () => {
    if (products.length === 0) return [];

    const scoredProducts = products.map(product => {
      let score = 0;
      score += (product.rating / 5) * 50;
      const downloadScore = Math.min(30, Math.log10(product.downloads + 1) * 10);
      score += downloadScore;
      const daysSinceCreation = (Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 20 - (daysSinceCreation / 7));
      score += recencyScore;
      if (product.is_featured) score += 100;
      if (product.is_top_rated) score += 50;
      if (product.is_new) score += 25;
      return { ...product, qualityScore: score };
    });

    return scoredProducts
      .sort((a, b) => b.qualityScore - a.qualityScore)
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
        isNew: product.is_new,
        creatorId: product.creator_id
      }));
  };

  const featuredProducts = getFeaturedProducts();

  // Get feed items
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const feedItems: any[] = [];

        // Show recent products in feed
        if (products.length > 0) {
          const recentProducts = products
            .slice(0, 5)
            .map(p => ({ 
              ...p, 
              type: 'product',
              creator: p.creator || { display_name: 'Creator', avatar_url: null }
            }));
          feedItems.push(...recentProducts);
        }

        setFeedItems(feedItems);
      } catch (error) {
        console.error('Error fetching feed:', error);
        setFeedItems([]);
      } finally {
        setFeedLoading(false);
      }
    };

    if (!productsLoading) {
      fetchFeed();
    }
  }, [user, products, productsLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-colors duration-500 relative overflow-hidden">
      {/* Clean Ambient Glow Effects */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-green-500/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[150px] pointer-events-none" />
      
      {/* Cozy Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 transition-all duration-300" style={{
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <img 
                src="/Logo_pic.png" 
                alt="Vectabse Logo" 
                className="w-12 h-12 object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white">
                  Vectabse
                </span>
                <span className="text-xs text-slate-400">.COM</span>
              </div>
            </Link>

            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-green-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                />
              </div>
            </form>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg hover:bg-slate-800 transition-all duration-200 text-slate-300 hover:text-white"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currency === 'USD' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  USD
                </button>
                <button 
                  onClick={() => setCurrency('GBP')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currency === 'GBP' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  GBP
                </button>
              </div>

              {user ? (
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200">
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200">
                  <Link to="/auth?mode=register">
                    Get Started
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Clean Single Background like ClearlyDev */}
      <div className="pt-20 relative min-h-screen overflow-hidden">
        {/* Clean Background Image like ClearlyDev */}
        <div className="absolute inset-0">
          <img 
            src="/images/64ae2dcb-97a5-46db-8dc5-e08a059ac1df.png" 
            alt="Hero Background"
            className="w-full h-full object-cover opacity-80"
          />
          {/* Light Overlay for Text Readability */}
          <div className="absolute inset-0 bg-slate-900/40" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              The All-In-One Platform
              <br />
              for <span className="text-green-400">Digital Creators</span>
            </h1>
            
            <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Vectabse is the largest independent marketplace where creators can buy and sell assets, scripts, models, games, and more. Join thousands of developers discovering high-quality resources, tools, and communities built to help you create, grow, and monetize your digital projects.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-lg font-semibold text-lg transition-all duration-200">
                <Link to="/shop">
                  Shop
                </Link>
              </Button>
              
              <Button asChild className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-slate-900 px-10 py-4 rounded-lg font-semibold text-lg transition-all duration-200">
                <Link to="/auth?mode=register">
                  Open a Store
                </Link>
              </Button>
            </div>
            
            {/* Stats Section like ClearlyDev */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  ${products.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()}
                </div>
                <div className="text-slate-400 text-sm">Processed Sales</div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  {new Set(products.map(p => p.creator_id)).size.toLocaleString()}
                </div>
                <div className="text-slate-400 text-sm">Total Purchases</div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  {products.length.toLocaleString()}
                </div>
                <div className="text-slate-400 text-sm">Products Uploaded</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Featured Showcase Section */}
      <div className="py-20 bg-slate-800/20 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Featured Digital Assets
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Discover premium tools, models, and resources from top creators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Featured Items with Clean Design */}
            <div className="relative group overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-300">
              <div className="aspect-[4/3.0] overflow-hidden">
                <img 
                  src="/images/64ae2dcb-97a5-46db-8dc5-e08a059ac1df.png" 
                  alt="Featured Asset"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">TOP RATED</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Premium 3D Models</h3>
                <p className="text-slate-400 text-sm">High-quality assets for your projects</p>
              </div>
            </div>

            <div className="relative group overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-300">
              <div className="aspect-[4/3.0] overflow-hidden">
                <img 
                  src="/images/6e155d7c-8b71-4db9-82e9-1dff7d63357b.png" 
                  alt="Featured Asset"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">NEW</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">UI Components</h3>
                <p className="text-slate-400 text-sm">Modern interface elements</p>
              </div>
            </div>

            <div className="relative group overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-300">
              <div className="aspect-[4/3.0] overflow-hidden">
                <img 
                  src="/images/7ae4ede6-a80a-4759-a13f-c92cc5d798bd.png" 
                  alt="Featured Asset"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">TRENDING</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Game Assets</h3>
                <p className="text-slate-400 text-sm">Ready-to-use game resources</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-16">
          
          {/* Featured Products */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-4xl font-bold text-white mb-2">
                  Featured Products
                </h2>
                <p className="text-slate-400 text-sm">
                  Handpicked by our team
                </p>
              </div>
              <Button asChild className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200">
                <Link to="/shop" className="flex items-center gap-2">
                  <span>View All</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="aspect-square bg-slate-800/50 border border-slate-700 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </div>
            )}
          </div>

          {/* Feed Sidebar */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Latest Updates
              </h2>
              <p className="text-slate-400 text-sm">
                Stay in the loop
              </p>
            </div>
            
            <div className="space-y-3">
              {feedLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : feedItems.length > 0 ? (
                feedItems.map((item) => (
                  <Link key={item.id} to={`/product/${item.id}`}>
                    <div className="group p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-700">
                          <img 
                            src={item.image_url || "/placeholder.svg"} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1 truncate text-white group-hover:text-green-400 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-xs text-green-400/60 line-clamp-1 font-mono mb-1">
                            {item.description || `${item.category} • $${item.price?.toFixed(2)}`}
                          </p>
                          {item.creator && (
                            <p className="text-xs text-green-500/40 font-mono flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-green-500/50" />
                              {item.creator.display_name || 'Creator'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <p className="mb-2 text-slate-300">No updates yet</p>
                  <p className="text-xs mb-4 text-slate-400">Check back soon for new products!</p>
                  <Button asChild className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200">
                    <Link to="/shop">Browse Products</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="mt-32 text-center">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-green-600/20 border border-slate-700/50 p-16">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-4 w-16 h-16 rounded-lg overflow-hidden rotate-12">
                <img src="/images/956e9412-50ba-4c82-8314-cebbb5057c6c.png" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="absolute top-8 right-8 w-12 h-12 rounded-lg overflow-hidden -rotate-12">
                <img src="/images/f54f65af-7815-4db1-8358-12e2c103c0c1.png" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-4 left-8 w-14 h-14 rounded-lg overflow-hidden rotate-6">
                <img src="/images/64ae2dcb-97a5-46db-8dc5-e08a059ac1df.png" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-8 right-4 w-18 h-18 rounded-lg overflow-hidden -rotate-6">
                <img src="/images/6e155d7c-8b71-4db9-82e9-1dff7d63357b.png" alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4">
                Ready to Start Creating?
              </h2>
              <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of creators and buyers in our marketplace. Sell your digital products or discover amazing assets for your next project.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200">
                  <Link to="/auth?mode=register">
                    Start Selling Today
                  </Link>
                </Button>
                <Button asChild className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200">
                  <Link to="/shop">
                    Browse Marketplace
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
