import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import GlowingLogo from "@/components/GlowingLogo";
import { SEO, BreadcrumbSchema } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { 
  Terminal, Code, Shield, Key, Plus, Trash2, RefreshCw,
  LayoutDashboard, Copy, Check, ChevronDown, ChevronRight,
  Zap, Users, CreditCard, Crown
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

interface EndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  response?: string;
  example?: string;
}

const Endpoint = ({ method, path, description, params, response, example }: EndpointProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const methodColors = {
    GET: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const copyExample = () => {
    if (example) {
      navigator.clipboard.writeText(example);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-bold border ${methodColors[method]}`}>
            {method}
          </span>
          <code className="text-white/80 text-sm">{path}</code>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-sm hidden sm:block">{description}</span>
          {expanded ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
        </div>
      </button>
      
      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          <p className="text-white/60 text-sm">{description}</p>
          
          {params && params.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Parameters</h4>
              <div className="rounded-lg bg-black/30 border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-white/60 font-medium">Name</th>
                      <th className="text-left p-3 text-white/60 font-medium">Type</th>
                      <th className="text-left p-3 text-white/60 font-medium">Required</th>
                      <th className="text-left p-3 text-white/60 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {params.map((param, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="p-3 text-green-400 font-mono">{param.name}</td>
                        <td className="p-3 text-yellow-400">{param.type}</td>
                        <td className="p-3">{param.required ? <span className="text-red-400">Yes</span> : <span className="text-white/40">No</span>}</td>
                        <td className="p-3 text-white/60">{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {response && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Response</h4>
              <pre className="p-4 rounded-lg bg-black/50 border border-white/10 text-sm text-white/80 overflow-x-auto">
                <code>{response}</code>
              </pre>
            </div>
          )}
          
          {example && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">Example</h4>
                <button onClick={copyExample} className="p-1 rounded hover:bg-white/10">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/40" />}
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-black/50 border border-white/10 text-sm text-white/80 overflow-x-auto">
                <code>{example}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Calculate price with Stripe fees (2.9% + 30p) + 20% VAT
// This is used internally - we show clean prices to users
const calculatePriceWithFees = (basePricePence: number): number => {
  const withStripeFee = (basePricePence + 30) / (1 - 0.029);
  const withVAT = withStripeFee * 1.20;
  return Math.ceil(withVAT) / 100; // Return in pounds
};

// Tier configuration - clean prices shown to users
// Free tier: 0 obfuscations (must buy credits)
// Paid tiers: included obfuscations per day
const TIERS = {
  free: { name: 'Free', price: 0, displayPrice: 'Free', obfuscation: '0/day', obfuscationsPerDay: 0, whitelist: 10, rate: 10, description: 'Buy credits to obfuscate' },
  pro: { name: 'Pro', price: 7, displayPrice: '£7', obfuscation: '20/day', obfuscationsPerDay: 20, whitelist: 100, rate: 30, description: '20 obfuscations included daily' },
  pro_plus: { name: 'Pro+', price: 14, displayPrice: '£14', obfuscation: 'Unlimited', obfuscationsPerDay: -1, whitelist: 500, rate: 60, description: 'Unlimited obfuscations' },
  enterprise: { name: 'Enterprise', price: 25, displayPrice: '£25', obfuscation: 'Unlimited', obfuscationsPerDay: -1, whitelist: 'Unlimited', rate: 120, description: 'Unlimited everything' }
};

// Credit price in USD (like Luraph)
const CREDIT_PRICE_USD = 1; // $1 per credit

interface ApiKey {
  id: string;
  name: string;
  api_key?: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

interface UsageStats {
  tier: string;
  obfuscation: { used: number; limit: number; remaining: number; period: string };
  credits: number;
  products: { id: string; name: string; whitelist_count: number }[];
}

const DeveloperAPI = () => {
  const { user, session } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditQuantity, setCreditQuantity] = useState(10);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (user && session) {
      loadApiKeys();
      loadUsage();
    } else {
      setLoading(false);
    }
  }, [user, session]);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('developer_api_keys')
        .select('id, name, created_at, last_used_at, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    }
  };

  const loadUsage = async () => {
    try {
      const { data: sub } = await (supabase as any)
        .from('developer_subscriptions')
        .select('tier')
        .eq('developer_id', user?.id)
        .maybeSingle();

      const { data: credits } = await (supabase as any)
        .from('obfuscation_credits')
        .select('credits')
        .eq('developer_id', user?.id)
        .maybeSingle();

      // Get today's obfuscation usage
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: usedToday } = await (supabase as any)
        .from('obfuscation_usage')
        .select('*', { count: 'exact', head: true })
        .eq('developer_id', user?.id)
        .gte('created_at', today.toISOString());

      const { data: products } = await (supabase as any)
        .from('developer_products')
        .select('id, product_name')
        .eq('developer_id', user?.id);

      const productStats = [];
      for (const p of products || []) {
        const { count } = await (supabase as any)
          .from('whitelist_entries')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', p.id);
        productStats.push({ id: p.id, name: p.product_name, whitelist_count: count || 0 });
      }

      const tierKey = (sub?.tier || 'free') as keyof typeof TIERS;
      const tierConfig = TIERS[tierKey];
      const dailyLimit = tierConfig?.obfuscationsPerDay || 0;
      const used = usedToday || 0;
      const remaining = dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - used);

      setUsage({
        tier: sub?.tier || 'free',
        obfuscation: { 
          used, 
          limit: dailyLimit, 
          remaining,
          period: 'day' 
        },
        credits: credits?.credits || 0,
        products: productStats
      });
    } catch (err) {
      console.error('Failed to load usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Enter a name for your API key');
      return;
    }

    try {
      const response = await supabase.functions.invoke('api-keys', {
        method: 'POST',
        body: { name: newKeyName.trim() }
      });

      if (response.error) throw response.error;
      
      const result = response.data;
      if (result.success) {
        setShowNewKey(result.data.api_key);
        setNewKeyName('');
        loadApiKeys();
        toast.success('API key created! Copy it now - you won\'t see it again.');
      } else {
        toast.error(result.error?.message || 'Failed to create key');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create API key');
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Delete this API key? This cannot be undone.')) return;

    try {
      const { error } = await (supabase as any)
        .from('developer_api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadApiKeys();
      toast.success('API key deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete key');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleUpgrade = async (tier: 'pro' | 'pro_plus' | 'enterprise') => {
    if (!session) {
      toast.error('Please sign in first');
      return;
    }
    setCheckoutLoading(true);
    try {
      const response = await supabase.functions.invoke('api-dashboard-checkout', {
        body: { type: 'subscription', tier }
      });
      console.log('Checkout response:', response);
      if (response.error) {
        console.error('Function error:', response.error);
        toast.error(response.error.message || 'Failed to start checkout');
        return;
      }
      // Check for success flag in response
      if (!response.data?.success) {
        console.error('API error:', response.data);
        toast.error(response.data?.details || response.data?.error || 'Checkout failed');
        return;
      }
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Upgrade error:', err);
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBuyCredits = async () => {
    if (!session) {
      toast.error('Please sign in first');
      return;
    }
    setCheckoutLoading(true);
    try {
      const response = await supabase.functions.invoke('api-dashboard-checkout', {
        body: { type: 'credits', quantity: creditQuantity }
      });
      console.log('Credits response:', response);
      if (response.error) {
        console.error('Function error:', response.error);
        toast.error(response.error.message || 'Failed to start checkout');
        return;
      }
      // Check for success flag in response
      if (!response.data?.success) {
        console.error('API error:', response.data);
        toast.error(response.data?.details || response.data?.error || 'Checkout failed');
        return;
      }
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Credits error:', err);
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
      setShowCreditsModal(false);
    }
  };

  const endpoints: EndpointProps[] = [
    {
      method: 'POST',
      path: '/api/v1/obfuscate',
      description: 'Obfuscate Lua code',
      params: [
        { name: 'code', type: 'string', required: true, description: 'The Lua code to obfuscate' },
        { name: 'level', type: 'string', required: false, description: 'Protection level: L1, L2, or L3 (default: L2)' },
      ],
      response: `{
  "success": true,
  "data": {
    "obfuscated_code": "-- Protected code...",
    "usage": {
      "used": 5,
      "limit": 20,
      "period": "day",
      "credits_remaining": 10
    }
  },
  "request_id": "req_abc123"
}`,
      example: `curl -X POST https://your-project.supabase.co/functions/v1/api-obfuscate \\
  -H "X-API-Key: vb_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"code": "print(\\"Hello\\")", "level": "L2"}'`
    },
    {
      method: 'POST',
      path: '/api/v1/products',
      description: 'Create a new product',
      params: [
        { name: 'product_name', type: 'string', required: true, description: 'Name of your product' },
        { name: 'roblox_group_id', type: 'number', required: true, description: 'Your Roblox group ID' },
        { name: 'description', type: 'string', required: false, description: 'Product description' },
      ],
      response: `{
  "success": true,
  "data": {
    "id": "uuid",
    "product_name": "My Script",
    "roblox_group_id": 12345678,
    "created_at": "2026-01-05T12:00:00Z"
  },
  "request_id": "req_abc123"
}`,
      example: `curl -X POST https://your-project.supabase.co/functions/v1/api-products \\
  -H "X-API-Key: vb_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"product_name": "My Script", "roblox_group_id": 12345678}'`
    },
    {
      method: 'POST',
      path: '/api/v1/whitelist',
      description: 'Add user to whitelist',
      params: [
        { name: 'product_id', type: 'string', required: true, description: 'Your product UUID' },
        { name: 'roblox_user_id', type: 'number', required: true, description: 'Roblox user ID to whitelist' },
        { name: 'discord_id', type: 'string', required: true, description: 'Discord user ID' },
        { name: 'expiry_date', type: 'string', required: true, description: 'Expiration date (ISO 8601)' },
      ],
      response: `{
  "success": true,
  "data": {
    "id": "uuid",
    "roblox_user_id": 123456789,
    "discord_id": "987654321012345678",
    "expiry_date": "2026-12-31T23:59:59Z"
  },
  "request_id": "req_abc123"
}`,
      example: `curl -X POST https://your-project.supabase.co/functions/v1/api-whitelist \\
  -H "X-API-Key: vb_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"product_id": "uuid", "roblox_user_id": 123456789, "discord_id": "987654321012345678", "expiry_date": "2026-12-31T23:59:59Z"}'`
    },
    {
      method: 'GET',
      path: '/api/v1/whitelist?product_id={id}',
      description: 'List whitelisted users',
      params: [
        { name: 'product_id', type: 'string', required: true, description: 'Your product UUID' },
        { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
        { name: 'limit', type: 'number', required: false, description: 'Results per page (default: 50, max: 100)' },
      ],
      response: `{
  "success": true,
  "data": {
    "entries": [...],
    "total": 42,
    "page": 1,
    "limit": 50,
    "tier_limit": 100
  },
  "request_id": "req_abc123"
}`,
      example: `curl "https://your-project.supabase.co/functions/v1/api-whitelist?product_id=uuid&page=1" \\
  -H "X-API-Key: vb_xxxxx"`
    },
    {
      method: 'POST',
      path: '/api/v1/verify',
      description: 'Verify whitelist status (public)',
      params: [
        { name: 'roblox_user_id', type: 'number', required: true, description: 'Roblox user ID to check' },
        { name: 'roblox_group_id', type: 'number', required: true, description: 'Roblox group ID' },
      ],
      response: `{
  "success": true,
  "data": {
    "whitelisted": true,
    "expiry_date": "2026-12-31T23:59:59Z"
  },
  "request_id": "req_abc123"
}`,
      example: `curl -X POST https://your-project.supabase.co/functions/v1/api-verify \\
  -H "Content-Type: application/json" \\
  -d '{"roblox_user_id": 123456789, "roblox_group_id": 12345678}'`
    },
    {
      method: 'DELETE',
      path: '/api/v1/whitelist/{id}',
      description: 'Remove user from whitelist',
      params: [
        { name: 'id', type: 'string', required: true, description: 'Whitelist entry UUID' },
      ],
      response: `204 No Content`,
      example: `curl -X DELETE https://your-project.supabase.co/functions/v1/api-whitelist/uuid \\
  -H "X-API-Key: vb_xxxxx"`
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SEO 
        title="API Reference"
        description="Vectabase REST API documentation. Integrate obfuscation, whitelist management, and license verification into your applications with our comprehensive API."
        url="/developer/api"
        keywords="REST API, API documentation, obfuscation API, whitelist API, license verification API, developer API"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: '/' },
        { name: 'Developer', url: '/developer' },
        { name: 'API', url: '/developer/api' }
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
                  <span className="text-white font-semibold">API</span>
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
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4">
                <Terminal className="w-4 h-4 text-white" />
                <span className="text-sm text-white">Developer API v1</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">API Dashboard</h1>
              <p className="text-white/60">Manage your API keys, view usage, and integrate Vectabase services.</p>
            </div>

            {user ? (
              <>
                {/* Subscription Tier */}
                <div className="mb-6 p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-400" /> Your Plan
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      usage?.tier === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                      usage?.tier === 'pro_plus' ? 'bg-blue-500/20 text-blue-400' :
                      usage?.tier === 'pro' ? 'bg-green-500/20 text-green-400' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {TIERS[usage?.tier as keyof typeof TIERS]?.name || 'Free'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                      <div className="text-white/50 text-xs mb-1">Daily Obfuscations</div>
                      <div className="text-white font-semibold">
                        {usage?.obfuscation.limit === -1 ? 'Unlimited' : 
                         usage?.obfuscation.limit === 0 ? 'Credits only' : 
                         `${usage?.obfuscation.limit}/day`}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                      <div className="text-white/50 text-xs mb-1">Remaining Today</div>
                      <div className={`font-semibold ${
                        usage?.obfuscation.remaining === -1 ? 'text-green-400' :
                        usage?.obfuscation.remaining === 0 ? 'text-red-400' :
                        (usage?.obfuscation.remaining || 0) <= 3 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {usage?.obfuscation.remaining === -1 ? '∞' : 
                         usage?.obfuscation.limit === 0 ? `${usage?.credits || 0} credits` :
                         usage?.obfuscation.remaining}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                      <div className="text-white/50 text-xs mb-1">Whitelist Limit</div>
                      <div className="text-white font-semibold">{TIERS[usage?.tier as keyof typeof TIERS]?.whitelist || 10}/product</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                      <div className="text-white/50 text-xs mb-1">Rate Limit</div>
                      <div className="text-white font-semibold">{TIERS[usage?.tier as keyof typeof TIERS]?.rate || 10}/min</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                      <div className="text-white/50 text-xs mb-1">Credits</div>
                      <div className="text-white font-semibold flex items-center gap-1">
                        <CreditCard className="w-4 h-4 text-green-400" />
                        {usage?.credits || 0}
                      </div>
                    </div>
                  </div>

                  {/* Show warning if free tier with no credits */}
                  {usage?.tier === 'free' && (usage?.credits || 0) === 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <p className="text-yellow-400 text-sm">
                        ⚠️ Free tier has no included obfuscations. Buy credits or upgrade to a paid plan to use the obfuscation API.
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowUpgradeModal(true)} disabled={checkoutLoading}>
                      <Zap className="w-4 h-4 mr-1" /> Upgrade Plan
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => setShowCreditsModal(true)} disabled={checkoutLoading}>
                      <CreditCard className="w-4 h-4 mr-1" /> Buy Credits
                    </Button>
                  </div>
                </div>

                {/* Upgrade Modal */}
                {showUpgradeModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowUpgradeModal(false)}>
                    <div className="bg-[#0a0f0a] border border-white/10 rounded-2xl p-6 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
                      <h3 className="text-xl font-bold text-white mb-4">Choose Your Plan</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {(['pro', 'pro_plus', 'enterprise'] as const).map((tier) => (
                          <div key={tier} className={`p-4 rounded-xl border ${
                            tier === 'pro' ? 'bg-green-500/10 border-green-500/30' :
                            tier === 'pro_plus' ? 'bg-blue-500/10 border-blue-500/30' :
                            'bg-purple-500/10 border-purple-500/30'
                          }`}>
                            <div className="font-bold text-white mb-1">{TIERS[tier].name}</div>
                            <div className="text-2xl font-bold text-white mb-1">{TIERS[tier].displayPrice}<span className="text-sm text-white/60">/mo</span></div>
                            <div className="text-xs text-white/40 mb-2">{TIERS[tier].description}</div>
                            <div className="text-xs text-white/60 space-y-1 mb-4">
                              <div>• {TIERS[tier].obfuscation} obfuscations</div>
                              <div>• {TIERS[tier].whitelist} whitelist/product</div>
                              <div>• {TIERS[tier].rate} req/min</div>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full bg-white text-black hover:bg-white/90"
                              onClick={() => handleUpgrade(tier)}
                              disabled={checkoutLoading || usage?.tier === tier}
                            >
                              {usage?.tier === tier ? 'Current Plan' : 'Select'}
                            </Button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setShowUpgradeModal(false)} className="mt-4 text-white/40 hover:text-white text-sm">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Credits Modal */}
                {showCreditsModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreditsModal(false)}>
                    <div className="bg-[#0a0f0a] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                      <h3 className="text-xl font-bold text-white mb-2">Buy Obfuscation Credits</h3>
                      <p className="text-white/60 text-sm mb-4">1 credit = 1 obfuscation. Credits never expire.</p>
                      <div className="flex items-center gap-4 mb-4">
                        <label className="text-white/60">Quantity:</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={creditQuantity}
                          onChange={(e) => setCreditQuantity(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-24 px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-center"
                        />
                        <span className="text-white font-bold">= ${creditQuantity * CREDIT_PRICE_USD}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleBuyCredits} disabled={checkoutLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                          {checkoutLoading ? 'Loading...' : 'Buy Credits'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowCreditsModal(false)} className="border-white/20 text-white hover:bg-white/10">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* API Keys */}
                <div className="mb-6 p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Key className="w-5 h-5 text-yellow-400" /> API Keys
                    </h2>
                    <Button size="sm" onClick={loadApiKeys} variant="ghost" className="text-white/60 hover:text-white">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>

                  {showNewKey && (
                    <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-green-400 text-sm mb-2 font-semibold">⚠️ Copy your API key now - you won't see it again!</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 rounded bg-black/50 text-green-400 text-sm font-mono">{showNewKey}</code>
                        <button onClick={() => copyToClipboard(showNewKey, 'new')} className="p-2 rounded hover:bg-white/10">
                          {copied === 'new' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                        </button>
                      </div>
                      <button onClick={() => setShowNewKey(null)} className="mt-2 text-sm text-white/40 hover:text-white">
                        I've copied it, dismiss
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Key name (e.g., Production)"
                      className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-white/30 text-sm"
                    />
                    <Button onClick={createApiKey} size="sm" className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-1" /> Create Key
                    </Button>
                  </div>

                  {apiKeys.length === 0 ? (
                    <p className="text-white/40 text-sm text-center py-4">No API keys yet. Create one to get started.</p>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/10">
                          <div>
                            <div className="text-white font-medium">{key.name}</div>
                            <div className="text-white/40 text-xs">
                              Created {new Date(key.created_at).toLocaleDateString()}
                              {key.last_used_at && ` • Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${key.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {key.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <button onClick={() => deleteApiKey(key.id)} className="p-1.5 rounded hover:bg-red-500/20 text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Products */}
                {usage?.products && usage.products.length > 0 && (
                  <div className="mb-6 p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" /> Your Products
                    </h2>
                    <div className="space-y-2">
                      {usage.products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/10">
                          <span className="text-white">{product.name}</span>
                          <span className="text-white/60 text-sm">{product.whitelist_count} whitelisted</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="mb-8 p-8 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 text-center">
                <Key className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Sign in to access the API</h2>
                <p className="text-white/60 mb-4">Create an account to get your API keys and start integrating.</p>
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <Link to="/auth?mode=register">Get Started Free</Link>
                </Button>
              </div>
            )}

            {/* Authentication */}
            <div className="mb-8 p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-400" /> Authentication
              </h2>
              <p className="text-white/60 mb-4">
                All API requests (except /verify) require authentication using the X-API-Key header.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-black/50 border border-white/10">
                <code className="text-green-400 text-sm flex-1">X-API-Key: vb_xxxxxxxxxxxxxxxxxxxxx</code>
              </div>
              <p className="text-white/40 text-sm mt-3">
                Create API keys from the dashboard above. Keys start with <code className="text-green-400">vb_</code>.
              </p>
            </div>

            {/* Base URL */}
            <div className="mb-8 p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" /> Base URL
              </h2>
              <code className="block p-3 rounded-lg bg-black/50 border border-white/10 text-green-400">
                https://api.vectabase.com/v1
              </code>
            </div>

            {/* Endpoints */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" /> Endpoints
              </h2>
              <div className="space-y-3">
                {endpoints.map((endpoint, i) => (
                  <Endpoint key={i} {...endpoint} />
                ))}
              </div>
            </div>

            {/* Rate Limits */}
            <div className="p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Rate Limits & Tiers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {Object.entries(TIERS).map(([key, tier]) => (
                  <div key={key} className={`p-4 rounded-lg border ${key === 'free' ? 'bg-white/5 border-white/10' : key === 'pro' ? 'bg-green-500/10 border-green-500/30' : key === 'pro_plus' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-purple-500/10 border-purple-500/30'}`}>
                    <div className="font-bold text-white mb-1">{tier.name}</div>
                    <div className="text-white/60 text-sm mb-2">{tier.displayPrice}{tier.price > 0 ? '/mo' : ''}</div>
                    <div className="text-xs text-white/40 space-y-1">
                      <div>• {tier.obfuscation} obfuscations</div>
                      <div>• {tier.whitelist} whitelist/product</div>
                      <div>• {tier.rate} req/min</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-white/40 text-sm">
                Rate limit headers included in all responses: <code className="text-green-400">X-RateLimit-Remaining</code>, <code className="text-green-400">X-RateLimit-Reset</code>
              </p>
              <p className="text-white/40 text-sm mt-2">
                Pay-per-use: <span className="text-green-400">${CREDIT_PRICE_USD} per credit</span> (1 credit = 1 obfuscation)
              </p>
              <p className="text-white/40 text-sm mt-1">
                <span className="text-yellow-400">Note:</span> Free tier has no included obfuscations - buy credits or upgrade to use the API.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperAPI;
