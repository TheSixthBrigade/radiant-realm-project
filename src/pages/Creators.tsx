import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { useStats } from "@/hooks/useStats";
import { SEO, BreadcrumbSchema } from "@/components/SEO";

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconStar = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
    <path d="M6.5 1L7.9 4.6L11.8 4.9L9 7.3L9.9 11.1L6.5 9.1L3.1 11.1L4 7.3L1.2 4.9L5.1 4.6L6.5 1Z"/>
  </svg>
);
const IconTrendUp = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 11L6 7L9 10L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 4H14V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FEATURES = [
  {
    tag: "Revenue",
    title: "Keep 95% of every sale",
    desc: "The lowest platform fee in the market. We take 5% — you keep the rest, transferred directly to your Stripe account the moment a sale completes.",
    accent: "#8b5cf6",
  },
  {
    tag: "Protection",
    title: "License protection built in",
    desc: "Every buyer is automatically whitelisted. No manual work, no spreadsheets. Your scripts stay protected without you lifting a finger.",
    accent: "#7c3aed",
  },
  {
    tag: "Audience",
    title: "Thousands of active buyers",
    desc: "Game developers are already here searching for assets like yours. You don't need to build an audience — we bring it to you.",
    accent: "#8b5cf6",
  },
  {
    tag: "Analytics",
    title: "Real-time sales dashboard",
    desc: "Track revenue, downloads, and conversion rates. Know exactly what's selling and when, with data that actually helps you grow.",
    accent: "#7c3aed",
  },
];

const STEPS = [
  { n: "01", title: "Create your account", desc: "Sign up in under a minute. No approval process, no waiting list." },
  { n: "02", title: "Upload your first asset", desc: "Add a title, description, screenshots, and set your price. Live in under 5 minutes." },
  { n: "03", title: "Enable license protection", desc: "One toggle. Every buyer gets auto-whitelisted — zero manual work." },
  { n: "04", title: "Watch the money come in", desc: "Sales hit your Stripe account instantly. 95% of every transaction, no minimums." },
];

const TESTIMONIALS = [
  { name: "Alex R.", role: "3D Artist", content: "Made over $5k in my first month. The platform just works — clean, fast, and the payout is instant.", earnings: "$12,450", months: "4 months" },
  { name: "Sarah C.", role: "Script Developer", content: "I was skeptical but the license protection alone is worth it. My scripts are actually protected now.", earnings: "$8,920", months: "3 months" },
  { name: "Mike J.", role: "Game Designer", content: "Best decision I made. 95% revenue share is unmatched. Every other platform takes way more.", earnings: "$15,680", months: "6 months" },
];

const Creators = () => {
  const { stats, loading: statsLoading, formatNumber } = useStats();

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: '#000000', fontFamily: "'Geist', 'Inter', -apple-system, sans-serif" }}
    >
      <SEO
        title="Become a Creator — Sell Game Assets on Vectabase"
        description="Turn your creative skills into passive income. Sell game assets, scripts, and tools on Vectabase. Keep 95% of your earnings."
        url="/creators"
        keywords="sell digital assets, become a creator, game asset marketplace, passive income, sell scripts, sell 3D models"
      />
      <BreadcrumbSchema items={[{ name: 'Home', url: '/' }, { name: 'Creators', url: '/creators' }]} />

      <Navigation />

      {/* ── HERO — two column ── */}
      <section className="pt-32 pb-20 sm:pt-40 sm:pb-28" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            {/* Left: copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="inline-flex items-center gap-2 mb-7"
              >
                <span className="px-3 py-1 border border-violet-500/30 text-violet-400 text-xs font-medium tracking-wide">
                  For Creators
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.07 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.92] tracking-tight mb-6"
              >
                <span className="text-white block">Your skills.</span>
                <span className="block" style={{ color: '#8b5cf6' }}>Your income.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.14 }}
                className="text-zinc-400 text-lg max-w-md mb-8 leading-relaxed"
              >
                Sell scripts, models, and digital assets to thousands of game developers.
                Keep <span className="text-white font-semibold">95%</span> of every sale — paid out instantly.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row items-start gap-3 mb-10"
              >
                <Link to="/auth?mode=register&creator=true" className="ink-btn ink-btn-primary ink-btn-lg">
                  <span className="ink-btn-content">
                    Start Selling Today
                    <IconArrow />
                  </span>
                </Link>
                <Link to="/shop" className="ink-btn ink-btn-outline ink-btn-lg">
                  <span className="ink-btn-content">Browse Marketplace</span>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap gap-x-6 gap-y-2"
              >
                {["No approval needed", "Instant Stripe payouts", "Built-in license protection"].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className="text-violet-400"><IconCheck /></span>
                    {item}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right: floating earnings card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="hidden lg:block"
            >
              <div
                className="relative rounded-2xl p-6"
                style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Earnings</p>
                    <p className="text-3xl font-black text-white">$12,450</p>
                  </div>
                  <span
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.25)' }}
                  >
                    <IconTrendUp /> +24% this month
                  </span>
                </div>

                {/* Mini bar chart */}
                <div className="flex items-end gap-1.5 h-16 mb-6">
                  {[40, 65, 45, 80, 55, 90, 70, 100, 75, 95, 60, 85].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: 0.4 + i * 0.04, ease: "easeOut" }}
                      className="flex-1 rounded-sm"
                      style={{ background: i === 11 ? '#8b5cf6' : 'rgba(139,92,246,0.2)' }}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-zinc-600 uppercase tracking-wider">Recent Sales</p>
                  {[
                    { name: "Advanced Combat System", price: "$24.99", time: "2m ago" },
                    { name: "UI Component Pack", price: "$14.99", time: "18m ago" },
                    { name: "Pathfinding Module", price: "$19.99", time: "1h ago" },
                  ].map((sale, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <p className="text-sm text-white font-medium">{sale.name}</p>
                        <p className="text-xs text-zinc-600">{sale.time}</p>
                      </div>
                      <span className="text-sm font-bold text-violet-400">{sale.price}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs text-zinc-500">Platform fee</span>
                  <span className="text-xs font-bold text-white">5% — you keep 95%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
            {[
              { label: "Paid to Creators", value: statsLoading ? "—" : (stats.hasRealData ? formatNumber(stats.totalRevenue) : "$0") },
              { label: "Active Creators", value: statsLoading ? "—" : (stats.hasRealData ? formatNumber(stats.totalCreators) : "0") },
              { label: "Products Sold", value: statsLoading ? "—" : (stats.hasRealData ? formatNumber(stats.totalSales) : "0") },
              { label: "Creator Revenue Share", value: "95%" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center sm:text-left"
              >
                <div className="text-4xl sm:text-5xl font-black mb-1 text-white">{s.value}</div>
                <div className="text-xs text-zinc-600 uppercase tracking-widest">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES — left-border cards 2x2 grid ── */}
      <section className="py-24 sm:py-32" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight"
            >
              Everything you need<br />
              <span className="text-zinc-500">to earn more</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09 }}
                className="p-6 rounded-xl transition-all duration-300 hover:border-violet-500/20"
                style={{
                  background: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderLeft: `3px solid ${f.accent}`,
                }}
              >
                <span
                  className="inline-block text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-4"
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}
                >
                  {f.tag}
                </span>
                <h3 className="text-white font-bold text-lg mb-2 leading-tight">{f.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — vertical timeline ── */}
      <section className="py-24 sm:py-32" style={{ background: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight"
              >
                From zero to<br />
                <span style={{ color: '#8b5cf6' }}>earning in minutes</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="mt-5 text-zinc-500 text-base leading-relaxed max-w-sm"
              >
                No approval process. No waiting. Just upload and start earning.
              </motion.p>
            </div>

            <div className="relative">
              <div
                className="absolute left-5 top-0 bottom-0 w-px"
                style={{ background: 'linear-gradient(to bottom, rgba(139,92,246,0.5), rgba(139,92,246,0.1), transparent)' }}
              />
              <div className="space-y-0">
                {STEPS.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative flex gap-8 pb-10 last:pb-0"
                  >
                    <div
                      className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-black"
                      style={{
                        background: i === 0 ? '#7c3aed' : '#111111',
                        border: `1px solid ${i === 0 ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                        color: i === 0 ? '#fff' : '#71717a',
                      }}
                    >
                      {step.n}
                    </div>
                    <div className="pt-2">
                      <h3 className="text-white font-bold text-base mb-1.5">{step.title}</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS — staggered ── */}
      <section className="py-24 sm:py-32" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-14"
          >
            Real creators,<br />
            <span className="text-zinc-500">real earnings</span>
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                style={{
                  marginTop: i === 1 ? '2rem' : '0',
                  background: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <div className="flex items-center gap-0.5 mb-4 text-violet-400">
                  {[...Array(5)].map((_, j) => <IconStar key={j} />)}
                </div>

                <p className="text-zinc-400 text-sm leading-relaxed mb-6">"{t.content}"</p>

                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-5"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                  <span className="text-lg font-black text-violet-400">{t.earnings}</span>
                  <span className="text-xs text-zinc-500">in {t.months}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-zinc-600 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: '#7c3aed' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white mb-2">
                Ready to start earning?
              </h2>
              <p className="text-violet-200 text-base">Join hundreds of creators already earning on Vectabase.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
              <Link to="/auth?mode=register&creator=true" className="ink-btn ink-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.4)' }}>
                <span className="ink-btn-content">
                  Create Account
                  <IconArrow />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06]" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img src="/Logo_pic.png" alt="Vectabase" className="w-5 h-5 object-contain" />
                <span className="text-white font-bold text-sm">Vectabase</span>
              </div>
              <p className="text-zinc-600 text-xs">The marketplace for game creators.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[['Shop', '/shop'], ['Creators', '/creators'], ['Developer', '/developer'], ['About', '/about'], ['Terms', '/terms'], ['Privacy', '/privacy']].map(([label, to]) => (
                <Link key={label} to={to} className="text-zinc-500 hover:text-white text-xs transition-colors">{label}</Link>
              ))}
            </div>
            <p className="text-zinc-700 text-xs">© {new Date().getFullYear()} Vectabase</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Creators;
