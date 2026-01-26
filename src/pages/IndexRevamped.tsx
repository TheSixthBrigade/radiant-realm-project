import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ParticleBackground } from '@/components/animations/ParticleBackground';
import { TypeWriter } from '@/components/animations/TypeWriter';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { FadeIn } from '@/components/animations/FadeIn';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InteractiveWorldMap } from '@/components/InteractiveWorldMap';
import { designTokens } from '@/lib/design-tokens';
import { animationVariants } from '@/lib/animation-variants';
import { 
  Zap, Shield, Users, TrendingUp, Package, 
  Code, Palette, Box, ArrowRight, Sparkles,
  Star, Download, ChevronDown, DollarSign, 
  Rocket, Globe, Lock, BarChart3, Layers
} from 'lucide-react';

export default function IndexRevamped() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative">
      {/* Animated Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#6366f1]/20 via-[#0a0a0f] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#8b5cf6]/15 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#06b6d4]/10 via-transparent to-transparent" />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Floating Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#6366f1]/30 rounded-full blur-[150px]"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.6, 0.4],
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#8b5cf6]/25 rounded-full blur-[150px]"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
              x: [0, -40, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-[#06b6d4]/20 rounded-full blur-[120px]"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [-50, 50, -50],
              y: [30, -30, 30],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>

        {/* Floating 3D Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-32 border border-[#6366f1]/20 rounded-2xl backdrop-blur-sm"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + (i % 3) * 30}%`,
              }}
              animate={{
                y: [0, -30, 0],
                rotate: [0, 180, 360],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5,
              }}
            />
          ))}
        </div>

        {/* Hero Content */}
        <motion.div 
          className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center"
          style={{ opacity, scale }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#6366f1]/20 to-[#8b5cf6]/20 border border-[#6366f1]/30 mb-8 backdrop-blur-xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5 text-[#6366f1]" />
            </motion.div>
            <span className="text-sm font-medium bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent">
              The Future of Digital Marketplaces
            </span>
          </motion.div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <TypeWriter 
                text="Build. Sell. Scale."
                speed={100}
                cursor={false}
                className="block mb-4"
              />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.5, duration: 1 }}
              className="block bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient"
            >
              with Vectabase
            </motion.span>
          </h1>

          <FadeIn delay={3} duration={0.8}>
            <p className="text-xl sm:text-2xl text-[#a1a1aa] mb-8 max-w-3xl mx-auto leading-relaxed">
              The premium marketplace for game creators. Sell your digital assets with built-in protection. 
              <span className="text-[#6366f1] font-semibold"> Keep 95% of every sale.</span>
            </p>
          </FadeIn>

          {/* Stats Row */}
          <FadeIn delay={3.5} duration={0.8}>
            <div className="flex flex-wrap items-center justify-center gap-8 mb-12 text-sm">
              {[
                { label: 'Active Creators', value: '10,000+', icon: Users },
                { label: 'Products Sold', value: '50,000+', icon: Package },
                { label: 'Revenue Generated', value: '$2M+', icon: DollarSign },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl bg-[#13131a]/50 border border-[#27272a] backdrop-blur-sm"
                  whileHover={{ scale: 1.05, borderColor: '#6366f1' }}
                >
                  <stat.icon className="w-5 h-5 text-[#6366f1]" />
                  <div className="text-left">
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-[#71717a]">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={4} duration={0.8}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Button variant="primary" size="lg" className="group relative overflow-hidden">
                <Link to="/shop" className="flex items-center gap-2 relative z-10">
                  <Rocket className="w-5 h-5" />
                  Explore Marketplace
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1]"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </Button>
              <Button variant="outline" size="lg" className="group">
                <Link to="/auth?mode=register" className="flex items-center gap-2">
                  Start Selling
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </FadeIn>

          {/* Scroll Indicator - Fixed positioning */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4.5, duration: 1 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2 text-[#71717a] cursor-pointer hover:text-[#6366f1] transition-colors"
            >
              <span className="text-sm font-medium">Scroll to explore</span>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ChevronDown className="w-6 h-6" />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Global Reach Section - Interactive World Map */}
      <section className="py-24 relative overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f]" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal direction="up">
            <div className="text-center mb-12">
              <motion.div
                className="inline-block px-4 py-2 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20 mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-sm font-medium text-[#06b6d4]">GLOBAL REACH</span>
              </motion.div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-white to-[#a1a1aa] bg-clip-text text-transparent">
                Trusted Worldwide
              </h2>
              <p className="text-lg text-[#a1a1aa] max-w-2xl mx-auto">
                Join creators from every corner of the globe. Hover over regions to see our community stats.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <InteractiveWorldMap />
          </ScrollReveal>

          {/* Global Stats */}
          <ScrollReveal direction="up" delay={0.4}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
              {[
                { label: 'Countries', value: '150+', icon: Globe },
                { label: 'Total Visitors', value: '160K+', icon: Users },
                { label: 'Active Creators', value: '10K+', icon: Sparkles },
                { label: 'Total Revenue', value: '$2.9M+', icon: DollarSign },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  className="text-center p-4 rounded-xl bg-[#13131a]/50 border border-[#27272a] backdrop-blur-sm"
                  whileHover={{ scale: 1.05, borderColor: '#6366f1' }}
                >
                  <stat.icon className="w-6 h-6 text-[#6366f1] mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-[#71717a]">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section className="py-32 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up">
            <div className="text-center mb-20">
              <motion.div
                className="inline-block px-4 py-2 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-sm font-medium text-[#6366f1]">FEATURES</span>
              </motion.div>
              <h2 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-white to-[#a1a1aa] bg-clip-text text-transparent">
                Everything You Need to Succeed
              </h2>
              <p className="text-xl text-[#a1a1aa] max-w-2xl mx-auto">
                Built for creators, by creators. No compromises.
              </p>
            </div>
          </ScrollReveal>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {[
              {
                icon: TrendingUp,
                title: 'Keep More Money',
                description: 'Only 5% platform fee. The rest is yours. No hidden charges, no surprises.',
                color: '#10b981',
                size: 'normal',
              },
              {
                icon: Zap,
                title: 'Instant Payouts',
                description: 'Get paid immediately via Stripe Connect. Your money, your control.',
                color: '#f59e0b',
                size: 'normal',
              },
              {
                icon: Shield,
                title: 'Built-in Protection',
                description: 'Advanced whitelisting and license management. Protect your work automatically.',
                color: '#6366f1',
                size: 'large',
              },
              {
                icon: Users,
                title: 'Growing Community',
                description: 'Join thousands of creators building the future of digital commerce.',
                color: '#8b5cf6',
                size: 'normal',
              },
              {
                icon: Code,
                title: 'Developer API',
                description: 'Integrate with your tools. Full API access for automation and custom workflows.',
                color: '#06b6d4',
                size: 'normal',
              },
              {
                icon: Package,
                title: 'Easy Management',
                description: 'Intuitive dashboard to manage products, sales, and analytics in one place.',
                color: '#ec4899',
                size: 'normal',
              },
            ].map((feature, index) => (
              <ScrollReveal 
                key={index} 
                direction="up" 
                delay={index * 0.1}
              >
                <motion.div
                  className={`h-full ${feature.size === 'large' ? 'md:col-span-2 lg:col-span-1 lg:row-span-2' : ''}`}
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  whileHover={{ y: -8 }}
                >
                  <Card
                    variant="glass"
                    className="h-full group cursor-default relative overflow-hidden border-[#27272a] hover:border-[#6366f1]/50 transition-all duration-500"
                  >
                    {/* Animated gradient on hover */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, ${feature.color}15, transparent 50%)`,
                      }}
                    />
                    
                    <div className="relative z-10 p-8">
                      <motion.div
                        animate={{
                          scale: hoveredFeature === index ? 1.1 : 1,
                          rotate: hoveredFeature === index ? [0, -10, 10, 0] : 0,
                        }}
                        transition={{ duration: 0.5 }}
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative"
                        style={{ 
                          backgroundColor: `${feature.color}20`,
                          border: `2px solid ${feature.color}40`,
                          boxShadow: hoveredFeature === index ? `0 0 30px ${feature.color}40` : 'none',
                        }}
                      >
                        <feature.icon 
                          className="w-8 h-8" 
                          style={{ color: feature.color }}
                        />
                      </motion.div>
                      <h3 className="text-2xl font-bold mb-4 group-hover:text-[#6366f1] transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-[#a1a1aa] leading-relaxed text-lg">
                        {feature.description}
                      </p>
                      
                      {/* Decorative corner */}
                      <motion.div
                        className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                          background: `radial-gradient(circle at top right, ${feature.color}10, transparent 70%)`,
                        }}
                      />
                    </div>
                  </Card>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>

          {/* Additional Features Row */}
          <ScrollReveal direction="up" delay={0.6}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {[
                { icon: Globe, label: 'Global Reach', value: '150+ Countries' },
                { icon: Lock, label: 'Secure Payments', value: '256-bit SSL' },
                { icon: BarChart3, label: 'Real-time Analytics', value: 'Live Dashboard' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="p-6 rounded-2xl bg-gradient-to-br from-[#13131a] to-[#1a1a24] border border-[#27272a] hover:border-[#6366f1]/50 transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -4 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#6366f1]/10 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-[#6366f1]" />
                    </div>
                    <div>
                      <div className="text-sm text-[#71717a] mb-1">{item.label}</div>
                      <div className="text-xl font-bold">{item.value}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="py-32 bg-gradient-to-b from-[#0a0a0f] via-[#13131a]/30 to-[#0a0a0f] relative overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-20">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, #6366f1 1px, transparent 1px),
                linear-gradient(to bottom, #6366f1 1px, transparent 1px)
              `,
              backgroundSize: '80px 80px',
            }}
          />
        </div>

        {/* Glowing lines */}
        <motion.div
          className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6366f1] to-transparent"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal direction="up">
            <div className="text-center mb-16">
              <motion.div
                className="inline-block px-4 py-2 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-sm font-medium text-[#8b5cf6]">MARKETPLACE</span>
              </motion.div>
              <h2 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-white to-[#a1a1aa] bg-clip-text text-transparent">
                Featured Products
              </h2>
              <p className="text-xl text-[#a1a1aa]">
                Discover what our community is creating
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {[1, 2, 3].map((item, index) => (
              <ScrollReveal key={index} direction="up" delay={index * 0.15}>
                <motion.div
                  whileHover={{ y: -12, scale: 1.02 }}
                  className="group cursor-pointer"
                >
                  <Card variant="elevated" padding="none" className="overflow-hidden border-[#27272a] hover:border-[#6366f1]/50 transition-all duration-500">
                    {/* Product Image */}
                    <div className="aspect-video bg-gradient-to-br from-[#6366f1]/30 to-[#8b5cf6]/30 relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/50 to-[#8b5cf6]/50"
                        initial={{ opacity: 0, scale: 1.2 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          whileHover={{ rotate: 360, scale: 1.2 }}
                          transition={{ duration: 0.8 }}
                        >
                          <Layers className="w-20 h-20 text-white/50" />
                        </motion.div>
                      </div>
                      
                      {/* Hover overlay */}
                      <motion.div
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <Button variant="primary" size="sm">
                          <span className="flex items-center gap-2">
                            View Details
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </Button>
                      </motion.div>
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-6 bg-gradient-to-b from-[#13131a] to-[#0a0a0f]">
                      <h3 className="text-xl font-bold mb-3 group-hover:text-[#6366f1] transition-colors">
                        Premium Asset Pack {item}
                      </h3>
                      <p className="text-sm text-[#71717a] mb-4">
                        High-quality game assets for your next project
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-[#a1a1aa]">
                          <motion.span 
                            className="flex items-center gap-1"
                            whileHover={{ scale: 1.1 }}
                          >
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">4.9</span>
                          </motion.span>
                          <motion.span 
                            className="flex items-center gap-1"
                            whileHover={{ scale: 1.1 }}
                          >
                            <Download className="w-4 h-4 text-[#6366f1]" />
                            <span className="font-medium">1.2k</span>
                          </motion.span>
                        </div>
                        <motion.span 
                          className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent"
                          whileHover={{ scale: 1.1 }}
                        >
                          $29.99
                        </motion.span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal direction="up">
            <div className="text-center">
              <Button variant="outline" size="lg" className="group">
                <Link to="/shop" className="flex items-center gap-2">
                  View All Products
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <ParticleBackground 
          particleCount={50} 
          color="#8b5cf6" 
          speed={0.4}
          interactive={true}
        />

        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/20 via-[#8b5cf6]/10 to-[#06b6d4]/20"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        {/* Floating shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-64 h-64 rounded-full"
              style={{
                background: `radial-gradient(circle, ${i % 2 === 0 ? '#6366f1' : '#8b5cf6'}20, transparent 70%)`,
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{
                y: [0, -50, 0],
                x: [0, 30, 0],
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 8 + i,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal direction="up">
            <div className="max-w-4xl mx-auto">
              {/* Main CTA Card */}
              <motion.div
                className="relative p-12 rounded-3xl bg-gradient-to-br from-[#13131a]/80 to-[#1a1a24]/80 border border-[#27272a] backdrop-blur-xl overflow-hidden"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {/* Animated border glow */}
                <motion.div
                  className="absolute inset-0 rounded-3xl"
                  style={{
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4, #6366f1)',
                    backgroundSize: '300% 300%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                <div className="absolute inset-[2px] rounded-3xl bg-gradient-to-br from-[#13131a] to-[#1a1a24]" />
                
                {/* Content */}
                <div className="relative z-10 text-center">
                  <motion.div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 mb-6"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Rocket className="w-4 h-4 text-[#6366f1]" />
                    <span className="text-sm font-medium text-[#6366f1]">START TODAY</span>
                  </motion.div>
                  
                  <h2 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-white to-[#a1a1aa] bg-clip-text text-transparent">
                    Ready to Start Your Journey?
                  </h2>
                  <p className="text-xl text-[#a1a1aa] mb-10 leading-relaxed max-w-2xl mx-auto">
                    Join thousands of creators who are already building their business on Vectabase. 
                    <span className="text-white font-semibold"> No credit card required</span> to get started.
                  </p>
                  
                  {/* Trust indicators */}
                  <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-sm">
                    {[
                      { icon: Shield, text: 'Secure & Protected' },
                      { icon: Zap, text: 'Instant Setup' },
                      { icon: Users, text: '10k+ Creators' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center gap-2 text-[#a1a1aa]"
                        whileHover={{ scale: 1.1, color: '#6366f1' }}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.text}</span>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button variant="primary" size="lg" className="group relative overflow-hidden">
                      <Link to="/auth?mode=register" className="flex items-center gap-2 relative z-10">
                        <Rocket className="w-5 h-5" />
                        Create Free Account
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4]"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    </Button>
                    <Button variant="ghost" size="lg" className="group">
                      <Link to="/about" className="flex items-center gap-2">
                        Learn More
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-[#27272a] relative overflow-hidden">
        {/* Subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13131a]/50 to-transparent pointer-events-none" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center relative overflow-hidden"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-white font-bold text-lg relative z-10">V</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4]"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-[#a1a1aa] bg-clip-text text-transparent">
                Vectabase
              </span>
            </motion.div>
            
            <p className="text-[#71717a] text-sm">
              © {new Date().getFullYear()} Vectabase. Built for creators.
            </p>
            
            <div className="flex items-center gap-8">
              {[
                { to: '/about', label: 'About' },
                { to: '/shop', label: 'Shop' },
                { to: '/auth', label: 'Sign In' },
              ].map((link, i) => (
                <motion.div key={i} whileHover={{ y: -2 }}>
                  <Link 
                    to={link.to} 
                    className="text-[#a1a1aa] hover:text-[#6366f1] transition-colors text-sm font-medium"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Additional footer info */}
          <div className="pt-8 border-t border-[#27272a]/50 text-center">
            <p className="text-xs text-[#71717a]">
              Secure payments powered by Stripe • Built with React & PostgreSQL
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
