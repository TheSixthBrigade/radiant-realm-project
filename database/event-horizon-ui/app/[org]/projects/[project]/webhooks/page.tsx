"use client";

import { useState, useEffect } from "react";
import { Zap, Plus, Trash2, Loader2, Globe } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { cn } from "@/lib/utils";

export default function WebhooksPage() {
    const { currentProject } = useProject();
    const [hooks, setHooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form
    const [tableName, setTableName] = useState("");
    const [event, setEvent] = useState("INSERT");
    const [url, setUrl] = useState("");
    const [secret, setSecret] = useState("");

    useEffect(() => {
        if (currentProject) fetchHooks();
    }, [currentProject]);

    const fetchHooks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/webhooks?projectId=${currentProject.id}`);
            if (res.ok) setHooks(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        if (!tableName || !url) return;
        try {
            const res = await fetch('/api/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.id,
                    table_name: tableName,
                    event,
                    target_url: url,
                    secret
                })
            });
            if (res.ok) {
                fetchHooks();
                setIsCreating(false);
                setTableName("");
                setUrl("");
                setSecret("");
            }
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch('/api/webhooks', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProject.id, id })
            });
            if (res.ok) fetchHooks();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="flex h-full bg-[#0d0d0d] text-white overflow-hidden p-8">
            <div className="max-w-4xl w-full mx-auto space-y-8">
                <header className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#111] border border-[#262626] flex items-center justify-center text-yellow-500">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Database Webhooks</h1>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Trigger external services on data changes</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-4 py-2 bg-[#3ecf8e] text-black text-xs font-bold rounded-lg hover:bg-[#34b27b] transition-colors flex items-center gap-2 uppercase tracking-widest"
                    >
                        <Plus size={14} /> New Webhook
                    </button>
                </header>

                {isCreating && (
                    <div className="panel p-6 bg-[#0a0a0a] border border-[#262626] rounded-xl space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Table Name</label>
                                <input className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm" placeholder="e.g. announcements" value={tableName} onChange={e => setTableName(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Event</label>
                                <select className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm" value={event} onChange={e => setEvent(e.target.value)}>
                                    <option value="INSERT">INSERT</option>
                                    <option value="UPDATE">UPDATE</option>
                                    <option value="DELETE">DELETE</option>
                                    <option value="*">ALL EVENTS</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Target URL</label>
                            <input className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm font-mono" placeholder="https://api.example.com/webhook" value={url} onChange={e => setUrl(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Secret (Optional)</label>
                            <input className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm font-mono" placeholder="Sign requests with this secret..." value={secret} onChange={e => setSecret(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-xs font-bold uppercase text-gray-500 hover:text-white">Cancel</button>
                            <button onClick={handleCreate} className="px-3 py-1.5 bg-white text-black text-xs font-bold uppercase rounded hover:bg-gray-200">Create Webhook</button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {hooks.length === 0 && !loading && (
                        <div className="text-center py-20 opacity-30">
                            <Zap size={48} className="mx-auto mb-4" />
                            <p>No webhooks configured</p>
                        </div>
                    )}
                    {hooks.map(h => (
                        <div key={h.id} className="panel p-5 bg-[#0a0a0a] border border-[#262626] rounded-xl flex items-center justify-between group hover:border-[#333] transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#111] flex items-center justify-center text-gray-500 font-mono text-xs border border-[#222]">
                                    {h.event.substring(0, 3)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
                                        <span className="text-[#3ecf8e]">{h.table_name}</span>
                                        <span className="text-gray-600">→</span>
                                        <span className="font-mono text-xs text-gray-400 truncate max-w-[300px]">{h.target_url}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">
                                        Active • Created {new Date(h.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(h.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
