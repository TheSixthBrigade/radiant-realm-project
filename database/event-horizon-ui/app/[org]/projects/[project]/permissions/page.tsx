"use client";

import { useState, useEffect } from "react";
import {
    Shield,
    Plus,
    Mail,
    ShieldCheck,
    Trash2,
    Loader2,
    AlertCircle,
    UserPlus,
    Lock,
    Key,
    ShieldAlert,
    ChevronDown,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PermissionsPage() {
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newLevel, setNewLevel] = useState("Contributor");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/permissions');
            if (res.ok) {
                const data = await res.json();
                setPermissions(data);
            } else {
                setError("Failed to load permissions. Ensure you are an Admin.");
            }
        } catch (err) {
            setError("Network error. Is the database reachable?");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!newEmail) return;

        try {
            const res = await fetch('/api/permissions', {
                method: 'POST',
                body: JSON.stringify({ email: newEmail, access_level: newLevel }),
            });
            if (res.ok) {
                setAdding(false);
                setNewEmail("");
                fetchPermissions();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to add permission.");
            }
        } catch (err) {
            setError("Failed to communicate with API.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Remove this user's access permanently?")) return;
        try {
            const res = await fetch('/api/permissions', {
                method: 'DELETE',
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                fetchPermissions();
            } else {
                const data = await res.json();
                alert(data.error || "Deletion failed.");
            }
        } catch (err) {
            alert("Network error during deletion.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0d0d0d] animate-in fade-in duration-500 overflow-hidden">
            <header className="h-16 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#3ecf8e]/10 rounded-lg border border-[#3ecf8e]/20">
                        <Key className="text-[#3ecf8e]" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Internal Access Governance</h1>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5 whitespace-nowrap">Project Allowlist & Access Levels</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAdding(true)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#3ecf8e] text-black text-xs font-extrabold rounded hover:bg-[#3fb950] transition-all shadow-[0_0_15px_rgba(62,207,142,0.2)]"
                    >
                        <UserPlus size={14} /> Add Authorized Node
                    </button>
                </div>
            </header>

            <div className="flex-1 p-8 space-y-8 overflow-auto custom-scrollbar">
                {/* Simplified Project Info */}
                <div className="flex items-center gap-4 text-gray-500 bg-[#080808]/50 border border-[#1a1a1a] rounded-xl p-4">
                    <ShieldCheck className="text-[#3ecf8e] flex-shrink-0" size={18} />
                    <p className="text-[11px] font-bold uppercase tracking-widest">
                        System Identity Enforcement Active &middot; <span className="text-gray-600 italic">Project Private Mode</span>
                    </p>
                </div>

                {adding && (
                    <div className="panel p-6 rounded-xl bg-[#111] border-[#3ecf8e]/30 animate-in slide-in-from-top-4 duration-300">
                        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-6">
                            <div className="flex-1 space-y-2 min-w-[300px]">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 text-gray-600" size={16} />
                                    <input
                                        autoFocus
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="user@example.com"
                                        className="w-full bg-[#050505] border border-[#222] rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                    />
                                </div>
                            </div>
                            <div className="w-48 space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Access Level</label>
                                <select
                                    value={newLevel}
                                    onChange={(e) => setNewLevel(e.target.value)}
                                    className="w-full bg-[#050505] border border-[#222] rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#3ecf8e] transition-all appearance-none cursor-pointer"
                                >
                                    <option>Owner</option>
                                    <option>Admin</option>
                                    <option>Contributor</option>
                                    <option>Read-Only</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="h-10 px-6 bg-[#3ecf8e] text-black text-xs font-bold rounded-lg hover:bg-[#3fb950] transition-colors">Grant Access</button>
                                <button type="button" onClick={() => setAdding(false)} className="h-10 px-4 text-gray-500 hover:text-white transition-colors">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div className="panel rounded-xl overflow-hidden border-[#1a1a1a] bg-[#080808] shadow-2xl">
                    <div className="px-6 py-5 border-b border-[#1a1a1a] flex justify-between items-center bg-[#111]/30">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Authorized Access List</h3>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-2.5 text-gray-600" />
                                <input className="bg-black/40 border border-[#222] rounded-md pl-9 pr-4 py-1.5 text-[10px] text-gray-400 w-56 focus:outline-none focus:border-[#3ecf8e]" placeholder="Search allowlist..." />
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#111] text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-[#1a1a1a]">
                                <tr>
                                    <th className="px-8 py-4 font-medium">Authorized Email</th>
                                    <th className="px-6 py-4 font-medium">Access Level</th>
                                    <th className="px-6 py-4 font-medium">Granted Date</th>
                                    <th className="px-6 py-4 text-right pr-10">Revoke</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#151515]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <Loader2 size={32} className="animate-spin text-[#3ecf8e] mx-auto opacity-20" />
                                        </td>
                                    </tr>
                                ) : permissions.map(p => (
                                    <tr key={p.id} className="hover:bg-[#0c0c0c] transition-all group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-[#111] border border-[#222] flex items-center justify-center text-[#3ecf8e]">
                                                    <Shield size={16} />
                                                </div>
                                                <span className="text-gray-200 font-mono text-sm">{p.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]",
                                                    p.access_level === 'Owner' ? "text-purple-500 bg-purple-500" : "text-[#3ecf8e] bg-[#3ecf8e]"
                                                )} />
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded border border-[#222] uppercase tracking-wider",
                                                    p.access_level === 'Owner' ? "text-purple-400 bg-purple-950/20 border-purple-500/20" : "text-gray-400"
                                                )}>{p.access_level}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-gray-600 font-mono text-[11px]">
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-right pr-8">
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                className="p-2 text-gray-700 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
