
"use client";

import { useState, useEffect } from "react";
import {
    Shield,
    Plus,
    Lock,
    Unlock,
    ChevronRight,
    Trash2,
    RefreshCw,
    Terminal,
    Eye,
    Zap,
    Users,
    Key,
    Database,
    Filter,
    Activity,
    Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";

export default function VisualRLSPage() {
    const params = useParams();
    const [tables, setTables] = useState<any[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // New Policy State
    const [newPolicyName, setNewPolicyName] = useState("");
    const [command, setCommand] = useState("SELECT");
    const [usingCondition, setUsingCondition] = useState("");

    useEffect(() => {
        fetchTables();
    }, []);

    useEffect(() => {
        if (selectedTable) {
            fetchPolicies(selectedTable);
        }
    }, [selectedTable]);

    const fetchTables = async () => {
        try {
            const res = await fetch(`/api/database/tables`);
            if (res.ok) {
                const data = await res.json();
                setTables(data);
                if (data.length > 0) setSelectedTable(data[0].table_name);
            }
        } catch (err) {
            console.error("Failed to fetch tables", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPolicies = async (table: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/database/policies?table=${table}`);
            if (res.ok) {
                const data = await res.json();
                setPolicies(data);
            }
        } catch (err) {
            console.error("Failed to fetch policies", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePolicy = async () => {
        if (!selectedTable || !newPolicyName) return;
        try {
            const res = await fetch('/api/database/policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: selectedTable,
                    policyName: newPolicyName,
                    command,
                    using: usingCondition
                })
            });
            if (res.ok) {
                setCreating(false);
                setNewPolicyName("");
                setUsingCondition("");
                fetchPolicies(selectedTable);
            }
        } catch (err) {
            alert("Failed to create policy");
        }
    };

    const handleDeletePolicy = async (policyName: string) => {
        if (!selectedTable || !confirm(`Delete policy "${policyName}"?`)) return;
        try {
            const res = await fetch('/api/database/policies', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: selectedTable,
                    policyName
                })
            });
            if (res.ok) {
                fetchPolicies(selectedTable);
            }
        } catch (err) {
            alert("Failed to delete policy");
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0d0d0d] animate-in fade-in duration-500 overflow-hidden">
            <header className="h-16 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#f5d0fe]/10 rounded-lg border border-[#f5d0fe]/20">
                        <Shield className="text-[#f5d0fe]" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Post-Quantum Security Policies</h1>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">Visual Row-Level Security (RLS) Interface</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchTables()}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#3ecf8e] text-black text-xs font-extrabold rounded hover:bg-[#3fb950] transition-all"
                    >
                        <Plus size={14} /> New Security Policy
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Tables Sidebar */}
                <div className="w-64 border-r border-[#1a1a1a] bg-[#080808] flex flex-col">
                    <div className="p-4 border-b border-[#1a1a1a]">
                        <h3 className="text-[10px] uppercase font-black text-gray-600 tracking-widest">Available Tables</h3>
                    </div>
                    <div className="flex-1 overflow-auto p-2 space-y-1 custom-scrollbar">
                        {tables.map(t => (
                            <button
                                key={t.table_name}
                                onClick={() => setSelectedTable(t.table_name)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                                    selectedTable === t.table_name
                                        ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20"
                                        : "text-gray-400 hover:bg-[#111] border border-transparent"
                                )}
                            >
                                <Database size={14} className={selectedTable === t.table_name ? "text-[#3ecf8e]" : "text-gray-600"} />
                                <span className="font-mono text-[11px] font-bold">{t.table_name}</span>
                                {selectedTable === t.table_name && (
                                    <ChevronRight size={12} className="ml-auto" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Visual Editor Area */}
                <div className="flex-1 bg-[#0d0d0d] relative flex flex-col overflow-hidden">
                    <div className="p-8 space-y-8 overflow-auto flex-1 custom-scrollbar">
                        {/* Table Header Stats */}
                        <div className="flex items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-[#111] to-[#080808] border border-[#1a1a1a]">
                            <div className="p-3 bg-black/40 rounded-xl border border-[#222]">
                                <Lock className="text-[#3ecf8e]" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">{selectedTable}</h2>
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                    <Activity size={12} className="text-[#3ecf8e]" />
                                    {policies.length} Active Security Boundary Policies
                                </p>
                            </div>
                            <div className="ml-auto flex gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Enforcement Mode</p>
                                    <p className="text-sm font-bold text-[#3ecf8e]">STRICT</p>
                                </div>
                            </div>
                        </div>

                        {/* Visual Policy Designer Grid */}
                        <div className="grid grid-cols-1 gap-6">
                            {creating && (
                                <div className="p-8 rounded-2xl bg-[#3ecf8e]/5 border border-[#3ecf8e]/30 space-y-6 animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-[#3ecf8e] text-black rounded-lg">
                                            <Zap size={18} />
                                        </div>
                                        <h3 className="font-bold text-lg text-white">Design New Policy Block</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Internal Name</label>
                                                <input
                                                    value={newPolicyName}
                                                    onChange={(e) => setNewPolicyName(e.target.value)}
                                                    placeholder="e.g. secure_user_access"
                                                    className="w-full bg-black border border-[#222] rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-[#3ecf8e]"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Operation Trigger</label>
                                                <div className="flex items-center gap-2 p-1 bg-black rounded-lg border border-[#222]">
                                                    {['SELECT', 'INSERT', 'UPDATE', 'DELETE'].map(cmd => (
                                                        <button
                                                            key={cmd}
                                                            onClick={() => setCommand(cmd)}
                                                            className={cn(
                                                                "flex-1 py-1.5 text-[10px] font-black rounded-md transition-all",
                                                                command === cmd ? "bg-[#3ecf8e] text-black" : "text-gray-500 hover:bg-[#111]"
                                                            )}
                                                        >
                                                            {cmd}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center justify-between">
                                                Logical Condition (RLS Check)
                                                <span className="text-[9px] text-[#3ecf8e]/60 capitalize italic">Standard SQL Format</span>
                                            </label>
                                            <textarea
                                                value={usingCondition}
                                                onChange={(e) => setUsingCondition(e.target.value)}
                                                placeholder="e.g. auth.uid = user_id"
                                                className="w-full h-[100px] bg-black border border-[#222] rounded-lg px-4 py-3 text-[11px] font-mono text-[#3ecf8e] focus:outline-none focus:border-[#3ecf8e] resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-[#222]">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Info size={14} className="text-[#3ecf8e]" />
                                            Generated SQL will target the isolated schema automatically.
                                        </div>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => setCreating(false)}
                                                className="px-6 py-2 text-gray-400 hover:text-white text-xs font-bold"
                                            >
                                                Discard
                                            </button>
                                            <button
                                                onClick={handleCreatePolicy}
                                                className="px-8 py-2 bg-[#3ecf8e] text-black text-xs font-extrabold rounded-lg hover:bg-[#3fb950] transition-colors"
                                            >
                                                Deploy Policy
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Existing Policy Blocks */}
                            <div className="grid grid-cols-1 gap-4">
                                {loading && !creating && (
                                    <div className="py-20 flex justify-center">
                                        <RefreshCw className="animate-spin text-[#3ecf8e] opacity-30" size={32} />
                                    </div>
                                )}
                                {!loading && policies.length === 0 && !creating && (
                                    <div className="py-32 flex flex-col items-center justify-center text-center space-y-4">
                                        <Unlock className="text-gray-700" size={48} />
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-300">No Hardened Boundaries</h3>
                                            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">This table is currently unprotected. Anyone with an API key can perform the specified operations.</p>
                                        </div>
                                        <button
                                            onClick={() => setCreating(true)}
                                            className="px-6 py-2 border border-[#222] rounded-lg text-[#3ecf8e] text-xs font-bold hover:bg-[#3ecf8e]/10 transition-colors"
                                        >
                                            Create First Policy
                                        </button>
                                    </div>
                                )}
                                {policies.map((p, idx) => (
                                    <div
                                        key={p.policyname}
                                        className="group relative p-6 rounded-2xl bg-[#080808] border border-[#1a1a1a] hover:border-[#3ecf8e]/30 transition-all overflow-hidden"
                                    >
                                        {/* Visual Connection Line */}
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3ecf8e]/10 group-hover:bg-[#3ecf8e] transition-all" />

                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1 p-2 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/20">
                                                    <Filter className="text-[#3ecf8e]" size={16} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-bold text-white tracking-tight">{p.policyname}</h4>
                                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-[#222] text-gray-500 uppercase tracking-tighter">ID: rls_{idx + 1}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <Activity size={10} className="text-[#3ecf8e]" />
                                                            <span className="text-[10px] font-bold text-gray-400 capitalize">{p.cmd} Target</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Users size={10} className="text-[#3ecf8e]" />
                                                            <span className="text-[10px] font-bold text-gray-400">{p.roles.join(', ')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeletePolicy(p.policyname)}
                                                className="p-2 text-gray-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="mt-6 flex items-center gap-4">
                                            <div className="flex-1 p-4 rounded-xl bg-black border border-[#1a1a1a] font-mono text-[11px] text-[#3ecf8e]/90 leading-relaxed relative group/code">
                                                <div className="text-[9px] text-gray-700 absolute top-2 right-3 font-bold uppercase tracking-widest pointer-events-none">Conditional Logic</div>
                                                {p.qual || "TRUE (Universal Access)"}
                                            </div>
                                            <div className="w-[120px] space-y-2">
                                                <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest text-center">Status</p>
                                                <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-[#3ecf8e]/5 border border-[#3ecf8e]/10">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse shadow-[0_0_5px_#3ecf8e]" />
                                                    <span className="text-[10px] font-bold text-[#3ecf8e]">ENFORCED</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Logic Sandbox Footer */}
                    <div className="h-12 border-t border-[#1a1a1a] bg-[#080808] px-8 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Key className="text-gray-600" size={14} />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Keys: service_role, anon</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <Terminal size={12} />
                            <span className="text-[10px] font-mono tracking-tight">RLS_MODE: POSTGRES_NATIVE_TUNNEL</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
