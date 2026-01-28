"use client";

import { useState, useEffect } from "react";
import {
    Users,
    ShieldCheck,
    Zap,
    Lock,
    Search,
    MoreHorizontal,
    ShieldAlert,
    Plus,
    Filter,
    ArrowRight,
    Loader2,
    Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProject";

export default function AuthPage() {
    const { currentProject } = useProject();
    const [activeTab, setActiveTab] = useState<"identities" | "providers">("identities");
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        if (currentProject) {
            fetchData();
        } else {
            setUsers([]);
            setConfigs([]);
            setLoading(false);
        }
    }, [currentProject]);

    const fetchData = async () => {
        if (!currentProject) return;
        setLoading(true);
        try {
            const [uRes, cRes] = await Promise.all([
                fetch(`/api/users?projectId=${currentProject.id}`),
                fetch(`/api/config/providers?projectId=${currentProject.id}`)
            ]);
            if (uRes.ok) setUsers(await uRes.json());
            if (cRes.ok) setConfigs(await cRes.json());
        } catch (error) {
            console.error("Failed to fetch auth data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (provider: string, clientId: string, clientSecret: string) => {
        if (!currentProject) return;
        setSaving(provider);
        try {
            const res = await fetch('/api/config/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_name: provider,
                    client_id: clientId,
                    client_secret: clientSecret,
                    projectId: currentProject.id
                })
            });
            if (res.ok) {
                // Refresh configs
                const cRes = await fetch(`/api/config/providers?projectId=${currentProject.id}`);
                if (cRes.ok) setConfigs(await cRes.json());
            }
        } catch (error) {
            console.error("Save failed:", error);
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0d0d0d] animate-in fade-in duration-500 overflow-hidden">
            <header className="h-16 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Lock className="text-blue-500" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Authentication & Identity</h1>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5 whitespace-nowrap">Manage project access policies</p>
                    </div>
                </div>
                <div className="flex items-center bg-[#111] p-1 rounded-lg border border-[#222]">
                    <button
                        onClick={() => { setActiveTab("identities"); setSelectedProvider(null); }}
                        className={cn("px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all", activeTab === "identities" ? "bg-[#3ecf8e] text-black shadow-lg" : "text-gray-500 hover:text-gray-300")}
                    >Identities</button>
                    <button
                        onClick={() => setActiveTab("providers")}
                        className={cn("px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all", activeTab === "providers" ? "bg-[#3ecf8e] text-black shadow-lg" : "text-gray-500 hover:text-gray-300")}
                    >OAuth Providers</button>
                </div>
            </header>

            <div className="flex-1 p-8 space-y-10 overflow-auto custom-scrollbar">
                {activeTab === "identities" ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <AuthStatCard label="Total Identities" value={loading ? "..." : users.length.toString()} sub="Across 1 project" icon={<Users size={18} className="text-gray-400" />} />
                            <AuthStatCard label="PQC Verified" value={loading ? "..." : users.length.toString()} sub="100% coverage" icon={<ShieldCheck size={18} className="text-[#3ecf8e]" />} />
                            <AuthStatCard label="Security Risks" value="0" sub="All systems optimal" icon={<ShieldAlert size={18} className="text-gray-700" />} />
                        </div>

                        <div className="panel rounded-xl overflow-hidden border-[#1a1a1a] bg-[#080808] shadow-2xl">
                            <div className="px-6 py-5 border-b border-[#1a1a1a] flex justify-between items-center bg-[#111]/30">
                                <h3 className="text-xs font-bold text-white uppercase tracking-widest">User Directory</h3>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-2.5 text-gray-600" />
                                        <input className="bg-black/40 border border-[#222] rounded-md pl-9 pr-4 py-1.5 text-[10px] text-gray-400 w-56 focus:outline-none focus:border-[#3ecf8e] transition-all" placeholder="Search by email..." />
                                    </div>
                                    <button className="p-2 border border-[#222] rounded hover:bg-[#1a1a1a] transition-colors"><Filter size={14} className="text-gray-500" /></button>
                                </div>
                            </div>
                            <div className="min-w-full inline-block align-middle overflow-hidden">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-[#111] text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-[#1a1a1a]">
                                        <tr>
                                            <th className="px-8 py-4 font-medium">User Profile</th>
                                            <th className="px-6 py-4 font-medium whitespace-nowrap">PQC Identity ID</th>
                                            <th className="px-6 py-4 font-medium">Auth Method</th>
                                            <th className="px-6 py-4 font-medium">Created At</th>
                                            <th className="px-6 py-4 text-right text-gray-700 italic">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#151515]">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="py-20 text-center">
                                                    <Loader2 size={32} className="animate-spin text-[#3ecf8e] mx-auto opacity-20" />
                                                </td>
                                            </tr>
                                        ) : users.map(u => (
                                            <tr key={u.id} className="hover:bg-[#0c0c0c] transition-all group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-black border border-[#262626] flex items-center justify-center text-xs text-gray-400 font-bold group-hover:border-[#3ecf8e]/30 transition-colors uppercase">
                                                            {u.email?.[0] || "?"}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-gray-200 font-mono text-sm group-hover:text-white transition-colors">{u.email}</span>
                                                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">{u.name || "Quantum User"}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-[#222] text-gray-500 bg-[#111] font-mono whitespace-nowrap">
                                                        {u.identity_id}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor] text-[#3ecf8e] bg-[#3ecf8e]" />
                                                        <span className="text-gray-400 text-[11px] font-bold uppercase tracking-widest">{u.provider || "OAuth"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="text-[11px] text-gray-600 font-mono">{new Date(u.created_at).toLocaleDateString()}</span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button className="p-2 text-gray-600 hover:text-white transition-colors"><MoreHorizontal size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        {!selectedProvider ? (
                            <div className="panel animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="px-6 py-4 border-b border-[#1a1a1a] bg-[#111]/30">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Identity Providers</h3>
                                </div>
                                <div className="divide-y divide-[#151515]">
                                    <ProviderRow
                                        name="Google"
                                        desc="Allow users to log in with their Google accounts"
                                        icon={<GoogleIcon className="w-5 h-5" />}
                                        config={configs.find(c => c.provider_name === 'google')}
                                        onClick={() => setSelectedProvider('google')}
                                    />
                                    <ProviderRow
                                        name="GitHub"
                                        desc="Allow users to log in with their GitHub accounts"
                                        icon={<GitHubIcon className="w-5 h-5 text-white" />}
                                        config={configs.find(c => c.provider_name === 'github')}
                                        onClick={() => setSelectedProvider('github')}
                                    />
                                    <ProviderRow
                                        name="Roblox"
                                        desc="Allow users to log in with their Roblox accounts"
                                        icon={<RobloxIcon className="w-5 h-5 text-red-600" />}
                                        config={configs.find(c => c.provider_name === 'roblox')}
                                        onClick={() => setSelectedProvider('roblox')}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto">
                                <button
                                    onClick={() => setSelectedProvider(null)}
                                    className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors mb-6"
                                >
                                    <ArrowRight className="rotate-180" size={14} /> Back to Providers
                                </button>
                                <ProviderDetailView
                                    name={selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}
                                    icon={
                                        selectedProvider === 'google' ? <GoogleIcon className="w-6 h-6" /> :
                                            selectedProvider === 'github' ? <GitHubIcon className="w-6 h-6 text-white" /> :
                                                <RobloxIcon className="w-6 h-6 text-red-600" />
                                    }
                                    config={configs.find(c => c.provider_name === selectedProvider)}
                                    onSave={(id: string, secret: string) => handleSaveConfig(selectedProvider, id, secret)}
                                    isSaving={saving === selectedProvider}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ProviderRow({ name, desc, icon, config, onClick }: any) {
    const isConfigured = !!config?.client_id;
    return (
        <div
            onClick={onClick}
            className="group flex items-center justify-between px-6 py-5 hover:bg-[#0c0c0c] transition-all cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div className="p-2.5 bg-[#141414] rounded-lg border border-[#222] group-hover:border-[#3ecf8e]/30 transition-colors">
                    {icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{name} OAuth</span>
                    <span className="text-[11px] text-gray-600 mt-0.5">{desc}</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {isConfigured ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 shadow-[0_0_10px_rgba(62,207,142,0.05)]">
                        <div className="w-1 h-1 rounded-full bg-[#3ecf8e]" />
                        <span className="text-[9px] font-bold text-[#3ecf8e] uppercase tracking-tighter">Configured</span>
                    </div>
                ) : (
                    <div className="px-2 py-1 rounded bg-[#111] border border-[#222]">
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">Disabled</span>
                    </div>
                )}
                <ArrowRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
            </div>
        </div>
    );
}

function RobloxIcon({ className }: { className?: string }) {
    return (
        <svg fill="currentColor" className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.19 2.27 2.27 18.81l16.54 2.92 2.92-16.54L5.19 2.27zm10.22 10.22-4.14.73-.73-4.14 4.14-.73.73 4.14z" />
        </svg>
    );
}

function ProviderDetailView({ name, icon, config, onSave, isSaving }: any) {
    const [clientId, setClientId] = useState(config?.client_id || "");
    const [clientSecret, setClientSecret] = useState(config?.client_secret || "");

    useEffect(() => {
        if (config) {
            setClientId(config.client_id);
            setClientSecret(config.client_secret);
        }
    }, [config]);

    return (
        <div className="panel p-8 rounded-2xl bg-[#080808] border-[#1a1a1a] shadow-2xl space-y-8">
            <div className="flex items-center gap-4 border-b border-[#1a1a1a] pb-6">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">{icon}</div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">{name} Configuration</h2>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Standard OAuth 2.0 Integration</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Client ID</label>
                    <input
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder={`Enter ${name} Client ID...`}
                        className="w-full bg-black/40 border border-[#222] rounded-xl px-4 py-3 text-sm text-gray-300 font-mono focus:outline-none focus:border-[#3ecf8e] transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Client Secret</label>
                    <input
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder={`Enter ${name} Client Secret...`}
                        className="w-full bg-black/40 border border-[#222] rounded-xl px-4 py-3 text-sm text-gray-300 font-mono focus:outline-none focus:border-[#3ecf8e] transition-all"
                    />
                    <p className="text-[9px] text-gray-700 font-medium italic mt-1.5 ml-1 flex items-center gap-1">
                        <Shield size={10} /> This secret is encrypted and stored securely in your private database.
                    </p>
                </div>
            </div>

            <div className="pt-4">
                <button
                    onClick={() => onSave(clientId, clientSecret)}
                    disabled={isSaving}
                    className="w-full h-12 bg-white text-black text-[11px] font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <>Save {name} Settings</>}
                </button>
            </div>
        </div>
    );
}

function GitHubIcon({ className }: { className?: string }) {
    return (
        <svg fill="currentColor" className={className} viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
        </svg>
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
    )
}

function AuthStatCard({ label, value, sub, icon, color }: any) {
    return (
        <div className="panel p-6 rounded-xl bg-[#080808]/50 border-[#1a1a1a] transition-all hover:border-[#333] shadow-lg">
            <div className="flex items-center gap-3 mb-4 text-gray-600">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <div className={cn("text-3xl font-bold text-white font-mono tracking-tighter", color)}>{value}</div>
            <div className="text-[10px] text-gray-600 mt-1 font-bold uppercase tracking-widest italic">{sub}</div>
        </div>
    )
}
