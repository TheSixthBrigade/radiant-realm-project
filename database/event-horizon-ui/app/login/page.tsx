"use client";

import { useState } from "react";
import { Shield, Lock, ArrowRight, Loader2, Globe, Command, Fingerprint, Github, Gamepad2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [authMode, setAuthMode] = useState<"lattice" | "social">("social");
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = (e: any) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => router.push("/"), 1500);
    };

    const handleOAuth = (provider: 'google' | 'github' | 'roblox' | 'sso') => {
        setIsLoading(true);
        if (provider === 'google') {
            window.location.href = '/api/auth/google';
        } else if (provider === 'github') {
            window.location.href = '/api/auth/github';
        } else if (provider === 'roblox') {
            window.location.href = '/api/auth/roblox';
        } else {
            // SSO placeholder
            setTimeout(() => router.push("/"), 1000);
        }
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4 selection:bg-[#3ecf8e]/30">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#3ecf8e] rounded-full blur-[160px] opacity-[0.03]" />
            </div>

            <div className="w-full max-w-[400px] space-y-8 relative z-10 transition-all">
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-[#3ecf8e] rounded-2xl flex items-center justify-center text-black font-bold text-3xl mx-auto mb-6 shadow-[0_0_30px_rgba(62,207,142,0.4)] rotate-3 hover:rotate-0 transition-transform duration-500">V</div>
                    <h1 className="text-3xl font-bold text-white tracking-tighter">Vectabase</h1>
                    <p className="text-gray-500 text-sm font-medium italic underline decoration-[#3ecf8e]/20 underline-offset-4">AI-native database orchestration v1.4</p>
                </div>

                <div className="panel p-8 rounded-2xl bg-[#111]/80 backdrop-blur-xl border-[#222] shadow-2xl space-y-6">
                    {authMode === "social" ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ProviderButton
                                onClick={() => handleOAuth("google")}
                                icon={<GoogleIcon className="w-5 h-5" />}
                                label="Continue with Google"
                                isLoading={isLoading}
                            />
                            <ProviderButton
                                onClick={() => handleOAuth("github")}
                                icon={<Github className="w-5 h-5 text-white" />}
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
                                icon={<Shield className="w-5 h-5 text-blue-500" />}
                                label="Enterprise SSO"
                                isLoading={isLoading}
                            />

                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#222]" /></div>
                                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-gray-700"><span className="bg-[#111] px-2">OR</span></div>
                            </div>

                            <button
                                onClick={() => setAuthMode("lattice")}
                                className="w-full py-3 h-11 border border-[#222] rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-all flex items-center justify-center gap-2 group"
                            >
                                <Lock size={14} className="group-hover:text-[#3ecf8e] transition-colors" />
                                Lattice Secret Key
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Lattice Recovery Key</label>
                                <div className="relative group">
                                    <Fingerprint className="absolute left-3 top-3 text-gray-700 group-focus-within:text-[#3ecf8e] transition-colors" size={18} />
                                    <input
                                        type="password"
                                        autoFocus
                                        className="w-full bg-black/40 border border-[#222] rounded-xl pl-11 pr-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                        placeholder="•••• •••• •••• ••••"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button disabled={isLoading} className="w-full py-3 h-12 bg-[#3ecf8e] text-black font-extrabold uppercase text-xs rounded-xl transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(62,207,142,0.2)] hover:shadow-[0_0_30px_rgba(62,207,142,0.3)]">
                                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>Verify & Decrypt <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAuthMode("social")}
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

function ProviderButton({ onClick, icon, label, isLoading }: any) {
    return (
        <button
            disabled={isLoading}
            onClick={onClick}
            className="w-full h-12 px-6 flex items-center justify-between bg-[#1a1a1a] border border-[#262626] rounded-xl hover:bg-[#222] hover:border-[#333] transition-all group disabled:opacity-50"
        >
            <div className="flex items-center gap-4">
                {icon}
                <span className="text-[13px] font-bold text-gray-200 group-hover:text-white">{label}</span>
            </div>
            <ArrowRight size={16} className="text-gray-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
    )
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    )
}

function RobloxIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.926 23.998L0 18.992 5.074 0 24 5.006zM7.886 11.21l3.52 0.932 0.933-3.521-3.521-0.932z" />
        </svg>
    )
}
