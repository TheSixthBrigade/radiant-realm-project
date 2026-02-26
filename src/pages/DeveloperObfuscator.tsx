import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import GlowingLogo from "@/components/GlowingLogo";
import { SEO, BreadcrumbSchema } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { 
  Code, Shield, Download, Upload, Trash2,
  LayoutDashboard, Lock, AlertCircle, CreditCard, Zap
} from "lucide-react";
import { toast } from "sonner";

// Animated gradient canvas component - Dark Grey with subtle accents
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

const DeveloperObfuscator = () => {
  const { user } = useAuth();
  const [obfuscationLevel, setObfuscationLevel] = useState('L2');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; content: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Credits and tier state
  const [credits, setCredits] = useState<number>(0);
  const [tier, setTier] = useState<string>('free');
  const [dailyUsed, setDailyUsed] = useState<number>(0);
  const [loadingCredits, setLoadingCredits] = useState(true);

  // Tier limits
  const TIER_LIMITS: Record<string, number> = {
    free: 0,
    pro: 20,
    pro_plus: -1, // unlimited
    enterprise: -1 // unlimited
  };

  // Load credits and usage
  useEffect(() => {
    if (user) {
      loadCreditsAndUsage();
    } else {
      setLoadingCredits(false);
    }
  }, [user]);

  const loadCreditsAndUsage = async () => {
    try {
      // Get credits
      const { data: creditsData } = await (supabase as any)
        .from('obfuscation_credits')
        .select('credits')
        .eq('developer_id', user?.id)
        .maybeSingle();

      // Get subscription tier
      const { data: subData } = await (supabase as any)
        .from('developer_subscriptions')
        .select('tier')
        .eq('developer_id', user?.id)
        .maybeSingle();

      // Get today's usage
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await (supabase as any)
        .from('obfuscation_usage')
        .select('*', { count: 'exact', head: true })
        .eq('developer_id', user?.id)
        .gte('created_at', today.toISOString());

      setCredits(creditsData?.credits || 0);
      setTier(subData?.tier || 'free');
      setDailyUsed(count || 0);
    } catch (err) {
      console.error('Failed to load credits:', err);
    } finally {
      setLoadingCredits(false);
    }
  };

  // Calculate remaining obfuscations
  const dailyLimit = TIER_LIMITS[tier] ?? 0;
  const dailyRemaining = dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - dailyUsed);
  const canObfuscate = dailyRemaining === -1 || dailyRemaining > 0 || credits > 0;

  // Check if obfuscator API is online
  useEffect(() => {
    const checkApi = async () => {
      try {
        const apiUrl = import.meta.env.VITE_OBFUSCATOR_API_URL || 'http://localhost:5050';
        const response = await fetch(`${apiUrl}/health`, { method: 'GET' });
        if (response.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch {
        setApiStatus('offline');
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleObfuscate = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a .lua file first');
      return;
    }

    if (apiStatus === 'offline') {
      toast.error('Obfuscator service is offline. Please start the server with: npm run start');
      return;
    }

    if (!user) {
      toast.error('Please sign in to use the obfuscator');
      return;
    }

    // Check if user can obfuscate
    if (!canObfuscate) {
      toast.error('No obfuscations remaining. Buy credits or upgrade your plan.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Determine if we use tier allowance or credits
      const useCredit = dailyRemaining === 0 && credits > 0;

      // Deduct credit or record usage BEFORE obfuscating
      if (useCredit) {
        // Deduct from credits
        const { error: creditError } = await (supabase as any)
          .from('obfuscation_credits')
          .update({ credits: credits - 1, updated_at: new Date().toISOString() })
          .eq('developer_id', user.id);

        if (creditError) {
          throw new Error('Failed to deduct credit');
        }
      }

      // Record usage
      const { error: usageError } = await (supabase as any)
        .from('obfuscation_usage')
        .insert({
          developer_id: user.id,
          credit_used: useCredit,
          created_at: new Date().toISOString()
        });

      if (usageError) {
        console.error('Failed to record usage:', usageError);
        // Don't fail the obfuscation for this
      }

      const apiUrl = import.meta.env.VITE_OBFUSCATOR_API_URL || 'http://localhost:5050';
      const response = await fetch(`${apiUrl}/obfuscate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: uploadedFile.content, level: obfuscationLevel })
      });
      
      const data = await response.json();
      
      if (data.success && data.obfuscated) {
        // Auto-download the obfuscated file
        const blob = new Blob([data.obfuscated], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Name output file based on input file
        const baseName = uploadedFile.name.replace(/\.lua$/i, '');
        a.download = `${baseName}_obfuscated.lua`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success(`Obfuscated with ${obfuscationLevel}! (${data.inputSize} → ${data.outputSize} chars) - File downloaded!`);
        
        // Clear the uploaded file after successful obfuscation
        setUploadedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Refresh credits and usage
        loadCreditsAndUsage();
      } else {
        // Refund credit if obfuscation failed
        if (useCredit) {
          await (supabase as any)
            .from('obfuscation_credits')
            .update({ credits: credits, updated_at: new Date().toISOString() })
            .eq('developer_id', user.id);
        }
        throw new Error(data.error || 'Obfuscation failed');
      }
    } catch (err: any) {
      console.error('Obfuscation error:', err);
      toast.error(`Obfuscation failed: ${err.message || 'Server unavailable'}`);
      // Refresh to get accurate state
      loadCreditsAndUsage();
    }
    
    setIsProcessing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const processFile = (file: File | undefined) => {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.lua')) {
      toast.error('Please upload a .lua file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        content: e.target?.result as string
      });
      toast.success(`File loaded: ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const clearFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  return (
    <div className="min-h-screen relative overflow-hidden">
      <SEO 
        title="Lua Code Obfuscator"
        description="Protect your Lua scripts with advanced code obfuscation. Choose from three protection levels to secure your code from reverse engineering while maintaining functionality."
        url="/developer/obfuscator"
        keywords="Lua obfuscator, code obfuscation, script protection, Roblox script obfuscator, code security, reverse engineering protection"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: '/' },
        { name: 'Developer', url: '/developer' },
        { name: 'Obfuscator', url: '/developer/obfuscator' }
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
                  <span className="text-white font-semibold">Obfuscator</span>
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
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4">
                <Lock className="w-4 h-4 text-white" />
                <span className="text-sm text-white">Lua Obfuscator</span>
                <span className={`ml-2 w-2 h-2 rounded-full ${apiStatus === 'online' ? 'bg-green-400' : apiStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'}`} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Code Obfuscator</h1>
              <p className="text-white/60">Protect your Lua scripts from reverse engineering</p>
              {apiStatus === 'offline' && (
                <p className="text-red-400 text-sm mt-2">⚠️ Obfuscator service offline - run: npm run start</p>
              )}
            </div>

            {/* Credits & Usage Display */}
            {user && (
              <div className="max-w-2xl mx-auto mb-6">
                <div className="p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                  {loadingCredits ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="ml-2 text-white/50 text-sm">Loading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      {/* Credits Balance */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-white/50 text-xs">Credits Balance</p>
                          <p className="text-white font-bold text-lg">{credits}</p>
                        </div>
                      </div>

                      {/* Daily Remaining */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-white/50 text-xs">Daily Remaining</p>
                          <p className="text-white font-bold text-lg">
                            {tier === 'free' ? (
                              <span className="text-white/40">Credits only</span>
                            ) : dailyRemaining === -1 ? (
                              <span className="text-violet-400">Unlimited</span>
                            ) : (
                              <>{dailyRemaining} / {dailyLimit}</>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Buy Credits Link */}
                      <Link 
                        to="/developer/api" 
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        Buy Credits
                      </Link>
                    </div>
                  )}

                  {/* Warning if no obfuscations available */}
                  {!loadingCredits && !canObfuscate && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-yellow-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">No obfuscations remaining. Buy credits or upgrade your plan.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sign in prompt for non-authenticated users */}
            {!user && (
              <div className="max-w-2xl mx-auto mb-6">
                <div className="p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <span className="text-white/70 text-sm">Sign in to track your obfuscations and use credits</span>
                    </div>
                    <Link 
                      to="/auth?mode=login" 
                      className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* File Upload Zone */}
            <div className="max-w-2xl mx-auto mb-6">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".lua" 
                className="hidden" 
              />
              
              <div
                onClick={() => !uploadedFile && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
                  isDragging 
                    ? 'border-violet-400 bg-violet-400/10' 
                    : uploadedFile 
                    ? 'border-violet-500/50 bg-violet-500/5' 
                    : 'border-white/20 bg-black/30 hover:border-white/40 hover:bg-black/40'
                } backdrop-blur-xl`}
              >
                {uploadedFile ? (
                  <div className="p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center">
                          <Code className="w-7 h-7 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg">{uploadedFile.name}</p>
                          <p className="text-white/50 text-sm">{formatFileSize(uploadedFile.size)} • {uploadedFile.content.split('\n').length} lines</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); clearFile(); }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-white/40 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                      <Upload className={`w-8 h-8 ${isDragging ? 'text-violet-400' : 'text-white/60'}`} />
                    </div>
                    <p className="text-white font-semibold text-lg mb-1">
                      {isDragging ? 'Drop your file here' : 'Upload your Lua file'}
                    </p>
                    <p className="text-white/50 text-sm">Drag & drop or click to browse • .lua files only</p>
                  </div>
                )}
              </div>
            </div>

            {/* Protection Level Selector */}
            <div className="max-w-2xl mx-auto mb-6">
              <div className="p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-5 h-5 text-white/60" />
                  <span className="text-sm font-medium text-white">Protection Level</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'L3', label: 'L3', desc: 'Performance', color: 'text-blue-400' },
                    { id: 'L2', label: 'L2', desc: 'Balanced', color: 'text-yellow-400' },
                    { id: 'L1', label: 'L1', desc: 'Max Security', color: 'text-red-400' }
                  ].map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setObfuscationLevel(level.id)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        obfuscationLevel === level.id
                          ? 'bg-white text-black'
                          : 'bg-white/5 hover:bg-white/10 text-white'
                      }`}
                    >
                      <span className={`text-lg font-bold ${obfuscationLevel === level.id ? 'text-black' : level.color}`}>
                        {level.label}
                      </span>
                      <p className={`text-xs mt-0.5 ${obfuscationLevel === level.id ? 'text-black/70' : 'text-white/50'}`}>
                        {level.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>


            {/* Obfuscate Button */}
            <div className="max-w-2xl mx-auto mt-6 text-center">
              <Button
                onClick={handleObfuscate}
                disabled={isProcessing || !uploadedFile}
                size="lg"
                className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-10 py-6 rounded-xl font-semibold text-lg disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Obfuscating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Obfuscate & Download
                  </>
                )}
              </Button>
              {uploadedFile && (
                <p className="text-white/40 text-sm mt-3">
                  Output will be saved as: <span className="text-white/60">{uploadedFile.name.replace(/\.lua$/i, '')}_obfuscated.lua</span>
                </p>
              )}
            </div>

            {/* Info */}
            <div className="max-w-2xl mx-auto mt-8">
              <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">About Obfuscation Levels</h4>
                    <ul className="text-xs text-white/60 space-y-1">
                      <li><strong className="text-blue-400">L3 - Performance:</strong> Variable renaming only. Fast execution, minimal protection.</li>
                      <li><strong className="text-yellow-400">L2 - Balanced:</strong> Variable renaming + string encoding. Good balance of protection and performance.</li>
                      <li><strong className="text-red-400">L1 - Max Security:</strong> Full obfuscation with junk code injection. Maximum protection, slightly slower.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperObfuscator;
