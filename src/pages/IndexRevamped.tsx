import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import GlowingLogo from '@/components/GlowingLogo';
import ProductCard from '@/components/ProductCard';
import { SEO, OrganizationSchema, WebsiteSchema } from '@/components/SEO';
import { 
  ArrowRight, Sparkles, Shield, Zap, Users, 
  TrendingUp, Package, Code, Search, Moon, Sun,
  LayoutDashboard, Menu, X, ChevronRight, Play,
  Star, Download, Globe, Lock, Rocket
} from 'lucide-react';

export default function IndexRevamped() {
  const { products, loading: productsLoading } = useProducts();
  const { user } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Real stats from actual data
  const uniqueCreators = new Set(products.map(p => p.creator_id)).size;
  const totalDownloads = products.reduce((sum, p) => sum + (p.downloads || 0), 0);

  const getFeaturedProducts = () => {
    if (products.length === 0) return [];
    return products
      .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
      .slice(0, 6)
      .map(p => ({
        id: p.id, title: p.title, price: p.price, image: p.image_url || "/placeholder.svg",
        rating: p.rating, downloads: p.downloads, category: p.category,
        isTopRated: p.is_top_rated, isNew: p.is_new, creatorId: p.creator_id
      }));
  };

  const featuredProducts = getFeaturedProducts();

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden">
      <SEO 
        title="Digital Assets Marketplace for Game Creators"
        description="Premium marketplace for game scripts, models, and digital assets. Sell with built-in protection. Sellers keep 95%."
        url="/"
      />
      <OrganizationSchema />
      <WebsiteSchema />

      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-emerald-500/8 via-emerald-500/3 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-gradient-to-tr from-emerald-600/5 to-transparent blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <GlowingLogo size="md" showText={true} />
            
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.07] transition-all text-sm" 
                />
              </div>
            </form>

            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                <button onClick={() => setCurrency('USD')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${currency === 'USD' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'}`}>USD</button>
                <button onClick={() => setCurrency('GBP')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${currency === 'GBP' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'}`}>GBP</button>
              </div>
              {user ? (
                <Link to="/dashboard" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 font-medium transition-colors">
                  <LayoutDashboard className="w-4 h-4" />Dashboard
                </Link>
              ) : (
                <Link to="/auth?mode=register" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 font-medium transition-colors">
                  Get Started
                </Link>
              )}
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-xl hover:bg-white/5 text-zinc-400">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 pt-4 border-t border-white/5 space-y-3">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 text-sm" />
              </form>
              {user ? (
                <Link to="/dashboard" className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-medium transition-colors">
                  <LayoutDashboard className="w-4 h-4" />Dashboard
                </Link>
              ) : (
                <div className="flex gap-2">
                  <Link to="/auth?mode=login" className="flex-1 text-center bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl border border-white/10 font-medium transition-colors">Sign In</Link>
                  <Link to="/auth?mode=register" className="flex-1 text-center bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-medium transition-colors">Sign Up</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section className="pt-32 sm:pt-40 lg:pt-48 pb-20 sm:pb-28 relative" style={{ opacity: heroOpacity }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Gaming Asset Marketplace</span>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 30 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight"
            >
              <span className="text-white">Sell Your</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">Digital Creations</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 30 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              The marketplace for game scripts, models, and digital assets. 
              Built-in protection for your work. <span className="text-emerald-400 font-semibold">Sellers keep 95%</span>.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 30 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Link to="/shop" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold text-base shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all group">
                <Rocket className="w-5 h-5" />
                Browse Marketplace
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/auth?mode=register&creator=true" className="w-full sm:w-auto flex items-center justify-center gap-2 border border-white/10 hover:bg-white/5 hover:border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-base transition-all group">
                <Play className="w-4 h-4" />
                Start Selling
              </Link>
            </motion.div>

            {/* Real Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 30 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
            >
              {[
                { value: products.length, label: 'Products', suffix: '' },
                { value: uniqueCreators, label: 'Creators', suffix: '' },
                { value: totalDownloads, label: 'Downloads', suffix: '' },
                { value: 95, label: 'To Sellers', suffix: '%', highlight: true }
              ].map((stat, i) => (
                <div key={i} className={`text-center p-5 rounded-2xl ${stat.highlight ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.03] border border-white/5'} backdrop-blur-sm`}>
                  <div className={`text-3xl sm:text-4xl font-bold mb-1 ${stat.highlight ? 'text-emerald-400' : 'text-white'}`}>
                    {stat.value.toLocaleString()}{stat.suffix}
                  </div>
                  <div className="text-zinc-500 text-sm">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-20 sm:py-28 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built for Creators</h2>
            <p className="text-zinc-400 text-lg max-w-md mx-auto">Fair fees. Fast payouts. Real protection.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {[
              { icon: TrendingUp, title: 'Keep 95%', desc: 'Only 5% platform fee', color: 'emerald' },
              { icon: Zap, title: 'Instant Payouts', desc: 'Via Stripe Connect', color: 'amber' },
              { icon: Shield, title: 'Protected', desc: 'Built-in whitelisting', color: 'blue' },
              { icon: Users, title: 'Community', desc: 'Growing every day', color: 'purple' }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl bg-${item.color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-6 h-6 text-${item.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-zinc-500 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 sm:py-28 bg-white/[0.01]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">Featured Products</h2>
              <p className="text-zinc-400">Top picks from our community</p>
            </div>
            <Link to="/shop" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
              View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white/[0.02] border border-white/5">
                  <div className="aspect-[4/3] bg-white/5 animate-pulse" />
                  <div className="p-5">
                    <div className="h-5 w-3/4 bg-white/5 rounded animate-pulse mb-3" />
                    <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product, i) => (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ProductCard {...product} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
              <Package className="w-14 h-14 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Products Yet</h3>
              <p className="text-zinc-400 mb-6">Be the first to list your creation!</p>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-500">
                <Link to="/auth?mode=register&creator=true">Start Selling</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Why Vectabase */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Why Creators Choose Us</h2>
              <p className="text-zinc-400 text-lg">Everything you need to succeed</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Lock, title: 'License Protection', desc: 'Built-in whitelisting system protects your scripts and assets from unauthorized use.' },
                { icon: Globe, title: 'Global Reach', desc: 'Sell to customers worldwide with multi-currency support and instant delivery.' },
                { icon: Code, title: 'Developer API', desc: 'Integrate with your tools using our comprehensive API for automation.' },
                { icon: TrendingUp, title: 'Analytics Dashboard', desc: 'Track sales, downloads, and revenue with real-time analytics.' }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/20 via-emerald-600/10 to-teal-600/20 border border-emerald-500/20 p-10 sm:p-14"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px]" />
            
            <div className="relative z-10 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Start?</h2>
              <p className="text-zinc-300 text-lg mb-8">Join creators selling their work. Or find your next favorite asset.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild className="w-full sm:w-auto bg-white text-emerald-600 hover:bg-zinc-100 px-8 py-3 rounded-xl font-semibold">
                  <Link to="/auth?mode=register">Create Account</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full sm:w-auto text-white hover:bg-white/10 px-8 py-3 rounded-xl">
                  <Link to="/shop">Browse Products</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/Logo_pic.png" alt="Vectabase" className="w-6 h-6 object-contain" />
              <span className="text-white font-medium">Vectabase</span>
            </div>
            <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} Vectabase. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/about" className="text-zinc-500 hover:text-white text-sm transition-colors">About</Link>
              <Link to="/shop" className="text-zinc-500 hover:text-white text-sm transition-colors">Shop</Link>
              <Link to="/auth?mode=register&creator=true" className="text-zinc-500 hover:text-white text-sm transition-colors">Sell</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
