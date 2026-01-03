import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, SlidersHorizontal, Grid3X3, Sparkles, TrendingUp, Star, Download, Clock } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import Navigation from "@/components/Navigation";
import { useProducts } from "@/hooks/useProducts";
import { useThemeStyle } from "@/contexts/ThemeContext";

const Shop = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("smart");
  
  const { products: allProducts, loading } = useProducts();
  const { isCyberpunk } = useThemeStyle();
  
  const categories = [
    { value: "all", label: "All Categories", count: allProducts.length },
    { value: "scripts", label: "Scripts", count: allProducts.filter(p => p.category.toLowerCase() === "scripts").length },
    { value: "models", label: "3D Models", count: allProducts.filter(p => p.category.toLowerCase() === "models" || p.category.toLowerCase() === "3d models").length },
    { value: "maps", label: "Maps", count: allProducts.filter(p => p.category.toLowerCase() === "maps").length },
    { value: "textures", label: "Textures", count: allProducts.filter(p => p.category.toLowerCase() === "textures").length },
    { value: "audio", label: "Audio", count: allProducts.filter(p => p.category.toLowerCase() === "audio").length },
    { value: "ui", label: "UI Kits", count: allProducts.filter(p => p.category.toLowerCase() === "ui" || p.category.toLowerCase() === "ui kits").length },
    { value: "tools", label: "Tools", count: allProducts.filter(p => p.category.toLowerCase() === "tools").length },
    { value: "templates", label: "Templates", count: allProducts.filter(p => p.category.toLowerCase() === "templates").length },
  ];
  
  // Smart search algorithm with relevance scoring
  const calculateRelevance = (product: any, query: string) => {
    if (!query) return 0;
    
    const lowerQuery = query.toLowerCase();
    const title = product.title.toLowerCase();
    const description = (product.description || '').toLowerCase();
    const category = product.category.toLowerCase();
    
    let score = 0;
    
    // Exact title match (highest priority)
    if (title === lowerQuery) score += 100;
    
    // Title starts with query
    if (title.startsWith(lowerQuery)) score += 50;
    
    // Title contains query
    if (title.includes(lowerQuery)) score += 30;
    
    // Category match
    if (category.includes(lowerQuery)) score += 20;
    
    // Description contains query
    if (description.includes(lowerQuery)) score += 10;
    
    // Word-by-word matching
    const queryWords = lowerQuery.split(' ');
    queryWords.forEach(word => {
      if (title.includes(word)) score += 5;
      if (description.includes(word)) score += 2;
    });
    
    // Boost for quality indicators
    if (product.is_featured) score += 15;
    if (product.is_top_rated) score += 10;
    if (product.rating >= 4.5) score += 8;
    if (product.downloads > 100) score += 5;
    
    return score;
  };

  // Filter and search products with smart algorithm
  const filteredProducts = allProducts
    .filter(product => {
      const matchesCategory = selectedCategory === "all" || 
                            product.category.toLowerCase() === selectedCategory.toLowerCase();
      
      if (!searchQuery) return matchesCategory;
      
      // Calculate relevance score
      const relevance = calculateRelevance(product, searchQuery);
      return relevance > 0 && matchesCategory;
    })
    .map(product => ({
      ...product,
      relevanceScore: calculateRelevance(product, searchQuery)
    }))
    .sort((a, b) => {
      switch(sortBy) {
        case "smart":
          // Smart sort: relevance + quality + recency
          if (searchQuery) {
            // If searching, prioritize relevance
            if (a.relevanceScore !== b.relevanceScore) {
              return b.relevanceScore - a.relevanceScore;
            }
          }
          // Then by quality score (rating * downloads)
          const qualityA = (a.rating || 0) * Math.log(a.downloads + 1);
          const qualityB = (b.rating || 0) * Math.log(b.downloads + 1);
          if (Math.abs(qualityA - qualityB) > 1) {
            return qualityB - qualityA;
          }
          // Finally by recency
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        
        case "price-low": 
          return a.price - b.price;
        
        case "price-high": 
          return b.price - a.price;
        
        case "rating": 
          return (b.rating || 0) - (a.rating || 0);
        
        case "downloads": 
          return b.downloads - a.downloads;
        
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        
        default: 
          return 0;
      }
    });

  if (loading) {
    return (
      <div className={`min-h-screen ${
        isCyberpunk 
          ? 'bg-[#0a0a0a]' 
          : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
      }`}>
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-32 w-32 border-b-2 mx-auto ${
                isCyberpunk ? 'border-cyan-400' : 'border-slate-600'
              }`}></div>
              <p className={`mt-4 ${
                isCyberpunk ? 'text-cyan-400' : 'text-slate-600'
              }`}>Loading marketplace...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 relative overflow-hidden ${
      isCyberpunk 
        ? 'bg-[#0a0a0a]' 
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
    }`}>
      {/* Background Effects - Cyberpunk Theme Only */}
      {isCyberpunk && (
        <>
          {/* Tactical Grid Pattern */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, rgba(33, 150, 243, 0.25) 1px, transparent 1px)',
              backgroundSize: '25px 25px'
            }} />
          </div>

          {/* Cyberpunk Glow Effects */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-20 left-20 w-[600px] h-[600px] bg-[rgba(33,150,243,0.05)] rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-[600px] h-[600px] bg-[rgba(33,150,243,0.05)] rounded-full blur-3xl" />
          </div>
        </>
      )}

      {/* Clean Theme Background - Different from Homepage */}
      {!isCyberpunk && (
        <>
          {/* Background Image - Using different image than homepage */}
          <div className="fixed inset-0">
            <img 
              src="/images/7ae4ede6-a80a-4759-a13f-c92cc5d798bd.png" 
              alt="Shop Background"
              className="w-full h-full object-cover opacity-80"
            />
            {/* Light Overlay for Text Readability */}
            <div className="absolute inset-0 bg-slate-900/40" />
          </div>
          
          {/* Clean Ambient Glow Effects */}
          <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-green-500/8 rounded-full blur-[150px] pointer-events-none" />
          <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[150px] pointer-events-none" />
        </>
      )}

      <Navigation />
      
      {/* Hero Section - Like Homepage */}
      <div className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium mb-8 ${
              isCyberpunk 
                ? 'bg-[rgba(33,150,243,0.1)] border border-[rgba(33,150,243,0.2)] text-[hsl(210,100%,50%)] font-mono'
                : 'bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm text-white'
            }`}>
              <Sparkles className="w-4 h-4" />
              {allProducts.length}+ Premium Assets Available
            </div>
            
            <h1 className={`text-6xl md:text-7xl font-bold mb-6 transition-colors duration-500 leading-tight ${
              isCyberpunk 
                ? 'text-[hsl(210,100%,50%)] font-mono'
                : 'text-white'
            }`}>
              Digital Marketplace
            </h1>
            
            <p className={`text-xl mb-12 max-w-3xl mx-auto transition-colors duration-500 leading-relaxed ${
              isCyberpunk 
                ? 'text-[hsl(210,40%,98%)] opacity-70 font-mono'
                : 'text-slate-300'
            }`}>
              Discover premium digital assets from talented creators. Everything you need to build amazing projects and bring your ideas to life.
            </p>

            {/* Search Bar - Like Homepage */}
            <div className="max-w-2xl mx-auto">
              <div className="relative group">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                  isCyberpunk 
                    ? 'text-[rgba(33,150,243,0.6)] group-focus-within:text-[hsl(210,100%,50%)]'
                    : 'text-slate-400 group-focus-within:text-green-400'
                }`} />
                <Input
                  placeholder="Search for assets, templates, tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-12 pr-4 py-4 text-lg rounded-lg transition-all duration-200 ${
                    isCyberpunk 
                      ? 'border-[rgba(33,150,243,0.2)] bg-[rgba(33,150,243,0.05)] text-[hsl(210,40%,98%)] placeholder-[rgba(33,150,243,0.5)] focus:border-[rgba(33,150,243,0.5)] focus:ring-1 focus:ring-[rgba(33,150,243,0.3)] font-mono'
                      : 'bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 transition-colors ${
                      isCyberpunk 
                        ? 'text-[rgba(33,150,243,0.6)] hover:text-[hsl(210,100%,50%)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ✕
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className={`text-sm mt-2 text-center ${
                  isCyberpunk 
                    ? 'text-[rgba(33,150,243,0.6)] font-mono'
                    : 'text-slate-400'
                }`}>
                  Searching for "{searchQuery}" with smart relevance algorithm
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-20">
        {/* Filters and Controls */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="space-y-6">
              {/* Categories */}
              <div className={`rounded-2xl p-6 border transition-colors duration-500 ${
                isCyberpunk 
                  ? 'bg-[#0d1117] border-[rgba(33,150,243,0.15)] backdrop-blur-sm'
                  : 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm'
              }`}>
                <h3 className={`font-bold mb-4 text-sm uppercase tracking-wider ${
                  isCyberpunk 
                    ? 'text-[hsl(210,100%,50%)] font-mono'
                    : 'text-white'
                }`}>Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                        selectedCategory === category.value
                          ? isCyberpunk 
                            ? 'bg-[rgba(33,150,243,0.3)] text-[hsl(210,100%,50%)] shadow-sm'
                            : 'bg-green-600 text-white shadow-sm'
                          : isCyberpunk
                            ? 'hover:bg-[rgba(33,150,243,0.1)] text-[rgba(33,150,243,0.8)] hover:text-[hsl(210,100%,50%)]'
                            : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className="font-medium text-sm">{category.label}</span>
                      <Badge variant="secondary" className={`text-xs ${
                        isCyberpunk ? 'bg-[rgba(33,150,243,0.2)]' : 'bg-slate-600'
                      }`}>
                        {category.count}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div className={`rounded-2xl p-6 border transition-colors duration-500 ${
                isCyberpunk 
                  ? 'bg-[#0d1117] border-[rgba(33,150,243,0.15)] backdrop-blur-sm'
                  : 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm'
              }`}>
                <h3 className={`font-bold mb-4 text-sm uppercase tracking-wider ${
                  isCyberpunk 
                    ? 'text-[hsl(210,100%,50%)] font-mono'
                    : 'text-white'
                }`}>Sort By</h3>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smart">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Smart Sort (Recommended)
                      </div>
                    </SelectItem>
                    <SelectItem value="newest">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Newest First
                      </div>
                    </SelectItem>
                    <SelectItem value="rating">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Highest Rated
                      </div>
                    </SelectItem>
                    <SelectItem value="downloads">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Most Downloaded
                      </div>
                    </SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Featured Badge */}
              <div className={`p-6 rounded-2xl border transition-colors duration-500 ${
                isCyberpunk 
                  ? 'bg-[rgba(33,150,243,0.1)] border-[rgba(33,150,243,0.3)] text-[hsl(210,100%,50%)]'
                  : 'bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 border-slate-700/50 text-white'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className={`font-bold text-sm uppercase tracking-wider ${
                    isCyberpunk ? 'font-mono' : ''
                  }`}>Trending</span>
                </div>
                <p className={`text-sm opacity-90 ${
                  isCyberpunk ? 'font-mono' : ''
                }`}>
                  Discover the most popular assets this week
                </p>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className={`text-4xl font-bold transition-colors duration-500 ${
                  isCyberpunk 
                    ? 'text-[hsl(210,100%,50%)] font-mono'
                    : 'text-white'
                }`}>
                  {selectedCategory === "all" ? "All Products" : categories.find(c => c.value === selectedCategory)?.label}
                </h2>
                <p className={`mt-2 transition-colors duration-500 text-sm ${
                  isCyberpunk 
                    ? 'text-[rgba(33,150,243,0.6)] font-mono'
                    : 'text-slate-400'
                }`}>
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className={`${
                  isCyberpunk 
                    ? 'border-[rgba(33,150,243,0.3)] text-[hsl(210,100%,50%)] hover:bg-[rgba(33,150,243,0.1)]'
                    : 'bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50'
                }`}>
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                <Button variant="outline" size="sm" className={`${
                  isCyberpunk 
                    ? 'border-[rgba(33,150,243,0.3)] text-[hsl(210,100%,50%)] hover:bg-[rgba(33,150,243,0.1)]'
                    : 'bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50'
                }`}>
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className={`text-center py-16 rounded-2xl border ${
                isCyberpunk 
                  ? 'bg-[#0d1117] border-[rgba(33,150,243,0.15)]'
                  : 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm'
              }`}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  isCyberpunk 
                    ? 'bg-[rgba(33,150,243,0.1)]'
                    : 'bg-slate-700/50'
                }`}>
                  <Search className={`w-12 h-12 ${
                    isCyberpunk ? 'text-[rgba(33,150,243,0.6)]' : 'text-slate-400'
                  }`} />
                </div>
                <h3 className={`text-2xl font-bold mb-4 ${
                  isCyberpunk ? 'text-[hsl(210,100%,50%)]' : 'text-white'
                }`}>No products found</h3>
                <p className={`mb-8 ${
                  isCyberpunk ? 'text-[rgba(33,150,243,0.6)]' : 'text-slate-400'
                }`}>
                  Try adjusting your search or filter criteria
                </p>
                <Button 
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className={`${
                    isCyberpunk 
                      ? 'bg-[hsl(210,100%,50%)] hover:bg-[hsl(210,100%,45%)]'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;