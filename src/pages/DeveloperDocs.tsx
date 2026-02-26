import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import GlowingLogo from "@/components/GlowingLogo";
import { SEO, BreadcrumbSchema } from "@/components/SEO";
import { 
  BookOpen, Code, Shield, Key, Terminal, 
  LayoutDashboard, ChevronRight, Copy, Check,
  FileCode, Zap, Lock
} from "lucide-react";
import { toast } from "sonner";

// Animated gradient canvas component
const GradientCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      time += 0.002;

      // Pure black base
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle violet radial glow — bottom left
      ctx.globalCompositeOperation = 'screen';
      const glow1 = ctx.createRadialGradient(
        canvas.width * 0.15, canvas.height * 0.85, 0,
        canvas.width * 0.15, canvas.height * 0.85, canvas.width * 0.55
      );
      glow1.addColorStop(0, `rgba(124, 58, 237, ${0.08 + Math.sin(time) * 0.02})`);
      glow1.addColorStop(0.5, `rgba(109, 40, 217, ${0.03 + Math.sin(time + 1) * 0.01})`);
      glow1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle violet radial glow — top right
      const glow2 = ctx.createRadialGradient(
        canvas.width * 0.85, canvas.height * 0.15, 0,
        canvas.width * 0.85, canvas.height * 0.15, canvas.width * 0.45
      );
      glow2.addColorStop(0, `rgba(139, 92, 246, ${0.06 + Math.sin(time * 0.7 + 2) * 0.02})`);
      glow2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Floating violet particles
      for (let i = 0; i < 40; i++) {
        const x = (Math.sin(time * 0.3 + i * 47) + 1) / 2 * canvas.width;
        const y = (Math.cos(time * 0.2 + i * 31) + 1) / 2 * canvas.height;
        const size = 1 + Math.sin(time + i) * 0.8;
        const alpha = 0.08 + Math.sin(time * 2 + i) * 0.04;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0
          ? `rgba(139, 92, 246, ${alpha})`
          : i % 3 === 1
          ? `rgba(124, 58, 237, ${alpha})`
          : `rgba(167, 139, 250, ${alpha * 0.6})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
};

const DeveloperDocs = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('getting-started');

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  };

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: Zap },
    { id: 'obfuscator', title: 'Obfuscator', icon: Lock },
    { id: 'whitelist', title: 'Whitelist System', icon: Shield },
    { id: 'api', title: 'API Reference', icon: Terminal },
    { id: 'loader', title: 'Script Loader', icon: FileCode },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SEO 
        title="Developer Documentation"
        description="Complete documentation for Vectabase developer tools. Learn how to use the code obfuscator, whitelist system, API integration, and script loader."
        url="/developer/docs"
        keywords="developer documentation, API docs, obfuscator guide, whitelist documentation, Lua obfuscation tutorial"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: '/' },
        { name: 'Developer', url: '/developer' },
        { name: 'Documentation', url: '/developer/docs' }
      ]} />
      <GradientCanvas />
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px]" style={{ zIndex: 1 }} />
      
      <div className="relative" style={{ zIndex: 2 }}>
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/developer"><GlowingLogo size="sm" showText={false} /></Link>
                <div className="hidden sm:flex items-center">
                  <span className="text-white/60 mx-2">/</span>
                  <Link to="/developer" className="text-white/60 hover:text-white">Developer</Link>
                  <span className="text-white/60 mx-2">/</span>
                  <span className="text-white font-semibold">Documentation</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {user ? (
                  <Button asChild size="sm" className="bg-white text-black hover:bg-white/90 rounded-full px-4">
                    <Link to="/dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" className="bg-white text-black hover:bg-white/90 rounded-full px-4">
                    <Link to="/auth?mode=register">Sign Up Free</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="pt-20 pb-10 min-h-screen">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex gap-8">
              {/* Sidebar */}
              <div className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-24 p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Documentation
                  </h3>
                  <nav className="space-y-1">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          activeSection === section.id
                            ? 'bg-white text-black font-medium'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <section.icon className="w-4 h-4" />
                        {section.title}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4">
                    <BookOpen className="w-4 h-4 text-white" />
                    <span className="text-sm text-white">Documentation</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Developer Docs</h1>
                  <p className="text-white/60">Everything you need to integrate Vectabase into your projects.</p>
                </div>

                {/* Getting Started */}
                <section id="getting-started" className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-yellow-400" /> Getting Started
                  </h2>
                  <div className="p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 mb-4">
                    <p className="text-white/70 mb-4">
                      Welcome to Vectabase! This guide will help you get started with our developer tools.
                    </p>
                    <h3 className="text-lg font-semibold text-white mb-2">Quick Start</h3>
                    <ol className="list-decimal list-inside text-white/60 space-y-2 mb-4">
                      <li>Create a free account at <Link to="/auth?mode=register" className="text-green-400 hover:underline">vectabase.com</Link></li>
                      <li>Navigate to the Developer section</li>
                      <li>Choose your tool: Obfuscator, Whitelist, or API</li>
                      <li>Follow the specific documentation for each tool</li>
                    </ol>
                  </div>
                </section>

                {/* Obfuscator */}
                <section id="obfuscator" className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-purple-400" /> Obfuscator
                  </h2>
                  <div className="p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 mb-4">
                    <p className="text-white/70 mb-4">
                      Protect your Lua scripts with our advanced obfuscation engine. Choose from three protection levels:
                    </p>
                    <div className="space-y-3 mb-6">
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <h4 className="font-semibold text-blue-400">L3 - Performance</h4>
                        <p className="text-white/60 text-sm">Variable renaming only. Fast execution, minimal protection.</p>
                      </div>
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <h4 className="font-semibold text-yellow-400">L2 - Balanced</h4>
                        <p className="text-white/60 text-sm">Variable renaming + string encoding. Good balance.</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <h4 className="font-semibold text-red-400">L1 - Max Security</h4>
                        <p className="text-white/60 text-sm">Full obfuscation with junk code injection. Maximum protection.</p>
                      </div>
                    </div>
                    <Button asChild className="bg-white text-black hover:bg-white/90">
                      <Link to="/developer/obfuscator">Open Obfuscator <ChevronRight className="w-4 h-4 ml-1" /></Link>
                    </Button>
                  </div>
                </section>

                {/* Whitelist */}
                <section id="whitelist" className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-green-400" /> Whitelist System
                  </h2>
                  <div className="p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 mb-4">
                    <p className="text-white/70 mb-4">
                      Control who can use your scripts with our whitelist system. Features include:
                    </p>
                    <ul className="list-disc list-inside text-white/60 space-y-2 mb-4">
                      <li>Discord-based authentication</li>
                      <li>HWID (Hardware ID) locking</li>
                      <li>License key management</li>
                      <li>Real-time user tracking</li>
                      <li>Webhook notifications</li>
                    </ul>
                    <h3 className="text-lg font-semibold text-white mb-2">Loader Code</h3>
                    <div className="relative rounded-lg bg-black/50 border border-white/10 overflow-hidden mb-4">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                        <span className="text-xs text-white/40">Lua</span>
                        <button onClick={() => copyCode(`-- Vectabase Whitelist Loader
local Vectabase = loadstring(game:HttpGet("https://vectabase.com/loader"))()
Vectabase.authenticate({
    key = "YOUR_LICENSE_KEY",
    script_id = "YOUR_SCRIPT_ID"
})`, 'whitelist-loader')} className="p-1 rounded hover:bg-white/10">
                          {copied === 'whitelist-loader' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/40" />}
                        </button>
                      </div>
                      <pre className="p-4 text-sm text-white/80 overflow-x-auto">
                        <code>{`-- Vectabase Whitelist Loader
local Vectabase = loadstring(game:HttpGet("https://vectabase.com/loader"))()
Vectabase.authenticate({
    key = "YOUR_LICENSE_KEY",
    script_id = "YOUR_SCRIPT_ID"
})`}</code>
                      </pre>
                    </div>
                    <Button asChild className="bg-white text-black hover:bg-white/90">
                      <Link to="/developer/whitelist">Manage Whitelist <ChevronRight className="w-4 h-4 ml-1" /></Link>
                    </Button>
                  </div>
                </section>

                {/* API Reference */}
                <section id="api" className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Terminal className="w-6 h-6 text-orange-400" /> API Reference
                  </h2>
                  <div className="p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 mb-4">
                    <p className="text-white/70 mb-4">
                      Integrate Vectabase services into your applications with our REST API.
                    </p>
                    
                    <h3 className="text-lg font-semibold text-white mb-2">Authentication</h3>
                    <p className="text-white/60 text-sm mb-2">All API requests require an API key in the X-API-Key header:</p>
                    <div className="relative rounded-lg bg-black/50 border border-white/10 overflow-hidden mb-4">
                      <pre className="p-4 text-sm text-green-400 overflow-x-auto">
                        <code>X-API-Key: vb_xxxxxxxxxxxxxxxxxxxxx</code>
                      </pre>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">Subscription Tiers</h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-2 rounded bg-white/5 border border-white/10">
                        <div className="text-white font-medium text-sm">Free</div>
                        <div className="text-white/40 text-xs">1 obfuscation/week, 10 whitelist</div>
                      </div>
                      <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                        <div className="text-green-400 font-medium text-sm">Pro £7/mo</div>
                        <div className="text-white/40 text-xs">20 obfuscations/day, 100 whitelist</div>
                      </div>
                      <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                        <div className="text-blue-400 font-medium text-sm">Pro+ £14/mo</div>
                        <div className="text-white/40 text-xs">Unlimited obfuscations, 500 whitelist</div>
                      </div>
                      <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                        <div className="text-purple-400 font-medium text-sm">Enterprise £25/mo</div>
                        <div className="text-white/40 text-xs">Unlimited everything</div>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">Key Endpoints</h3>
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold">POST</span>
                        <code className="text-white/70">/api-obfuscate</code>
                        <span className="text-white/40">- Obfuscate Lua code</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold">POST</span>
                        <code className="text-white/70">/api-products</code>
                        <span className="text-white/40">- Create product</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold">POST</span>
                        <code className="text-white/70">/api-whitelist</code>
                        <span className="text-white/40">- Add to whitelist</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold">POST</span>
                        <code className="text-white/70">/api-verify</code>
                        <span className="text-white/40">- Verify whitelist (public)</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">Whitelist Flow</h3>
                    <ol className="list-decimal list-inside text-white/60 space-y-1 text-sm mb-4">
                      <li>Create a product with your Roblox group ID</li>
                      <li>Add users with: product_id, roblox_user_id, discord_id, expiry_date</li>
                      <li>Your Roblox game calls /api-verify with roblox_user_id and roblox_group_id</li>
                      <li>System returns whitelisted: true/false with expiry</li>
                    </ol>

                    <Button asChild className="bg-white text-black hover:bg-white/90">
                      <Link to="/developer/api">Full API Docs & Dashboard <ChevronRight className="w-4 h-4 ml-1" /></Link>
                    </Button>
                  </div>
                </section>

                {/* Script Loader */}
                <section id="loader" className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <FileCode className="w-6 h-6 text-cyan-400" /> Script Loader
                  </h2>
                  <div className="p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                    <p className="text-white/70 mb-4">
                      Use our universal loader to load protected scripts with authentication.
                    </p>
                    <div className="relative rounded-lg bg-black/50 border border-white/10 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                        <span className="text-xs text-white/40">Lua</span>
                        <button onClick={() => copyCode(`loadstring(game:HttpGet("https://vectabase.com/load/YOUR_SCRIPT_ID"))()`, 'loader')} className="p-1 rounded hover:bg-white/10">
                          {copied === 'loader' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/40" />}
                        </button>
                      </div>
                      <pre className="p-4 text-sm text-white/80 overflow-x-auto">
                        <code>{`loadstring(game:HttpGet("https://vectabase.com/load/YOUR_SCRIPT_ID"))()`}</code>
                      </pre>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDocs;
