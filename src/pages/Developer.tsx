import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Lock, CheckSquare, Bot, Key, BookOpen, BarChart2, Shield, Users, Zap } from "lucide-react";

const tools = [
  { title: "Obfuscator", description: "Protect your Lua scripts with enterprise-grade obfuscation.", href: "/developer/obfuscator" },
  { title: "Whitelist", description: "Control who can access your products with license keys.", href: "/developer/whitelist" },
  { title: "Discord Bot", description: "Automate role assignment and whitelist verification.", href: "/developer/bot" },
  { title: "API Keys", description: "Generate and manage keys for programmatic access.", href: "/developer/keys" },
  { title: "Documentation", description: "Full API reference, guides, and integration examples.", href: "/developer/docs" },
  { title: "Dashboard", description: "Monitor usage, analytics, and subscription status.", href: "/developer/bot" },
];

const tickerItems = [
  "Obfuscation",
  "Whitelisting",
  "API Keys",
  "Discord Bot",
  "Rate Limiting",
  "Webhooks",
  "Analytics",
  "License Keys",
  "Roblox Integration",
  "Encryption",
];

const beforeCode = `-- Original script
local Players = game:GetService("Players")
local function onPlayerAdded(player)
  print("Welcome " .. player.Name)
  player.CharacterAdded:Connect(function(char)
    char:WaitForChild("Humanoid").Health = 100
  end)
end
Players.PlayerAdded:Connect(onPlayerAdded)`;

const afterCode = `-- Obfuscated output
local _0x1a2b={}local _0x3c4d=game
local _0x5e6f=_0x3c4d:GetService('Players')
local function _0x7a8b(_0x9c0d)
_0x1a2b[#_0x1a2b+1]=_0x9c0d
_0x9c0d['CharacterAdded']:Connect(
function(_0xef01)_0xef01:WaitForChild(
'Humanoid').Health=0x64 end)end
_0x5e6f.PlayerAdded:Connect(_0x7a8b)`;

export default function Developer() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Violet glow — large enough to bleed over the centered watermark */}
        <div className="absolute -top-20 right-[200px] w-[1000px] h-[1000px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'rgba(124, 58, 237, 0.12)' }} />
        {/* Ghost watermark — stays very dark, revealed by the glow above */}
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black text-white/[0.03] select-none pointer-events-none leading-none">
          API
        </span>

        <div className="relative max-w-6xl mx-auto">
          <p className="text-violet-400 text-sm font-mono uppercase tracking-widest mb-4">
            Developer Platform
          </p>
          <h1 className="text-6xl md:text-8xl font-black leading-none mb-6">
            Build
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-600">
              Without
            </span>
            <br />
            Limits.
          </h1>
          <p className="text-white/60 text-xl max-w-xl mb-10">
            A full suite of developer tools — obfuscation, whitelisting, bot
            automation, and a REST API — all in one platform.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/developer/docs">
              <button className="magnet-btn magnet-btn-primary px-8 py-4 text-base font-semibold">
                <span className="magnet-btn-content">Read the Docs</span>
              </button>
            </Link>
            <Link to="/developer/keys">
              <button className="magnet-btn magnet-btn-outline px-8 py-4 text-base font-semibold">
                <span className="magnet-btn-content">Get API Key</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="border-y border-white/10 py-4 overflow-hidden bg-white/[0.02]">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="ticker-item">
              <span className="ticker-dot" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Bento feature cards */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-violet-400 text-sm font-mono uppercase tracking-widest mb-3">
            What's included
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-16">
            Everything you need.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tall card */}
            <div className="bento-card bento-card-tall md:row-span-2 flex flex-col justify-between">
              <div>
                <Lock className="w-8 h-8 text-violet-400 mb-6" />
                <h3 className="text-2xl font-bold mb-3">Obfuscation</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Military-grade Lua obfuscation. Protect your scripts from
                  reverse engineering with multiple layers of transformation.
                </p>
              </div>
              <div className="mt-8">
                <span className="bento-tag">Lua 5.1+</span>
                <span className="bento-tag">Roblox</span>
                <span className="bento-tag">Batch</span>
              </div>
            </div>

            <div className="bento-card">
              <CheckSquare className="w-7 h-7 text-violet-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Whitelist System</h3>
              <p className="text-white/50 text-sm">
                License key generation and validation with Roblox user binding.
              </p>
            </div>

            <div className="bento-card">
              <Bot className="w-7 h-7 text-violet-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Discord Bot</h3>
              <p className="text-white/50 text-sm">
                Automate role assignment and whitelist verification directly in
                your server.
              </p>
            </div>

            <div className="bento-card">
              <Key className="w-7 h-7 text-violet-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">API Keys</h3>
              <p className="text-white/50 text-sm">
                Scoped API keys with rate limiting and usage analytics.
              </p>
            </div>

            <div className="bento-card">
              <BarChart2 className="w-7 h-7 text-violet-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Analytics</h3>
              <p className="text-white/50 text-sm">
                Real-time usage metrics, request logs, and error tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Before / After code comparison */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-violet-400 text-sm font-mono uppercase tracking-widest mb-3">
            Obfuscation preview
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-16">
            See the difference.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-3">
                Before
              </p>
              <pre className="bg-white/5 border border-white/10 rounded-xl p-6 text-sm text-green-400 font-mono overflow-x-auto leading-relaxed">
                {beforeCode}
              </pre>
            </div>
            <div>
              <p className="text-violet-400 text-xs font-mono uppercase tracking-widest mb-3">
                After
              </p>
              <pre className="bg-violet-950/30 border border-violet-500/20 rounded-xl p-6 text-sm text-violet-300 font-mono overflow-x-auto leading-relaxed">
                {afterCode}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-violet-400 text-sm font-mono uppercase tracking-widest mb-3">
            All tools
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-16">
            Pick your tool.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => {
              const iconMap: Record<string, React.ReactNode> = {
                "Obfuscator": <Lock className="w-6 h-6 text-violet-400" />,
                "Whitelist": <CheckSquare className="w-6 h-6 text-violet-400" />,
                "Discord Bot": <Bot className="w-6 h-6 text-violet-400" />,
                "API Keys": <Key className="w-6 h-6 text-violet-400" />,
                "Documentation": <BookOpen className="w-6 h-6 text-violet-400" />,
                "Dashboard": <BarChart2 className="w-6 h-6 text-violet-400" />,
              };
              return (
                <Link key={tool.href} to={tool.href}>
                  <div className="group border border-white/10 rounded-xl p-6 bg-white/[0.02] hover:border-violet-500/50 hover:bg-violet-950/20 transition-all duration-300 cursor-pointer">
                    <div className="mb-4">{iconMap[tool.title]}</div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-violet-300 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-white/50 text-sm">{tool.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 to-black pointer-events-none" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[18vw] font-black text-white/[0.03] select-none pointer-events-none leading-none">
          BUILD
        </span>
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            Ready to ship?
          </h2>
          <p className="text-white/60 text-lg mb-10">
            Get started with the developer platform today. Free tier available.
          </p>
          <Link to="/developer/keys">
            <button className="magnet-btn magnet-btn-glow px-10 py-5 text-lg font-semibold">
              <span className="magnet-btn-content">Start Building</span>
            </button>
          </Link>
        </div>
      </section>

    </div>
  );
}
