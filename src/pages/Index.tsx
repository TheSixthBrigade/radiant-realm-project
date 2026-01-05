import { useState, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { subscribeToNewsletter } from "@/lib/newsletter";
import GlowingLogo from "@/components/GlowingLogo";
import { SEO, OrganizationSchema, WebsiteSchema } from "@/components/SEO";
import { 
  Moon, Sun, ArrowRight, Search, LayoutDashboard, 
  Menu, X, ShoppingBag, Zap, Shield, Users, TrendingUp,
  Star, Download, Package, Mail, Loader2, Sparkles, Play, ChevronRight
} from "lucide-react";

// Skeleton component for loading states
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-800/50 rounded-xl ${className}`} />
);

// Animated counter component - always shows 0 immediately, then animates up
const AnimatedCounter = ({ value, suffix = "", loading = false }: { value: number; suffix?: string; loading?: boolean }) => {
  const [count, setCount] = useState(0); // Always start at 0, never blank
  const [targetValue, setTargetValue] = useState(0);
  
  useEffect(() => {
    if (loading) return;
    
    // If value changed, animate to it
    if (value !== targetValue) {
      setTargetValue(value);
      
      if (value === 0) {
        setCount(0);
        return;
      }
      
      // Animate from current count to new value
      const duration = 1000;
      const steps = 30;
      const startValue = count;
      const increment = (value - startValue) / steps;
      let current = startValue;
      let step = 0;
      
      const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [value, loading]);
  
  return <span>{count}{suffix}</span>;
};

const Index = () => {
  const { products, loading: productsLoading } = useProducts();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Trigger content reveal after mount
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Oops', description: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    setIsSubscribing(true);
    const result = await subscribeToNewsletter(email, null);
    setIsSubscribing(false);
    toast({
      title: result.success ? '🎉 Nice!' : 'Hmm',
      description: result.message,
      variant: result.success ? 'default' : 'destructive'
    });
    if (result.success) setEmail('');
  };

  const getFeaturedProducts = () => {
    if (products.length === 0) return [];
    const scoredProducts = products.map(product => {
      let score = 0;
      score += (product.rating / 5) * 50;
      score += Math.min(30, Math.log10(product.downloads + 1) * 10);
      const days = (Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 20 - (days / 7));
      if (product.is_featured) score += 100;
      if (product.is_top_rated) score += 50;
      if (product.is_new) score += 25;
      return { ...product, qualityScore: score };
    });
    return scoredProducts.sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 6).map(p => ({
      id: p.id, title: p.title, price: p.price, image: p.image_url || "/placeholder.svg",
      rating: p.rating, downloads: p.downloads, category: p.category,
      isTopRated: p.is_top_rated, isNew: p.is_new, creatorId: p.creator_id
    }));
  };

  const featuredProducts = getFeaturedProducts();
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    if (!productsLoading) {
      // Simulate smooth transition
      setTimeout(() => {
        const items = products.slice(0, 5).map(p => ({ 
          ...p, type: 'product', creator: p.creator || { display_name: 'Creator' }
        }));
        setFeedItems(items);
        setFeedLoading(false);
      }, 300);
    }
  }, [products, productsLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const uniqueCreators = new Set(products.map(p => p.creator_id)).size;
  const totalDownloads = products.reduce((sum, p) => sum + (p.downloads || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <SEO 
        title="Digital Assets Marketplace for Game Creators"
        description="Discover premium digital assets, scripts, and 3D models. The all-in-one marketplace for game creators to buy and sell quality digital content. Sellers keep 95%."
        url="/"
        keywords="digital assets, game scripts, 3D models, Roblox scripts, game development, marketplace, digital marketplace, game assets, UI kits, FiveM scripts"
      />
      <OrganizationSchema />
      <WebsiteSchema />
      
      {/* Animated ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[-20%] w-[600px] h-[600px] bg-green-500/[0.04] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-30%] right-[-20%] w-[700px] h-[700px] bg-emerald-500/[0.04] rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/[0.02] rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-400/20 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-emerald-400/20 rounded-full animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-green-300/20 rounded-full animate-bounce" style={{ animationDuration: '5s', animationDelay: '2s' }} />
      </div>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/30">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <GlowingLogo size="md" showText={true} />
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                <input type="text" placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/60 border border-slate-800/50 text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500/40 focus:bg-slate-900 transition-all text-sm" />
              </div>
            </form>
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 lg:p-2.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-all">
                {theme === "dark" ? <Sun className="w-4 h-4 lg:w-5 lg:h-5" /> : <Moon className="w-4 h-4 lg:w-5 lg:h-5" />}
              </button>
              <div className="flex bg-slate-900/60 rounded-lg p-0.5 lg:p-1 border border-slate-800/30">
                <button onClick={() => setCurrency('USD')} className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded text-xs lg:text-sm font-medium transition-all ${currency === 'USD' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}>USD</button>
                <button onClick={() => setCurrency('GBP')} className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded text-xs lg:text-sm font-medium transition-all ${currency === 'GBP' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}>GBP</button>
              </div>
              {user ? (
                <Button asChild size="sm" className="bg-green-600 hover:bg-green-500 text-white rounded-lg lg:text-sm lg:px-4 lg:py-2">
                  <Link to="/dashboard" className="flex items-center gap-1.5 lg:gap-2"><LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4" /><span className="hidden lg:inline">Dashboard</span></Link>
                </Button>
              ) : (
                <Button asChild size="sm" className="bg-green-600 hover:bg-green-500 text-white rounded-lg lg:text-sm lg:px-4 lg:py-2">
                  <Link to="/auth?mode=register">Get Started</Link>
                </Button>
              )}
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-slate-800/50 text-slate-400">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 pt-4 border-t border-slate-800/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-800/50 text-white placeholder:text-slate-500 text-sm" />
              </form>
              <div className="flex items-center justify-between">
                <div className="flex bg-slate-900/60 rounded-lg p-0.5">
                  <button onClick={() => setCurrency('USD')} className={`px-3 py-1.5 rounded text-sm ${currency === 'USD' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>USD</button>
                  <button onClick={() => setCurrency('GBP')} className={`px-3 py-1.5 rounded text-sm ${currency === 'GBP' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>GBP</button>
                </div>
                <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg bg-slate-900/60 text-slate-400">
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
              {user ? (
                <Button asChild className="w-full bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg">
                  <Link to="/dashboard" className="flex items-center justify-center gap-2"><LayoutDashboard className="w-4 h-4" />Dashboard</Link>
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button asChild className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg"><Link to="/auth?mode=login">Sign In</Link></Button>
                  <Button asChild className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg"><Link to="/auth?mode=register">Sign Up</Link></Button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 sm:pt-36 lg:pt-44 pb-16 sm:pb-24 lg:pb-32 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-8 lg:mb-12 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Gaming Asset Marketplace</span>
            </div>

            <h1 className={`text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 lg:mb-8 leading-[1.1] transition-all duration-700 delay-100 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Where Game Creators
              <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent mt-2 animate-gradient bg-[length:200%_auto]">Sell & Protect</span>
            </h1>
            
            <p className={`text-lg sm:text-xl text-slate-400 mb-10 lg:mb-12 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              The marketplace for game scripts, models, and digital assets. 
              Sell your creations with built-in protection. <span className="text-green-400 font-semibold">Sellers keep 95%</span>.
            </p>
            
            {/* CTAs */}
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 lg:mb-20 transition-all duration-700 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Button asChild size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white px-8 py-5 lg:px-10 lg:py-6 rounded-xl font-semibold text-base lg:text-lg shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] transition-all group">
                <Link to="/shop" className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Browse Marketplace
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-slate-700 hover:bg-slate-800/80 hover:border-slate-600 text-white px-8 py-5 lg:px-10 lg:py-6 rounded-xl font-semibold text-base lg:text-lg transition-all hover:scale-[1.02]">
                <Link to="/auth?mode=register" className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start Selling
                </Link>
              </Button>
            </div>

            {/* Stats with animated counters */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto transition-all duration-700 delay-[400ms] ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {[
                { value: products.length, label: 'Products', color: 'text-white' },
                { value: uniqueCreators, label: 'Creators', color: 'text-white' },
                { value: totalDownloads, label: 'Downloads', color: 'text-white' },
                { value: 95, label: 'To Sellers', suffix: '%', color: 'text-green-400' }
              ].map((stat, i) => (
                <div key={i} className="text-center p-4 sm:p-5 rounded-xl bg-slate-900/40 border border-slate-800/30 backdrop-blur-sm hover:border-slate-700/50 transition-all">
                  <div className={`text-2xl sm:text-3xl font-bold ${stat.color} mb-1`}>
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-slate-500 text-xs sm:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 lg:mb-14">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">Built for Creators</h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto">Fair fees. Fast payouts. Zero BS.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: TrendingUp, title: '95% Revenue', desc: 'Only 5% platform fee', delay: '0ms' },
              { icon: Zap, title: 'Instant Payouts', desc: 'Via Stripe Connect', delay: '100ms' },
              { icon: Shield, title: 'Protected', desc: 'Built-in whitelisting', delay: '200ms' },
              { icon: Users, title: 'Community', desc: 'Growing every day', delay: '300ms' }
            ].map((item, i) => (
              <div key={i} className="p-4 sm:p-5 rounded-xl bg-slate-900/30 border border-slate-800/30 hover:border-green-500/20 hover:bg-slate-900/50 transition-all group cursor-default" style={{ animationDelay: item.delay }}>
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3 group-hover:bg-green-500/20 group-hover:scale-110 transition-all">
                  <item.icon className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-slate-500 text-xs sm:text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 sm:py-20 bg-slate-900/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Featured</h2>
              <p className="text-slate-400 text-sm">Top picks from our community</p>
            </div>
            <Button asChild variant="ghost" className="text-slate-400 hover:text-white group">
              <Link to="/shop" className="flex items-center gap-2">View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></Link>
            </Button>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ animationDelay: `${i * 100}ms` }}>
                  <Skeleton className="aspect-[4/3]" />
                  <div className="p-4 bg-slate-900/50">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredProducts.map((product, i) => (
                <div key={product.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms`, animationDuration: '500ms', animationFillMode: 'both' }}>
                  <ProductCard {...product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/30">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">No Products Yet</h3>
              <p className="text-slate-400 text-sm mb-4">Be the first to list!</p>
              <Button asChild className="bg-green-600 hover:bg-green-500"><Link to="/auth?mode=register">Start Selling</Link></Button>
            </div>
          )}
        </div>
      </section>

      {/* Latest Uploads */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Fresh Drops</h2>
              <p className="text-slate-400 text-sm">Just uploaded</p>
            </div>
            
            <div className="space-y-2">
              {feedLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="p-3 bg-slate-900/30 border border-slate-800/30 rounded-lg" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </div>
                ))
              ) : feedItems.length > 0 ? (
                feedItems.map((item, i) => (
                  <Link key={item.id} to={`/product/${item.id}`} className="block animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${i * 80}ms`, animationDuration: '400ms', animationFillMode: 'both' }}>
                    <div className="group p-3 bg-slate-900/30 border border-slate-800/30 rounded-lg hover:bg-slate-800/40 hover:border-slate-700/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
                          <img src={item.image_url || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-white group-hover:text-green-400 transition-colors truncate">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-green-400 font-medium text-sm">${item.price?.toFixed(2)}</span>
                            <span className="text-slate-600 text-xs">•</span>
                            <span className="text-slate-500 text-xs">{item.category}</span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 text-slate-500">
                          {item.rating > 0 && <div className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /><span className="text-xs">{item.rating.toFixed(1)}</span></div>}
                          {item.downloads > 0 && <div className="flex items-center gap-1"><Download className="w-3 h-3" /><span className="text-xs">{item.downloads}</span></div>}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-slate-800/30">
                  <p className="text-slate-400 text-sm">Nothing here yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 sm:py-20 bg-slate-900/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 mb-5">
              <Mail className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Follow Your Favorite Sellers</h2>
            <p className="text-slate-400 text-sm sm:text-base mb-6">Get notified when sellers you follow drop new products. Never miss a release.</p>
            
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubscribing}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800/50 text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500/40 transition-all text-sm disabled:opacity-50"
              />
              <Button type="submit" disabled={isSubscribing} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50">
                {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600/10 via-slate-900/50 to-emerald-600/10 border border-slate-800/30 p-8 sm:p-12">
            <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px]" />
            
            <div className="relative z-10 text-center max-w-lg mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to Start?</h2>
              <p className="text-slate-400 text-sm sm:text-base mb-6">Join creators selling their work. Or find your next favorite asset.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl font-medium hover:scale-[1.02] transition-all">
                  <Link to="/auth?mode=register">Create Account</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full sm:w-auto text-slate-300 hover:text-white px-6 py-2.5 rounded-xl">
                  <Link to="/shop">Browse Products</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/Logo_pic.png" alt="Vectabase" className="w-6 h-6 object-contain" />
              <span className="text-white font-medium text-sm">Vectabase</span>
            </div>
            <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Vectabase</p>
            <div className="flex items-center gap-4">
              <Link to="/about" className="text-slate-500 hover:text-white text-xs transition-colors">About</Link>
              <Link to="/shop" className="text-slate-500 hover:text-white text-xs transition-colors">Shop</Link>
              <Link to="/auth?mode=register" className="text-slate-500 hover:text-white text-xs transition-colors">Sell</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
