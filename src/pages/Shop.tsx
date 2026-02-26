import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, Zap, Package, Flame, Crown, Star, Clock, ChevronRight } from "lucide-react";
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
      <div className="min-h-screen relative" style={{ background: '#000000' }}>
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-zinc-500">Loading marketplace...</p>
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <Icon className="w-5 h-5 text-violet-400" strokeWidth={1.5} />
              </div>
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-zinc-600 text-sm">{products.length} products</p>
            </div>
          </div>
          {products.length > 3 && (
            <Button 
              variant="ghost" 
              onClick={() => setActiveSection(isExpanded ? null : sectionKey)}
              className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-sm font-semibold"
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
    <div className="min-h-screen relative" style={{ background: '#000000' }}>
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
      


      <Navigation />
      
      {/* ── HERO ── */}
      <section className="relative pt-32 pb-12 sm:pt-40 sm:pb-16 overflow-hidden" style={{ background: '#000000' }}>
        {/* Ghost watermark */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{
            fontSize: 'clamp(120px, 18vw, 260px)',
            fontFamily: "'Arial Rounded MT Bold', sans-serif",
            fontWeight: 900,
            color: 'transparent',
            WebkitTextStroke: '1px rgba(139,92,246,0.08)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            userSelect: 'none',
          }}
        >
          SHOP
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.span
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-violet-400 mb-6"
          >
            Marketplace
          </motion.span>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 }}
              className="font-black leading-[0.9] tracking-tight text-white"
              style={{ fontSize: 'clamp(44px, 7vw, 96px)' }}
            >
              <span className="block">Find your next</span>
              <span className="block" style={{ color: '#8b5cf6' }}>game asset.</span>
            </motion.h1>

            {/* Search bar — right-aligned on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="relative w-full lg:max-w-sm flex-shrink-0"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input
                placeholder="Search scripts, models, tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-10 py-3 text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none rounded-full transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                >
                  ✕
                </button>
              )}
            </motion.div>
          </div>

          {/* Category pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="flex flex-wrap gap-2"
          >
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                style={selectedCategory === cat.value ? {
                  background: '#7c3aed',
                  color: '#fff',
                  border: '1px solid #7c3aed',
                } : {
                  background: 'transparent',
                  color: '#71717a',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onMouseEnter={e => {
                  if (selectedCategory !== cat.value) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
                  }
                }}
                onMouseLeave={e => {
                  if (selectedCategory !== cat.value) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#71717a';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  }
                }}
              >
                {cat.label}
              </button>
            ))}
            {allProducts.length > 0 && (
              <span className="px-4 py-1.5 text-xs text-zinc-600 self-center">
                {allProducts.length} products
              </span>
            )}
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
        {searchQuery || selectedCategory !== "all" ? (
          /* Search Results */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {searchQuery ? `Results for "${searchQuery}"` : categories.find(c => c.value === selectedCategory)?.label}
                </h2>
                <p className="text-zinc-600 text-sm">{filteredProducts.length} products found</p>
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
              <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/[0.07]">
                <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
                <p className="text-zinc-500 text-sm mb-4">Try adjusting your search or filters</p>
                <Button 
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="spark-btn spark-btn-primary"
                >
                  <span className="spark-btn-content">Clear Filters</span>
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                    <Package className="w-5 h-5 text-violet-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">All Products</h2>
                    <p className="text-zinc-600 text-sm">{allProducts.length} total</p>
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
