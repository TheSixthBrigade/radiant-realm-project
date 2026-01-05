import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { SEO, BreadcrumbSchema, FAQSchema } from "@/components/SEO";
import { 
  Shield, Zap, TrendingUp, Users, Lock, CheckCircle, 
  ArrowRight, Gamepad2, Code, Box, ShoppingBag
} from "lucide-react";

const About = () => {
  const faqQuestions = [
    { question: "What is Vectabase?", answer: "Vectabase is an e-commerce platform built specifically for the gaming community. We help creators sell their scripts, models, UI kits, and other digital assets to game developers worldwide." },
    { question: "How much do sellers keep?", answer: "Sellers keep 95% of their revenue. We only take a 5% platform fee, and processing fees are covered by buyers." },
    { question: "How do payouts work?", answer: "We use Stripe Connect for instant payouts. Once you connect your Stripe account, you receive payments directly." },
    { question: "How does the protection system work?", answer: "We offer built-in whitelisting systems that let you control exactly who can use your products. You can whitelist specific users or servers to prevent unauthorized distribution." },
  ];

  return (
    <div className="min-h-screen bg-slate-950 relative">
      <SEO 
        title="About Us - Digital Assets Marketplace"
        description="Learn about Vectabase, the marketplace built for game developers and creators. Sell your digital assets with 95% revenue share and built-in protection."
        url="/about"
        keywords="about Vectabase, digital assets marketplace, game creator platform, sell game scripts, creator protection"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: '/' },
        { name: 'About', url: '/about' }
      ]} />
      <FAQSchema questions={faqQuestions} />
      
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              About <span className="text-green-400">Vectabase</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 leading-relaxed">
              We're building the go-to marketplace for game developers and creators 
              to sell their digital assets with confidence and protection.
            </p>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">
                  What is Vectabase?
                </h2>
                <p className="text-slate-400 mb-4 leading-relaxed">
                  Vectabase is an e-commerce platform built specifically for the gaming community. 
                  We help creators sell their scripts, models, UI kits, and other digital assets 
                  to game developers worldwide.
                </p>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  But we're not just another marketplace. We understand that protecting your 
                  intellectual property is crucial. That's why we offer built-in protection 
                  systems including whitelisting to help you control who can use your products.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full text-sm text-slate-300">
                    <Gamepad2 className="w-4 h-4 inline mr-1.5" />Game Scripts
                  </span>
                  <span className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full text-sm text-slate-300">
                    <Box className="w-4 h-4 inline mr-1.5" />3D Models
                  </span>
                  <span className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full text-sm text-slate-300">
                    <Code className="w-4 h-4 inline mr-1.5" />UI Kits
                  </span>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">95% Revenue Share</h3>
                      <p className="text-slate-400 text-sm">Keep almost everything you earn. We only take 5%.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Instant Payouts</h3>
                      <p className="text-slate-400 text-sm">Get paid directly via Stripe Connect.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Buyer Pays Fees</h3>
                      <p className="text-slate-400 text-sm">Processing fees are covered by buyers, not you.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protection Features */}
      <section className="py-16 bg-slate-900/30 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Protect Your Creations
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                We know how hard you work on your products. That's why we provide tools 
                to help you protect them from unauthorized use.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Whitelisting System</h3>
                <p className="text-slate-400 text-sm">
                  Control exactly who can use your products. Whitelist specific users 
                  or servers to prevent unauthorized distribution.
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">License Verification</h3>
                <p className="text-slate-400 text-sm">
                  Each purchase generates a unique license. Verify buyers are legitimate 
                  before they can access your content.
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">Community Trust</h3>
                <p className="text-slate-400 text-sm">
                  Build your reputation with reviews and ratings. Trusted sellers 
                  get more visibility and sales.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Who */}
      <section className="py-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Built For
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">Sellers</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    Game script developers
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    3D modelers and artists
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    UI/UX designers
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    Audio producers
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    Anyone creating digital game assets
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">Buyers</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    Game server owners
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    Indie game developers
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    Gaming communities
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    Content creators
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    Anyone building games or servers
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-slate-400 mb-8">
              Join our growing community of creators and start selling today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-medium">
                <Link to="/auth?mode=register" className="flex items-center gap-2">
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-700 hover:bg-slate-800 text-white px-8 py-3 rounded-xl">
                <Link to="/shop" className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Browse Marketplace
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800/30 relative z-10">
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

export default About;
