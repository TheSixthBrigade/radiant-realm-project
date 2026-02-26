import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/components/theme-provider';
import GlowingLogo from '@/components/GlowingLogo';
import ProductCard from '@/components/ProductCard';
import { SEO, OrganizationSchema, WebsiteSchema } from '@/components/SEO';

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 3.5L13 8L5 12.5V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2L3 5V10C3 14 6.5 17.5 10 18C13.5 17.5 17 14 17 10V5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconZap = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 2L4 11H10L9 18L16 9H10L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconTrending = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 14L7 9L11 13L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 6H18V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCode = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 7L2 10L6 13M14 7L18 10L14 13M11 4L9 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSearch = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconPackage = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 4L44 14V34L24 44L4 34V14L24 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M24 4V44M4 14L24 24L44 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Wave Slide Button ───────────────────────────────────────────────────────
interface LiquidButtonProps {
  to: string;
  children: React.ReactNode;
  variant?: 'primary' | 'outline';
  className?: string;
}

const LiquidButton = ({ to, children, variant = 'primary', className = '' }: LiquidButtonProps) => {
  const isPrimary = variant === 'primary';
  return (
    <Link
      to={to}
      className={`wave-btn ${isPrimary ? 'wave-btn-primary' : 'wave-btn-outline'} ${className}`}
    >
      <span className="wave-btn-content">{children}</span>
    </Link>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

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
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const uniqueCreators = new Set(products.map(p => p.creator_id)).size;
  const totalDownloads = products.reduce((sum, p) => sum + (p.downloads || 0), 0);

  const featuredProducts = products.length === 0 ? [] : products
    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    .slice(0, 6)
    .map(p => ({
      id: p.id, title: p.title, price: p.price, image: p.image_url || '/placeholder.svg',
      rating: p.rating, downloads: p.downloads, category: p.category,
      isTopRated: p.is_top_rated, isNew: p.is_new, creatorId: p.creator_id,
    }));

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: '#000000', fontFamily: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <SEO
        title="Digital Assets Marketplace for Game Creators"
        description="Premium marketplace for game scripts, models, and digital assets. Sell with built-in protection. Sellers keep 95%."
        url="/"
      />
      <OrganizationSchema />
      <WebsiteSchema />

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Left: Logo */}
            <GlowingLogo size="sm" showText={true} />

            {/* Center: Nav links + search */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Shop', to: '/shop' },
                { label: 'Creators', to: '/creators' },
                { label: 'Developer', to: '/developer' },
                { label: 'Pricing', to: '/pricing' },
              ].map(link => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-sm text-zinc-400 hover:text-white transition-colors duration-150"
                >
                  {link.label}
                </Link>
              ))}
              <form onSubmit={handleSearch} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                  <IconSearch />
                </span>
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-full text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.06] transition-all duration-200 w-40 focus:w-56"
                />
              </form>
            </div>

            {/* Right: currency + auth */}
            <div className="hidden md:flex items-center gap-3">
              {/* Currency toggle */}
              <div className="flex items-center bg-white/[0.05] rounded-full p-0.5 text-xs border border-white/[0.08]">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded-full font-medium transition-all duration-200 ${currency === 'USD' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  USD
                </button>
                <button
                  onClick={() => setCurrency('GBP')}
                  className={`px-3 py-1 rounded-full font-medium transition-all duration-200 ${currency === 'GBP' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  GBP
                </button>
              </div>

              {user ? (
                <Link to="/dashboard" className="wave-btn wave-btn-primary wave-btn-sm">
                  <span className="wave-btn-content">Dashboard</span>
                </Link>
              ) : (
                <>
                  <Link to="/auth?mode=login" className="wave-btn wave-btn-outline wave-btn-sm">
                    <span className="wave-btn-content">Sign In</span>
                  </Link>
                  <Link to="/auth?mode=register" className="wave-btn wave-btn-primary wave-btn-sm">
                    <span className="wave-btn-content">Get Started</span>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <IconX /> : <IconMenu />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/[0.08] py-4 space-y-3">
              <form onSubmit={handleSearch} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                  <IconSearch />
                </span>
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 transition-colors"
                />
              </form>
              {['Shop', 'Creators', 'Developer', 'Pricing'].map(label => (
                <Link
                  key={label}
                  to={`/${label.toLowerCase()}`}
                  className="block text-sm text-zinc-400 hover:text-white py-1 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <div className="pt-2 flex gap-2">
                <Link to="/auth?mode=login" className="flex-1 text-center py-2 text-sm border border-white/[0.12] text-zinc-300 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link to="/auth?mode=register" className="flex-1 text-center py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white transition-colors">
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <motion.section
        className="pt-36 sm:pt-44 lg:pt-52 pb-24 sm:pb-32 relative"
        style={{ opacity: heroOpacity }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl">

            {/* Announcement pill */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 16 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-8"
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 border border-violet-500/30 text-violet-400 text-xs font-medium tracking-wide">
                New: Seller protection &amp; instant payouts
                <IconArrow />
              </span>
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 24 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[0.95] mb-7"
            >
              <span className="text-white block">The marketplace for</span>
              <span className="block" style={{ color: '#8b5cf6' }}>game creators</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 24 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="text-zinc-400 text-lg sm:text-xl max-w-xl mb-10 leading-relaxed"
            >
              Sell scripts, models, and digital assets with built-in protection.
              Sellers keep <span className="text-white font-semibold">95%</span>.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 24 }}
              transition={{ duration: 0.55, delay: 0.22 }}
              className="flex flex-col sm:flex-row items-start gap-3 mb-16"
            >
              <LiquidButton to="/shop" variant="primary">
                Browse Marketplace
                <IconArrow />
              </LiquidButton>
              <LiquidButton to="/auth?mode=register&creator=true" variant="outline">
                <IconPlay />
                Start Selling
              </LiquidButton>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 24 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="flex flex-wrap items-center gap-0"
            >
              {[
                { value: products.length.toLocaleString(), label: 'Products' },
                { value: uniqueCreators.toLocaleString(), label: 'Creators' },
                { value: totalDownloads.toLocaleString(), label: 'Downloads' },
                { value: '95%', label: 'To Sellers' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className={`flex flex-col px-6 py-3 ${i > 0 ? 'border-l border-white/[0.08]' : ''} ${i === 0 ? 'pl-0' : ''}`}
                >
                  <span className="text-2xl font-bold text-white leading-none mb-1">{stat.value}</span>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32" style={{ background: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 lg:gap-24">

            {/* Left: heading */}
            <div className="lg:col-span-2">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight"
              >
                Built for creators,<br />
                <span className="text-zinc-500">not corporations</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-5 text-zinc-500 text-base leading-relaxed max-w-xs"
              >
                Every feature is designed to put more money in your pocket and more protection around your work.
              </motion.p>
            </div>

            {/* Right: feature rows */}
            <div className="lg:col-span-3 space-y-0 divide-y divide-white/[0.06]">
              {[
                {
                  icon: <IconTrending />,
                  title: 'Keep 95%',
                  desc: 'The lowest platform fee in the market. We take 5% — you keep the rest, paid out instantly.',
                },
                {
                  icon: <IconZap />,
                  title: 'Instant Payouts',
                  desc: 'Powered by Stripe Connect. Funds hit your account the moment a sale completes.',
                },
                {
                  icon: <IconShield />,
                  title: 'License Protection',
                  desc: 'Built-in whitelisting system prevents unauthorized use of your scripts and assets.',
                },
                {
                  icon: <IconCode />,
                  title: 'Developer API',
                  desc: 'Full REST API for automation, bot integrations, and custom storefronts.',
                },
              ].map((feat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="flex items-start gap-5 py-7"
                >
                  <div className="flex-shrink-0 w-9 h-9 border border-violet-500/30 flex items-center justify-center text-violet-400">
                    {feat.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1">{feat.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{feat.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ───────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header row */}
          <div className="flex items-end justify-between mb-12">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl font-black tracking-tight text-white"
              >
                Featured products
              </motion.h2>
              <p className="text-zinc-500 text-sm mt-2">Top picks from the community</p>
            </div>
            <Link
              to="/shop"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              View all <IconArrow />
            </Link>
          </div>

          {/* Grid */}
          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-white/[0.06]">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#0a0a0a] p-1">
                  <div className="aspect-[4/3] bg-white/[0.04] animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 bg-white/[0.04] animate-pulse" />
                    <div className="h-3 w-1/2 bg-white/[0.04] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="product-card-dark"
                >
                  <ProductCard {...product} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="border border-white/[0.08] py-24 flex flex-col items-center justify-center text-center">
              <div className="text-zinc-700 mb-5">
                <IconPackage />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No products yet</h3>
              <p className="text-zinc-500 text-sm mb-6">Be the first to list your creation.</p>
              <LiquidButton to="/auth?mode=register&creator=true" variant="primary">
                Start Selling
              </LiquidButton>
            </div>
          )}

          {/* Mobile view all */}
          <div className="sm:hidden mt-8 text-center">
            <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
              View all products <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 gap-4">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-black tracking-tight text-white"
            >
              How it works
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-zinc-500 text-sm max-w-xs"
            >
              From upload to payout in three steps. No complexity, no gatekeeping.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 4V18M14 4L9 9M14 4L19 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 20H23M5 24H23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                ),
                step: '01',
                title: 'Upload your asset',
                desc: 'Drop in your script, model, or digital file. Add a title, description, and set your price. Live in under 5 minutes.',
                accent: '#8b5cf6',
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 3L5 7V14C5 19 9 23.5 14 25C19 23.5 23 19 23 14V7L14 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 14L13 17L18 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                step: '02',
                title: 'Enable protection',
                desc: 'Toggle on license protection. Every buyer gets automatically whitelisted — zero manual work on your end.',
                accent: '#7c3aed',
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M14 9V14L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 6L14 4L18 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                step: '03',
                title: 'Get paid instantly',
                desc: 'Sales hit your Stripe account the moment they complete. 95% of every transaction, no waiting, no minimums.',
                accent: '#6d28d9',
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="hiw-card group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="hiw-icon-wrap" style={{ '--accent': step.accent } as React.CSSProperties}>
                    {step.icon}
                  </div>
                  <span className="text-xs font-mono text-zinc-700 tracking-widest">{step.step}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{step.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#7c3aed' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white mb-2">
                Ready to start selling?
              </h2>
              <p className="text-violet-200 text-base">
                Join hundreds of creators already earning on Vectabase.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
              <LiquidButton to="/auth?mode=register" variant="outline" className="border-white/40 text-white">
                Create Account
                <IconArrow />
              </LiquidButton>
              <LiquidButton to="/shop" variant="outline" className="border-white/20 text-white/80">
                Browse Products
              </LiquidButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06]" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

            {/* Logo + tagline */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img src="/Logo_pic.png" alt="Vectabase" className="w-5 h-5 object-contain" />
                <span className="text-white font-bold text-sm">Vectabase</span>
              </div>
              <p className="text-zinc-600 text-xs">The marketplace for game creators.</p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                { label: 'Shop', to: '/shop' },
                { label: 'Creators', to: '/creators' },
                { label: 'Developer', to: '/developer' },
                { label: 'About', to: '/about' },
                { label: 'Terms', to: '/terms' },
                { label: 'Privacy', to: '/privacy' },
              ].map(link => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-zinc-500 hover:text-white text-xs transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Copyright */}
            <p className="text-zinc-700 text-xs">
              © {new Date().getFullYear()} Vectabase
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
