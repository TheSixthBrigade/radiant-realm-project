import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isCreatorSignup, setIsCreatorSignup] = useState(searchParams.get('creator') === 'true');
  const [agreedToTOS, setAgreedToTOS] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { status: onboardingStatus, isLoading: onboardingLoading, becomeCreator } = useOnboardingStatus();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [processingOAuth, setProcessingOAuth] = useState(false);
  
  const isCreatorFlow = searchParams.get('creator') === 'true';

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        setProcessingOAuth(true);
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('OAuth session error:', error);
            toast({ title: 'Authentication Error', description: error.message, variant: 'destructive' });
          } else if (data.session) {
            const currentUrl = new URL(window.location.href);
            currentUrl.hash = '';
            window.history.replaceState(null, '', currentUrl.toString());
            
            if (isCreatorFlow) {
              try {
                await supabase.from('profiles').update({ is_creator: true }).eq('user_id', data.session.user.id);
              } catch (err) {
                console.error('Failed to set creator flag:', err);
              }
            }
            toast({ title: 'Success', description: 'Signed in with Google successfully!' });
          }
        } catch (err) {
          console.error('OAuth processing error:', err);
          toast({ title: 'Error', description: 'Failed to complete sign in. Please try again.', variant: 'destructive' });
        } finally {
          setProcessingOAuth(false);
        }
      }
    };
    handleOAuthCallback();
  }, [toast, isCreatorFlow]);

  useEffect(() => {
    if (user && !onboardingLoading && !processingOAuth) {
      const from = location.state?.from || "/";
      if (onboardingStatus?.is_creator && !onboardingStatus?.is_fully_onboarded) {
        navigate("/onboarding", { state: { from } });
        return;
      }
      if (isCreatorFlow && onboardingStatus && !onboardingStatus.is_creator) {
        navigate("/onboarding", { state: { from, becomeCreator: true } });
        return;
      }
      navigate(from);
    }
  }, [user, onboardingStatus, onboardingLoading, navigate, location.state, processingOAuth, isCreatorFlow]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Signed in successfully!" });
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTOS) {
      toast({ title: "Terms Required", description: "You must agree to the Terms of Service to create an account.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password, displayName, isCreatorSignup);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Success",
        description: isCreatorSignup ? "Account created! Complete your creator profile to start selling." : "Check your email to confirm your account!",
      });
      if (isCreatorSignup) navigate("/dashboard");
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const redirectUrl = window.location.origin + '/auth' + (isCreatorFlow ? '?creator=true' : '');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, queryParams: { access_type: 'offline', prompt: 'consent' } }
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  if (processingOAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left panel — violet hero, hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #3b0764 0%, #4c1d95 40%, #7c3aed 100%)' }}>
        {/* Ghost watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[15vw] font-black leading-none tracking-tighter"
            style={{ color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.08)', fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
            AUTH
          </span>
        </div>

        {/* Top logo */}
        <div className="relative z-10">
          <Link to="/" className="text-white font-black text-2xl tracking-tight" style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
            Vectabase
          </Link>
        </div>

        {/* Bottom copy */}
        <div className="relative z-10">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Trusted by creators worldwide</p>
          <h2 className="text-white text-4xl font-black leading-tight mb-4" style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
            Build.<br />Sell.<br />Grow.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Join thousands of game developers selling premium assets on the fastest-growing Roblox marketplace.
          </p>

          {/* Social proof dots */}
          <div className="flex items-center gap-3 mt-8">
            <div className="flex -space-x-2">
              {['#8b5cf6','#a78bfa','#7c3aed','#6d28d9'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-violet-900 flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: c }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p className="text-white/50 text-xs">2,400+ creators already selling</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 bg-[#0a0a0a]">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="text-white font-black text-xl tracking-tight" style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
            Vectabase
          </Link>
        </div>

        <div className="max-w-sm w-full mx-auto lg:mx-0">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
              {activeTab === 'login' ? 'Welcome back.' : 'Create account.'}
            </h1>
            <p className="text-white/40 text-sm">
              {activeTab === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setActiveTab(activeTab === 'login' ? 'register' : 'login')}
                className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
                {activeTab === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all mb-6 disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading ? "Connecting..." : `Continue with Google`}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white/60 text-xs uppercase tracking-wider mb-2 block">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl h-12" />
              </div>
              <div>
                <Label htmlFor="password" className="text-white/60 text-xs uppercase tracking-wider mb-2 block">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl h-12" />
              </div>
              <button type="submit" disabled={isLoading}
                className="magnet-btn magnet-btn-primary w-full h-12 rounded-xl text-sm font-semibold mt-2 disabled:opacity-50">
                <span className="magnet-btn-content">{isLoading ? "Signing in..." : "Sign In"}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-white/60 text-xs uppercase tracking-wider mb-2 block">Display Name</Label>
                <Input id="name" type="text" placeholder="Your name" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl h-12" />
              </div>
              <div>
                <Label htmlFor="email-reg" className="text-white/60 text-xs uppercase tracking-wider mb-2 block">Email</Label>
                <Input id="email-reg" type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl h-12" />
              </div>
              <div>
                <Label htmlFor="password-reg" className="text-white/60 text-xs uppercase tracking-wider mb-2 block">Password</Label>
                <Input id="password-reg" type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl h-12" />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:border-violet-500/40 transition-colors">
                <input type="checkbox" checked={isCreatorSignup} onChange={(e) => setIsCreatorSignup(e.target.checked)}
                  className="w-4 h-4 rounded accent-violet-500" />
                <span className="text-white/60 text-sm">I want to sell digital assets</span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 cursor-pointer">
                <input type="checkbox" checked={agreedToTOS} onChange={(e) => setAgreedToTOS(e.target.checked)}
                  className="w-4 h-4 rounded accent-violet-500 mt-0.5" required />
                <span className="text-white/50 text-xs leading-relaxed">
                  I agree to the{" "}
                  <Link to="/tos" className="text-violet-400 hover:text-violet-300" target="_blank">Terms of Service</Link>
                  {" "}and understand moderation decisions are at Vectabase's sole discretion.
                </span>
              </label>

              <button type="submit" disabled={isLoading || !agreedToTOS}
                className="magnet-btn magnet-btn-primary w-full h-12 rounded-xl text-sm font-semibold mt-2 disabled:opacity-50">
                <span className="magnet-btn-content">
                  {isLoading ? "Creating account..." : isCreatorSignup ? "Become a Creator" : "Create Account"}
                </span>
              </button>
            </form>
          )}

          <p className="text-white/20 text-xs text-center mt-6">
            By continuing you agree to our{" "}
            <Link to="/tos" className="text-violet-400/60 hover:text-violet-400">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="text-violet-400/60 hover:text-violet-400">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
