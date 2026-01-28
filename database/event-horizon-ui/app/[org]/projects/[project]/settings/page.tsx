"use client";

import { useState, useEffect } from "react";
import {
    Settings,
    Shield,
    Cpu,
    Key,
    Save,
    Trash2,
    Copy,
    Check,
    Eye,
    EyeOff,
    RefreshCw,
    Zap,
    Globe,
    Activity,
    Database,
    HardDrive,
    UserPlus,
    Lock,
    Unlock,
    Server,
    Plus,
    Loader2,
    X,
    AlertTriangle,
    Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProject";

export default function SettingsPage() {
    const { currentProject } = useProject();
    const [activeTab, setActiveTab] = useState("general");
    const [copied, setCopied] = useState<string | null>(null);
    const [showKey, setShowKey] = useState<string | null>(null);
    const [projectName, setProjectName] = useState("");
    const [projectSlug, setProjectSlug] = useState("");

    useEffect(() => {
        if (currentProject) {
            setProjectName(currentProject.name);
            setProjectSlug(currentProject.slug);
        }
    }, [currentProject]);

    const tabs = [
        { id: "general", label: "General", icon: <Settings size={16} /> },
        { id: "infrastructure", label: "Infrastructure", icon: <Cpu size={16} /> },
        { id: "security", label: "Security & PQC", icon: <Shield size={16} /> },
        { id: "vault", label: "Vault Secrets", icon: <Lock size={16} /> },
        { id: "api", label: "API Keys", icon: <Key size={16} /> },
    ];

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="flex h-full bg-[#0d0d0d] animate-in fade-in duration-500 overflow-hidden">
            <aside className="w-64 border-r border-[#1a1a1a] bg-[#080808] flex flex-col p-4 shadow-xl z-10">
                <header className="px-3 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-[#3ecf8e]/10 rounded-lg border border-[#3ecf8e]/20">
                        <Settings className="text-[#3ecf8e]" size={18} />
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-white uppercase tracking-widest">Project Config</h2>
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter mt-0.5">Control Tower</p>
                    </div>
                </header>
                <nav className="space-y-1.5 flex-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all text-left font-bold uppercase tracking-widest",
                                activeTab === tab.id
                                    ? "bg-[#141414] text-[#3ecf8e] border border-[#222] shadow-sm translate-x-1"
                                    : "text-gray-600 hover:text-gray-300 hover:bg-[#111] hover:translate-x-0.5"
                            )}
                        >
                            <span className={cn(activeTab === tab.id ? "text-[#3ecf8e]" : "text-gray-700")}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl mt-auto">
                    <button className="w-full flex items-center gap-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors">
                        <Trash2 size={14} /> Delete Project
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto p-12 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-12 pb-20">
                    {activeTab === "general" && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section className="space-y-2">
                                <h3 className="text-2xl font-bold text-white tracking-tight">General Information</h3>
                                <p className="text-gray-500 text-sm">Update your project identity and regional placement.</p>
                            </section>

                            <div className="space-y-8">
                                <SettingsInput
                                    label="Project Name"
                                    desc="Display name for this project in the dashboard."
                                    value={projectName}
                                    onChange={setProjectName}
                                    placeholder="Enter project name..."
                                />
                                <SettingsInput
                                    label="Project Slug"
                                    desc="Unique URL identifier for your project APIs."
                                    value={projectSlug}
                                    onChange={setProjectSlug}
                                    placeholder="project-slug"
                                    font="font-mono"
                                />
                                <div className="panel p-6 rounded-2xl bg-[#080808] border-[#1a1a1a] flex items-center justify-between group hover:border-[#333] transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-500">
                                            <Globe size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white uppercase tracking-widest">Lattice Region</div>
                                            <div className="text-[11px] text-gray-500 mt-0.5">Primary node: <span className="text-[#3ecf8e] font-bold">us-east-1 (Quantum Shielded)</span></div>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 text-[10px] font-bold text-gray-400 border border-[#222] rounded-lg hover:text-white transition-colors uppercase tracking-widest">Change Region</button>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-[#1a1a1a] flex justify-end">
                                <button className="h-10 px-6 bg-[#3ecf8e] text-black text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#34b27b] transition-all flex items-center gap-2 shadow-lg shadow-[#3ecf8e]/10">
                                    <Save size={14} /> Save Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "infrastructure" && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section className="space-y-2">
                                <h3 className="text-2xl font-bold text-white tracking-tight">Lattice Infrastructure</h3>
                                <p className="text-gray-500 text-sm">Monitor your hardware utilization and node health metrics.</p>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <HealthCard label="Node Health" status="Operational" icon={<Activity className="text-[#3ecf8e]" />} />
                                <HealthCard label="Storage Usage" status="4.2 GB / 50 GB" icon={<HardDrive className="text-blue-500" />} />
                                <HealthCard label="Realtime Conn." status="142 Active" icon={<Zap className="text-yellow-500" />} />
                                <HealthCard label="CPU Load" status="12% (Idle)" icon={<Cpu className="text-purple-500" />} />
                            </div>

                            <section className="panel p-8 rounded-2xl bg-[#080808] border-[#1a1a1a] space-y-6">
                                <div className="flex items-center gap-4 border-b border-[#1a1a1a] pb-4">
                                    <Server size={20} className="text-gray-500" />
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest">Instance Details</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-y-6 text-[11px]">
                                    <div className="space-y-1">
                                        <div className="text-gray-600 font-bold uppercase tracking-tighter">Instance ID</div>
                                        <div className="text-gray-300 font-mono">EH-CORE-PX9912</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-gray-600 font-bold uppercase tracking-tighter">Runtime</div>
                                        <div className="text-gray-300">Post-Quantum Rust Orchestrator v4.0.2</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-gray-600 font-bold uppercase tracking-tighter">Connection URL</div>
                                        <div className="text-[#3ecf8e] font-mono">postgres://lattice.event-horizon.io:5432</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-gray-600 font-bold uppercase tracking-tighter">IP Whitelist</div>
                                        <div className="text-gray-300 italic">Disabled (Global Access)</div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section className="space-y-2">
                                <h3 className="text-2xl font-bold text-white tracking-tight">Security & PQC</h3>
                                <p className="text-gray-500 text-sm">Configure cryptographic algorithms and access policies.</p>
                            </section>

                            <div className="space-y-6">
                                <ToggleSetting
                                    title="ML-KEM-1024 Enforcement"
                                    desc="Always require the strongest available post-quantum key encapsulation for all handshakes."
                                    enabled={true}
                                />
                                <ToggleSetting
                                    title="RLS Force Mode"
                                    desc="Block all queries that do not explicitly target a project-scoped policy."
                                    enabled={true}
                                />
                                <ToggleSetting
                                    title="Quantum-Sync MFA"
                                    desc="Require a physical lattice-key for all administrative console operations."
                                    enabled={false}
                                />

                                <div className="panel p-8 rounded-2xl bg-[#080808] border-[#1a1a1a] space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Encryption Algorithm</h4>
                                            <p className="text-[10px] text-gray-500 mt-1">Currently used for data-at-rest protection.</p>
                                        </div>
                                        <select className="bg-black border border-[#333] rounded-lg px-4 py-2 text-[10px] font-bold text-white focus:outline-none focus:border-[#3ecf8e] uppercase tracking-widest">
                                            <option>AES-256-GCM (Lattice Wrapped)</option>
                                            <option>ChaCha20-Poly1305 (Shielded)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "api" && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section className="space-y-2">
                                <h3 className="text-2xl font-bold text-white tracking-tight">API Access Keys</h3>
                                <p className="text-gray-500 text-sm">Project keys used to authenticate requests to your PQC-Database instance.</p>
                            </section>

                            <div className="grid gap-6">
                                <ApiKeyBox
                                    title="Project Public (anon) Key"
                                    desc="Used for client-side authentication. Safe to use in browsers."
                                    value={`eyJh${currentProject?.id || '0'}...pqc_v1_anon_772`}
                                    id="anon"
                                    copied={copied === "anon"}
                                    onCopy={() => copyToClipboard(`eyJh${currentProject?.id || '0'}...pqc_v1_anon_772`, "anon")}
                                    showKey={showKey === "anon"}
                                    onToggleShow={() => setShowKey(showKey === "anon" ? null : "anon")}
                                />
                                <ApiKeyBox
                                    title="Project Secret (service_role) Key"
                                    desc="Full bypass of RLS policies. NEVER expose to the client-side."
                                    value={`eyJh${currentProject?.id || '0'}...pqc_v1_secret_911`}
                                    id="secret"
                                    isSecret
                                    copied={copied === "secret"}
                                    onCopy={() => copyToClipboard(`eyJh${currentProject?.id || '0'}...pqc_v1_secret_911`, "secret")}
                                    showKey={showKey === "secret"}
                                    onToggleShow={() => setShowKey(showKey === "secret" ? null : "secret")}
                                />
                                <div className="panel p-6 rounded-2xl bg-[#080808] border-[#1a1a1a] flex items-center justify-between group hover:border-[#333] transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-500">
                                            <Zap size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white uppercase tracking-widest">JWT Secret</div>
                                            <div className="text-[11px] text-gray-500 mt-0.5">Used for signing PQC-Tokens and Lattice-Handshakes.</div>
                                        </div>
                                    </div>
                                    <button className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-white bg-[#111] hover:bg-[#222] border border-[#222] rounded-lg transition-all uppercase tracking-widest">
                                        <RefreshCw size={12} /> Rotate Secret
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "vault" && (
                        <VaultSecretsView currentProject={currentProject} />
                    )}
                </div>
            </main>
        </div>
    );
}

function SettingsInput({ label, desc, value, onChange, placeholder, font }: any) {
    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-bold text-white uppercase tracking-widest">{label}</label>
                <p className="text-[11px] text-gray-500 mt-1">{desc}</p>
            </div>
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "w-full bg-black/40 border border-[#222] rounded-xl px-5 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all",
                    font
                )}
            />
        </div>
    );
}

function HealthCard({ label, status, icon }: any) {
    return (
        <div className="panel p-6 rounded-2xl bg-[#080808] border-[#1a1a1a] flex items-center justify-between group hover:border-[#333] transition-all">
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                    {icon} {label}
                </div>
                <div className="text-sm font-bold text-white tracking-tight">{status}</div>
            </div>
        </div>
    );
}

function ToggleSetting({ title, desc, enabled }: any) {
    const [isOn, setIsOn] = useState(enabled);
    return (
        <div className="panel p-8 rounded-2xl bg-[#080808] border-[#1a1a1a] flex items-center justify-between group hover:border-[#333] transition-all">
            <div className="max-w-md space-y-1">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">{title}</h4>
                <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{desc}</p>
            </div>
            <div
                onClick={() => setIsOn(!isOn)}
                className={cn(
                    "w-12 h-6 rounded-full relative transition-all cursor-pointer border",
                    isOn ? "bg-[#3ecf8e] border-[#3ecf8e]" : "bg-[#111] border-[#222]"
                )}
            >
                <div className={cn(
                    "absolute top-1 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-xl",
                    isOn ? "right-1" : "right-7"
                )} />
            </div>
        </div>
    );
}

function ApiKeyBox({ title, desc, value, id, isSecret, copied, onCopy, showKey, onToggleShow }: any) {
    return (
        <div className="panel p-8 rounded-2xl bg-[#080808] border-[#1a1a1a] space-y-6 group hover:border-[#333] transition-all">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest">{title}</h4>
                    <p className="text-[11px] text-gray-500 mt-1 font-medium">{desc}</p>
                </div>
                {isSecret && <span className="text-[9px] font-bold text-red-500 bg-red-950/20 px-3 py-1 rounded-full border border-red-500/20 uppercase tracking-widest">Secret</span>}
            </div>

            <div className="relative group/key">
                <div className="w-full bg-[#050505] border border-[#222] rounded-xl p-4 pr-32 font-mono text-[11px] text-gray-500 break-all min-h-[52px] flex items-center shadow-inner">
                    {showKey ? value : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                </div>
                <div className="absolute right-3 top-2 flex items-center gap-2">
                    <button onClick={onToggleShow} className="p-2.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors border border-transparent hover:border-[#333]">
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={onCopy} className="p-2.5 hover:bg-[#3ecf8e]/10 rounded-lg text-gray-500 hover:text-[#3ecf8e] transition-colors border border-transparent hover:border-[#3ecf8e]/20">
                        {copied ? <Check size={16} className="text-[#3ecf8e]" /> : <Copy size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

function VaultSecretsView({ currentProject }: any) {
    const [secrets, setSecrets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSecret, setEditingSecret] = useState<any>(null);

    // Form state
    const [newName, setNewName] = useState("");
    const [newValue, setNewValue] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSecrets = async () => {
        if (!currentProject) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/vault?projectId=${currentProject.id}`);
            if (res.ok) {
                setSecrets(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSecrets();
    }, [currentProject?.id]);

    const handleSave = async () => {
        if (!newName || !newValue) {
            setError("Name and Value are required");
            return;
        }
        if (!/^[A-Z_][A-Z0-9_]*$/.test(newName)) {
            setError("Name must be uppercase with underscores (e.g. API_KEY)");
            return;
        }

        setError(null);
        setSaving(true);
        try {
            const res = await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.id,
                    name: newName,
                    value: newValue,
                    description: newDesc
                })
            });

            if (res.ok) {
                setShowAddModal(false);
                setNewName("");
                setNewValue("");
                setNewDesc("");
                fetchSecrets();
            } else {
                const err = await res.json();
                setError(err.error || "Failed to save secret");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this secret? This effectively rotates the key immediately if used in production.")) return;
        try {
            const res = await fetch('/api/vault', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProject.id, id })
            });
            if (res.ok) fetchSecrets();
        } catch (e) {
            console.error(e);
        }
    };

    const handleEdit = (secret: any) => {
        setEditingSecret(secret);
        setNewName(secret.name);
        setNewDesc(secret.description || "");
        setNewValue("");
        setError(null);
        setShowAddModal(true);
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section className="space-y-2 flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">Project Vault</h3>
                    <p className="text-gray-500 text-sm">Securely store encrypted environment variables and secrets.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingSecret(null);
                        setNewName("");
                        setNewValue("");
                        setNewDesc("");
                        setError(null);
                        setShowAddModal(true);
                    }}
                    className="px-4 py-2 bg-[#3ecf8e] text-black text-xs font-bold rounded-lg hover:bg-[#34b27b] transition-colors flex items-center gap-2"
                >
                    <Plus size={14} /> NEW SECRET
                </button>
            </section>

            {loading ? (
                <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#3ecf8e]" size={32} /></div>
            ) : (
                <div className="grid gap-4">
                    {secrets.length === 0 && (
                        <div className="panel p-8 rounded-2xl bg-[#080808] border-[#1a1a1a] text-center text-gray-500 text-sm italic">
                            No secrets found. Add one to get started.
                        </div>
                    )}
                    {secrets.map(secret => (
                        <div key={secret.id} className="panel p-6 rounded-2xl bg-[#080808] border-[#1a1a1a] space-y-4 group hover:border-[#333] transition-all">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 border border-yellow-500/20">
                                        <Lock size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white font-mono">{secret.name}</h4>
                                        <p className="text-[10px] text-gray-500 mt-1">{secret.description || "No description provided."}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest px-2">{new Date(secret.updated_at).toLocaleDateString()}</span>
                                    <button onClick={() => handleEdit(secret)} className="p-2 text-gray-600 hover:text-white transition-colors">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(secret.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="w-full bg-[#050505] border border-[#222] rounded-xl p-3 font-mono text-[10px] text-gray-500 break-all min-h-[42px] flex items-center shadow-inner select-all">
                                    <span className="text-gray-600 mr-2 font-bold select-none">DIGEST SHA256:</span> {secret.value}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">{editingSecret ? "Update Secret Value" : "Add New Secret"}</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            {editingSecret ? (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Key Name (Locked)</label>
                                    <div className="w-full bg-[#111] border border-[#222] border-dashed rounded-xl px-5 py-3 text-sm text-gray-500 font-mono">
                                        {newName}
                                    </div>
                                </div>
                            ) : (
                                <SettingsInput
                                    label="Key Name"
                                    desc="Must be uppercase alphanumeric (e.g. STRIPE_SECRET_KEY)."
                                    value={newName}
                                    onChange={(val: string) => setNewName(val.toUpperCase())}
                                    placeholder="MY_SECRET_KEY"
                                    font="font-mono uppercase"
                                />
                            )}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-white uppercase tracking-widest">
                                    {editingSecret ? "New Value" : "Value"}
                                </label>
                                <textarea
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                    placeholder={editingSecret ? "Enter new value to overwrite..." : "Enter secure value..."}
                                    className="w-full bg-black/40 border border-[#222] rounded-xl px-5 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all min-h-[100px] font-mono"
                                />
                                <p className="text-[10px] text-yellow-500/80 font-bold mt-2 flex items-center gap-1.5">
                                    <AlertTriangle size={10} />
                                    WARNING: This value involves encryption and will NEVER be shown again.
                                </p>
                            </div>
                            <SettingsInput
                                label="Description (Optional)"
                                desc="What is this key used for?"
                                value={newDesc}
                                onChange={setNewDesc}
                                placeholder="Production Stripe API Key..."
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-white border border-[#222] rounded-lg">Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-[#3ecf8e] text-black text-xs font-bold rounded-lg hover:bg-[#34b27b] flex items-center gap-2"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Save Secret
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
