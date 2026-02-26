import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Navigation from "@/components/Navigation";
import { SEO, BreadcrumbSchema, FAQSchema } from "@/components/SEO";

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

const PILLARS = [
  {
    n: "01",
    title: "Creator-first revenue",
    desc: "95% of every sale goes directly to the creator. We built the platform around that number — not the other way around.",
  },
  {
    n: "02",
    title: "Protection by default",
    desc: "License protection, auto-whitelisting, and script obfuscation are built in. Not add-ons. Not paywalls.",
  },
  {
    n: "03",
    title: "Instant payouts",
    desc: "Stripe Connect means money hits your account the moment a sale completes. No holding periods, no minimums.",
  },
  {
    n: "04",
    title: "Built for game devs",
    desc: "Every feature is designed around how game developers actually work — Roblox, Discord, Lua, and beyond.",
  },
];

const FAQ = [
  { q: "What is Vectabase?", a: "Vectabase is a marketplace built specifically for the gaming community. We help creators sell scripts, models, UI kits, and other digital assets to game developers worldwide." },
  { q: "How much do sellers keep?", a: "Sellers keep 95% of their revenue. We only take a 5% platform fee, and processing fees are covered by buyers." },
  { q: "How do payouts work?", a: "We use Stripe Connect for instant payouts. Once you connect your Stripe account, you receive payments directly the moment a sale completes." },
  { q: "How does the protection system work?", a: "We offer built-in whitelisting systems that let you control exactly who can use your products. You can whitelist specific users or servers to prevent unauthorized distribution." },
];

const About = () => {
  const timelineRef = useRef(null);
  const timelineInView = useInView(timelineRef, { once: true, margin: "-100px" });

  const faqQuestions = FAQ.map(f => ({ question: f.q, answer: f.a }));

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: '#000000', fontFamily: "'Geist', 'Inter', -apple-system, sans-serif" }}
    >
      <SEO
        title="About Vectabase — The Marketplace for Game Creators"
        description="Learn about Vectabase, the marketplace built for game developers and creators. Sell your digital assets with 95% revenue share and built-in protection."
        url="/about"
        keywords="about Vectabase, digital assets marketplace, game creator platform, sell game scripts, creator protection"
      />
      <BreadcrumbSchema items={[{ name: 'Home', url: '/' }, { name: 'About', url: '/about' }]} />
      <FAQSchema questions={faqQuestions} />

      <Navigation />

      {/* ── HERO — full-width, left-heavy ── */}
      <section
        className="relative pt-32 pb-0 sm:pt-40 overflow-hidden"
        style={{ background: '#000000', minHeight: '80vh', display: 'flex', alignItems: 'center' }}
      >
        {/* Ghost watermark */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{
            fontSize: 'clamp(140px, 22vw, 300px)',
            fontFamily: "'Arial Rounded MT Bold', sans-serif",
            fontWeight: 900,
            color: 'transparent',
            WebkitTextStroke: '1px rgba(139,92,246,0.08)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            userSelect: 'none',
          }}
        >
          2024
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-24">
          <motion.span
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-violet-400 mb-8"
          >
            Our Story
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="font-black leading-[0.9] tracking-tight mb-8"
            style={{ fontSize: 'clamp(52px, 9vw, 110px)' }}
          >
            <span className="block text-white">Built for</span>
            <span className="block text-white">creators,</span>
            <span className="block" style={{ color: '#8b5cf6' }}>by creators.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="text-zinc-400 text-lg max-w-xl mb-10 leading-relaxed"
          >
            We got tired of platforms taking 30–50% of every sale while offering
            zero protection for creators. So we built something better.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-start gap-3"
          >
            <Link to="/auth?mode=register" className="magnet-btn magnet-btn-primary magnet-btn-lg">
              <span className="magnet-btn-content">
                Join Vectabase
                <IconArrow />
              </span>
            </Link>
            <Link to="/shop" className="magnet-btn magnet-btn-outline magnet-btn-lg">
              <span className="magnet-btn-content">Browse Marketplace</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div
        className="border-y py-12"
        style={{ background: '#0a0a0a', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: "95%", label: "Revenue to creators" },
              { value: "5%", label: "Platform fee — that's it" },
              { value: "0s", label: "Payout delay" },
              { value: "∞", label: "Products you can list" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <div
                  className="text-4xl sm:text-5xl font-black mb-2"
                  style={{ color: i === 0 ? '#8b5cf6' : '#ffffff' }}
                >
                  {s.value}
                </div>
                <div className="text-xs text-zinc-600 uppercase tracking-widest">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MISSION — split layout ── */}
      <section className="py-24 sm:py-32" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight mb-6"
              >
                Why we built<br />
                <span className="text-zinc-500">Vectabase</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 }}
                className="text-zinc-400 text-base leading-relaxed mb-5"
              >
                Game developers were getting a raw deal. Platforms were taking 30–50% cuts,
                offering no protection for intellectual property, and making creators jump
                through hoops just to get paid.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.14 }}
                className="text-zinc-400 text-base leading-relaxed mb-8"
              >
                We built Vectabase to fix that. A marketplace where creators keep 95%,
                protection is built in by default, and payouts are instant.
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                {["No approval process to start selling", "Stripe Connect for instant payouts", "Built-in whitelist and license protection", "Obfuscation tools included"].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-zinc-400">
                    <span className="text-violet-400 flex-shrink-0"><IconCheck /></span>
                    {item}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: pillar cards */}
            <div className="space-y-3">
              {PILLARS.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-5 p-5 rounded-xl"
                  style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: 'rgba(124,58,237,0.1)', color: '#8b5cf6', border: '1px solid rgba(124,58,237,0.2)' }}
                  >
                    {p.n}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm mb-1">{p.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{p.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HORIZONTAL TIMELINE ── */}
      <section className="py-24 sm:py-32 overflow-hidden" style={{ background: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight mb-16"
          >
            How it started
          </motion.h2>

          <div ref={timelineRef} className="relative">
            {/* Base line */}
            <div
              className="hidden md:block absolute top-5 left-0 right-0 h-px"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            />
            {/* Animated progress line */}
            <motion.div
              className="hidden md:block absolute top-5 left-0 h-px"
              style={{ background: 'linear-gradient(to right, #7c3aed, #8b5cf6)', originX: 0 }}
              initial={{ scaleX: 0 }}
              animate={timelineInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
              {[
                { year: "2023", title: "The problem", desc: "Frustrated with 30%+ fees and zero creator protection on existing platforms." },
                { year: "Early 2024", title: "First build", desc: "Built the core marketplace with Stripe Connect and auto-whitelisting from day one." },
                { year: "Mid 2024", title: "Developer tools", desc: "Added the obfuscator, whitelist dashboard, and Discord bot integration." },
                { year: "Now", title: "Growing fast", desc: "Hundreds of creators earning on Vectabase. More tools shipping every month." },
              ].map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={timelineInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
                  className="relative"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black mb-5 relative z-10"
                    style={{
                      background: i === 3 ? '#7c3aed' : '#111',
                      border: `1px solid ${i === 3 ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                      color: i === 3 ? '#fff' : '#52525b',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: '#8b5cf6' }}
                  >
                    {event.year}
                  </div>
                  <h3 className="text-white font-bold text-base mb-2">{event.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{event.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 sm:py-32" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight mb-4"
              >
                Common<br />
                <span className="text-zinc-500">questions</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-zinc-500 text-sm"
              >
                Still have questions?{" "}
                <Link to="/contact" className="text-violet-400 hover:text-violet-300 transition-colors">
                  Get in touch
                </Link>
              </motion.p>
            </div>

            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="p-5 rounded-xl"
                  style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <h3 className="text-white font-bold text-sm mb-2">{item.q}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{item.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: '#7c3aed' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white mb-2">
                Ready to start selling?
              </h2>
              <p className="text-violet-200 text-base">Join hundreds of creators already earning on Vectabase.</p>
            </div>
            <div className="flex-shrink-0 flex gap-3 flex-wrap">
              <Link to="/auth?mode=register&creator=true" className="magnet-btn magnet-btn-dark magnet-btn-lg">
                <span className="magnet-btn-content">
                  Create Account
                  <IconArrow />
                </span>
              </Link>
              <Link to="/shop" className="magnet-btn magnet-btn-outline magnet-btn-lg" style={{ borderColor: 'rgba(255,255,255,0.4)' }}>
                <span className="magnet-btn-content">Browse Shop</span>
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

export default About;
