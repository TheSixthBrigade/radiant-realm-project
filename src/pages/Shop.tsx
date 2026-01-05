import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, TrendingUp, Star, Download, Clock, Flame, Crown, Zap, ChevronRight, Package } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import Navigation from "@/components/Navigation";
import { useProducts } from "@/hooks/useProducts";
import { SEO, BreadcrumbSchema } from "@/components/SEO";

const Shop = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  const { products: allProducts, loading } = useProducts();
  
  const categories = [
    { value: "all", label: "All", icon: Sparkles },
    { value: "scripts", label: "Scripts", icon: Zap },
    { value: "models", label: "3D Models", icon: Package },
    { value: "maps", label: "Maps", icon: Package },
    { value: "textures", label: "Textures", icon: Package },
    { value: "audio", label: "Audio", icon: Package },
    { value: "ui", label: "UI Kits", icon: Package },
    { value: "tools", label: "Tools", icon: Package },
  ];

  // Get different product sections
  const getTopSellers = () => {
    return [...allProducts]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 6);
  };

  const getHighestRated = () => {
    return [...allProducts]
      .filter(p => p.rating >= 4)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
  };

  const getNewlyAdded = () => {
    return [...allProducts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  };

  const getFeatured = () => {
    return allProducts.filter(p => p.is_featured).slice(0, 6);
  };

  // Filter products based on search and category
  const filteredProducts = allProducts.filter(product => {
    const matchesCategory = selectedCategory === "all" || 
      product.category.toLowerCase().includes(selectedCategory.toLowerCase());
    
    if (!searchQuery) return matchesCategory;
    
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      product.title.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);
    
    return matchesSearch && matchesCategory;
  });

  const topSellers = getTopSellers();
  const highestRated = getHighestRated();
  const newlyAdded = getNewlyAdded();
  const featured = getFeatured();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-slate-400">Loading marketplace...</p>
          </div>
        </div>
      </div>
    );
  }

  // Product section component
  const ProductSection = ({ 
    title, 
    icon: Icon, 
    products, 
    sectionKey
  }: { 
    title: string; 
    icon: any; 
    products: any[]; 
    sectionKey: string;
  }) => {
    if (products.length === 0) return null;
    
    const isExpanded = activeSection === sectionKey;
    const displayProducts = isExpanded ? products : products.slice(0, 3);
    
    return (
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-slate-500 text-sm">{products.length} products</p>
            </div>
          </div>
          {products.length > 3 && (
            <Button 
              variant="ghost" 
              onClick={() => setActiveSection(isExpanded ? null : sectionKey)}
              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
            >
              {isExpanded ? 'Show Less' : 'View All'}
              <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              price={product.price}
              image={product.image_url || "/placeholder.svg"}
              rating={product.rating}
              downloads={product.downloads}
              category={product.category}
              isTopRated={product.is_top_rated}
              isNew={product.is_new}
              isFeatured={product.is_featured}
              creatorId={product.creator_id}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 relative">
      <SEO 
        title="Shop - Browse Digital Assets"
        description={`Discover ${allProducts.length}+ premium digital assets from talented creators. Game scripts, 3D models, UI kits, textures, and more.`}
        url="/shop"
        keywords="buy game scripts, digital assets shop, 3D models marketplace, Roblox assets, FiveM scripts, game development resources"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: '/' },
        { name: 'Shop', url: '/shop' }
      ]} />
      
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <Navigation />
      
      {/* Hero / Search Section */}
      <div className="pt-24 pb-8 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Marketplace
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mb-6">
              Discover {allProducts.length}+ premium digital assets from talented creators
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-green-500/50 focus:ring-green-500/20 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-white border border-slate-700/50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 pb-16 relative z-10">
        {searchQuery || selectedCategory !== "all" ? (
          /* Search Results */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {searchQuery ? `Results for "${searchQuery}"` : categories.find(c => c.value === selectedCategory)?.label}
                </h2>
                <p className="text-slate-500 text-sm">{filteredProducts.length} products found</p>
              </div>
              {(searchQuery || selectedCategory !== "all") && (
                <Button 
                  variant="ghost" 
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="text-slate-400 hover:text-white"
                >
                  Clear filters
                </Button>
              )}
            </div>
            
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    price={product.price}
                    image={product.image_url || "/placeholder.svg"}
                    rating={product.rating}
                    downloads={product.downloads}
                    category={product.category}
                    isTopRated={product.is_top_rated}
                    isNew={product.is_new}
                    isFeatured={product.is_featured}
                    creatorId={product.creator_id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/30">
                <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
                <p className="text-slate-400 text-sm mb-4">Try adjusting your search or filters</p>
                <Button 
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="bg-green-600 hover:bg-green-500"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Browse Sections */
          <div>
            {/* Featured */}
            {featured.length > 0 && (
              <ProductSection 
                title="Featured" 
                icon={Crown} 
                products={featured}
                sectionKey="featured"
              />
            )}

            {/* Top Sellers */}
            <ProductSection 
              title="Top Sellers" 
              icon={Flame} 
              products={topSellers}
              sectionKey="top-sellers"
            />

            {/* Highest Rated */}
            <ProductSection 
              title="Highest Rated" 
              icon={Star} 
              products={highestRated}
              sectionKey="highest-rated"
            />

            {/* Newly Added */}
            <ProductSection 
              title="Newly Added" 
              icon={Clock} 
              products={newlyAdded}
              sectionKey="newly-added"
            />

            {/* All Products */}
            {allProducts.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">All Products</h2>
                    <p className="text-slate-500 text-sm">{allProducts.length} total</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {allProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      title={product.title}
                      price={product.price}
                      image={product.image_url || "/placeholder.svg"}
                      rating={product.rating}
                      downloads={product.downloads}
                      category={product.category}
                      isTopRated={product.is_top_rated}
                      isNew={product.is_new}
                      isFeatured={product.is_featured}
                      creatorId={product.creator_id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
