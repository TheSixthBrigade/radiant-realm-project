"use client";

import { useState, useEffect, Suspense } from "react";
import { Shield, Lock, ArrowRight, Loader2, Globe, Fingerprint, Building2, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Parse URL params immediately for initial state
    const urlSsoEmail = searchParams.get('sso_email');
    const urlDomain = searchParams.get('domain');
    const urlError = searchParams.get('error');
    const urlSetupPassword = searchParams.get('setup_password');
    const urlEmail = searchParams.get('email');
    
    // Set initial state based on URL params
    const initialMode = (urlSsoEmail === 'true' && urlDomain) ? 'sso_email' : 'social';
    
    const [isLoading, setIsLoading] = useState(false);
    const [authMode, setAuthMode] = useState<"lattice" | "social" | "sso" | "sso_email">(initialMode);
    const [error, setError] = useState<string | null>(
        urlError === 'sso_not_configured' && urlDomain 
            ? `SSO is not configured for ${urlDomain}. Contact your administrator.`
            : urlError ? urlError.replace(/_/g, ' ') : null
    );
    const [success, setSuccess] = useState<string | null>(null);
    const [latticeKey, setLatticeKey] = useState("");
    const [ssoDomain, setSsoDomain] = useState(urlDomain || "");
    const [ssoEmail, setSsoEmail] = useState(urlEmail || "");
    const [ssoPassword, setSsoPassword] = useState("");
    const [ssoConfirmPassword, setSsoConfirmPassword] = useState("");
    const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(urlSetupPassword === 'true');

    const handleLatticeLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch('/api/auth/lattice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: latticeKey })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess("Lattice key verified. Redirecting...");
                setTimeout(() => router.push('/'), 1000);
            } else {
                setError(data.error || 'Invalid Lattice key');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSSOLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!ssoDomain || !ssoDomain.includes('.')) {
            setError('Please enter a valid domain (e.g., company.com)');
            setIsLoading(false);
            return;
        }

        window.location.href = `/api/auth/sso?domain=${encodeURIComponent(ssoDomain)}`;
    };

    const handleSSOEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        if (!ssoEmail || !ssoEmail.includes('@')) {
            setError('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        // If we're in password setup mode, validate passwords
        if (requiresPasswordSetup) {
            if (ssoPassword.length < 8) {
                setError('Password must be at least 8 characters');
                setIsLoading(false);
                return;
            }
            if (ssoPassword !== ssoConfirmPassword) {
                setError('Passwords do not match');
                setIsLoading(false);
                return;
            }
        }

        try {
            const res = await fetch('/api/auth/sso-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: ssoEmail,
                    password: ssoPassword || undefined,
                    domain: ssoDomain,
                    setupPassword: requiresPasswordSetup
                })
            });

            const data = await res.json();

            if (res.ok) {
                if (data.requiresPasswordSetup) {
                    setRequiresPasswordSetup(true);
                    setSuccess('Account found! Please set your password.');
                    setSsoPassword('');
                    setSsoConfirmPassword('');
                } else {
                    setSuccess('Login successful. Redirecting...');
                    setTimeout(() => router.push('/'), 1000);
                }
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuth = (provider: 'google' | 'github' | 'roblox' | 'sso') => {
        setIsLoading(true);
        if (provider === 'google') {
            window.location.href = '/api/auth/google';
        } else if (provider === 'github') {
            window.location.href = '/api/auth/github';
        } else if (provider === 'roblox') {
            window.location.href = '/api/auth/roblox';
        } else if (provider === 'sso') {
            setAuthMode('sso');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#121215] flex items-center justify-center p-4 selection:bg-[#3ecf8e]/30">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#3ecf8e] rounded-full blur-[160px] opacity-[0.03]" />
            </div>

            <div className="w-full max-w-[400px] space-y-8 relative z-10 transition-all">
                <div className="text-center space-y-2">
                    <div className="mx-auto mb-6 relative w-20 h-20">
                        <Image 
                            src="/vectabase-logo.png" 
                            alt="Vectabase" 
                            width={80} 
                            height={80}
                            className="rounded-2xl shadow-[0_0_30px_rgba(62,207,142,0.4)] hover:scale-105 transition-transform duration-500"
                            priority
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tighter">Vectabase</h1>
                    <p className="text-gray-500 text-sm font-medium italic underline decoration-[#3ecf8e]/20 underline-offset-4">AI-native database orchestration v1.4</p>
                </div>

                <div className="panel p-8 rounded-2xl bg-[#1a1a1f]/80 backdrop-blur-xl border border-[#2a2a32] shadow-2xl space-y-6">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-lg text-[#3ecf8e] text-xs animate-in fade-in slide-in-from-top-2">
                            <CheckCircle size={14} />
                            {success}
                        </div>
                    )}

                    {authMode === "social" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ProviderButton
                                onClick={() => handleOAuth("google")}
                                icon={<GoogleIcon className="w-5 h-5" />}
                                label="Continue with Google"
                                isLoading={isLoading}
                            />
                            <ProviderButton
                                onClick={() => handleOAuth("github")}
                                icon={<GithubIcon className="w-5 h-5" />}
                                label="Continue with GitHub"
                                isLoading={isLoading}
                            />
                            <ProviderButton
                                onClick={() => handleOAuth("roblox")}
                                icon={<RobloxIcon className="w-5 h-5" />}
                                label="Continue with Roblox"
                                isLoading={isLoading}
                            />
                            <ProviderButton
                                onClick={() => handleOAuth("sso")}
                                icon={<Building2 className="w-5 h-5 text-blue-500" />}
                                label="Enterprise SSO"
                                isLoading={isLoading}
                            />

                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#2a2a32]" /></div>
                                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-gray-700"><span className="bg-[#1a1a1f] px-2">OR</span></div>
                            </div>

                            <button
                                onClick={() => { setAuthMode("lattice"); setError(null); }}
                                className="w-full py-3 h-11 border border-[#2a2a32] rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-[#222228] transition-all flex items-center justify-center gap-2 group"
                            >
                                <Lock size={14} className="group-hover:text-[#3ecf8e] transition-colors" />
                                Lattice Secret Key
                            </button>
                        </div>
                    )}

                    {authMode === "sso" && (
                        <form onSubmit={handleSSOLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Enterprise Domain</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-3 top-3 text-gray-700 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        autoFocus
                                        value={ssoDomain}
                                        onChange={(e) => setSsoDomain(e.target.value)}
                                        className="w-full bg-[#121215] border border-[#2a2a32] rounded-xl pl-11 pr-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500 transition-all"
                                        placeholder="company.com"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-600 px-1">Enter your company domain to sign in with SSO</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button disabled={isLoading} className="w-full py-3 h-12 bg-blue-600 text-white font-extrabold uppercase text-xs rounded-xl transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:bg-blue-500">
                                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>Continue with SSO <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode("social"); setError(null); }}
                                    className="text-[10px] font-bold text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors py-2"
                                >
                                    Back to Login Options
                                </button>
                            </div>
                        </form>
                    )}

                    {authMode === "sso_email" && (
                        <form onSubmit={handleSSOEmailLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Work Email</label>
                                <input
                                    type="email"
                                    autoFocus
                                    value={ssoEmail}
                                    onChange={(e) => setSsoEmail(e.target.value)}
                                    className="w-full bg-[#121215] border border-[#2a2a32] rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                    placeholder="you@company.com"
                                />
                            </div>
                            {requiresPasswordSetup ? (
                                <>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Set Password</label>
                                        <input
                                            type="password"
                                            value={ssoPassword}
                                            onChange={(e) => setSsoPassword(e.target.value)}
                                            className="w-full bg-[#121215] border border-[#2a2a32] rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                            placeholder="Min 8 characters"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={ssoConfirmPassword}
                                            onChange={(e) => setSsoConfirmPassword(e.target.value)}
                                            className="w-full bg-[#121215] border border-[#2a2a32] rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                            placeholder="Confirm password"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Password</label>
                                    <input
                                        type="password"
                                        value={ssoPassword}
                                        onChange={(e) => setSsoPassword(e.target.value)}
                                        className="w-full bg-[#121215] border border-[#2a2a32] rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                        placeholder="Enter password"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col gap-3">
                                <button disabled={isLoading} className="w-full py-3 h-12 bg-[#3ecf8e] text-black font-extrabold uppercase text-xs rounded-xl transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(62,207,142,0.2)] hover:shadow-[0_0_30px_rgba(62,207,142,0.3)] hover:bg-[#34b27b]">
                                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>{requiresPasswordSetup ? 'Set Password & Login' : 'Login'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode("social"); setError(null); }}
                                    className="text-[10px] font-bold text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors py-2"
                                >
                                    Back to Login Options
                                </button>
                            </div>
                        </form>
                    )}

                    {authMode === "lattice" && (
                        <form onSubmit={handleLatticeLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Lattice Recovery Key</label>
                                <div className="relative group">
                                    <Fingerprint className="absolute left-3 top-3 text-gray-700 group-focus-within:text-[#3ecf8e] transition-colors" size={18} />
                                    <input
                                        type="password"
                                        autoFocus
                                        value={latticeKey}
                                        onChange={(e) => setLatticeKey(e.target.value)}
                                        className="w-full bg-[#121215] border border-[#2a2a32] rounded-xl pl-11 pr-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                        placeholder="•••• •••• •••• ••••"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-600 px-1">Emergency admin access key</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button disabled={isLoading || !latticeKey} className="w-full py-3 h-12 bg-[#3ecf8e] text-black font-extrabold uppercase text-xs rounded-xl transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(62,207,142,0.2)] hover:shadow-[0_0_30px_rgba(62,207,142,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>Verify & Decrypt <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode("social"); setError(null); }}
                                    className="text-[10px] font-bold text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors py-2"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="flex items-center justify-center gap-8 text-gray-700 font-bold text-[10px] uppercase tracking-widest pt-4 opacity-50">
                    <span className="flex items-center gap-2"><Shield size={12} /> PQC-SECURE</span>
                    <span className="flex items-center gap-2"><Globe size={12} /> EDGE-IDENTITY</span>
                </div>
            </div>
        </div>
    );
}

function ProviderButton({ onClick, icon, label, isLoading }: { onClick: () => void; icon: React.ReactNode; label: string; isLoading: boolean }) {
    return (
        <button
            disabled={isLoading}
            onClick={onClick}
            className="w-full h-12 px-6 flex items-center justify-between bg-[#1e1e24] border border-[#2a2a32] rounded-xl hover:bg-[#262630] hover:border-[#3a3a44] transition-all group disabled:opacity-50"
        >
            <div className="flex items-center gap-4">
                {icon}
                <span className="text-[13px] font-bold text-gray-200 group-hover:text-white">{label}</span>
            </div>
            <ArrowRight size={16} className="text-gray-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
    );
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );
}

function GithubIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
    );
}

function RobloxIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.926 23.998L0 18.992 5.074 0 24 5.006zM7.886 11.21l3.52 0.932 0.933-3.521-3.521-0.932z" />
        </svg>
    );
}

// Wrap in Suspense to handle useSearchParams properly
export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#121215] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#3ecf8e]" size={32} />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
