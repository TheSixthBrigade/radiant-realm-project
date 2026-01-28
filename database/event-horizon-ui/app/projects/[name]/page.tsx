"use client";

import { Activity, Database, Server, Cpu, HardDrive, ShieldCheck, Zap, ArrowUpRight, Lock, Key, Code } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProject } from "@/hooks/useProject";
import { useEffect, useState, useRef } from "react";

export default function ProjectDashboard() {
    const params = useParams();
    const projectName = params.name as string;
    const { currentProject, projects, setCurrentProject } = useProject();
    const [metrics, setMetrics] = useState<any>(null);
    const [history, setHistory] = useState<number[]>(Array(20).fill(20));
    const timerRef = useRef<any>(null);

    // Sync project state if we're in the URL but not in state (e.g. direct link)
    useEffect(() => {
        if (projectName && (!currentProject || currentProject.slug !== projectName)) {
            const found = projects.find(p => p.slug === projectName);
            if (found) {
                setCurrentProject(found);
            }
        }
    }, [projectName, projects, currentProject, setCurrentProject]);

    const fetchMetrics = async () => {
        try {
            const url = currentProject
                ? `/api/database/metrics?projectId=${currentProject.id}`
                : '/api/database/metrics';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);

                // Track connection history for the chart (Strictly Live)
                setHistory(prev => {
                    const nextValue = Math.min(95, (data.connections?.active_connections || 0) * 15 + 10);
                    const next = [...prev.slice(1), nextValue];
                    return next;
                });
            }
        } catch (e) {
            console.error("Failed to fetch metrics", e);
        }
    };

    useEffect(() => {
        fetchMetrics();
        timerRef.current = setInterval(fetchMetrics, 5000);
        return () => clearInterval(timerRef.current);
    }, []);

    const formatValue = (val: any) => {
        if (val === undefined || val === null) return "---";
        if (typeof val === 'number') {
            if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
            if (val >= 1000) return (val / 1000).toFixed(1) + "K";
        }
        return val.toString();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Project Instance</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{currentProject?.name || projectName}</h1>
                    <p className="text-gray-500 mt-1 font-medium italic">Active node in the Vectabase cluster.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-full flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse shadow-[0_0_8px_#3ecf8e]" />
                        <span className="text-[10px] font-bold text-[#3ecf8e] uppercase tracking-widest">Operational</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Active Queries"
                    value={formatValue(metrics?.connections?.transactions_committed)}
                    sub="Total Committed"
                    icon={<Activity size={18} className="text-blue-500" />}
                />
                <StatCard
                    label="Database Size"
                    value={metrics?.database_size || "0 MB"}
                    sub={`${metrics?.table_count || 0} Tables`}
                    icon={<Database size={18} className="text-purple-500" />}
                />
                <StatCard
                    label="Connections"
                    value={metrics?.connections?.active_connections || 0}
                    sub="Active Session nodes"
                    icon={<Server size={18} className="text-green-500" />}
                />
                <StatCard
                    label="Rows Count"
                    value={formatValue(metrics?.total_rows)}
                    sub="Estimated total"
                    icon={<Cpu size={18} className="text-orange-500" />}
                />
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="panel p-6 rounded-xl bg-[#0d0d0d] border-[#222] shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Activity size={16} className="text-gray-500" /> Infrastructure Activity
                            </h3>
                            <button className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors font-bold">
                                VIEW LOGS <ArrowUpRight size={12} />
                            </button>
                        </div>
                        <div className="h-64 flex items-end justify-between gap-1.5 px-2">
                            {history.map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 bg-gradient-to-t from-blue-950/20 to-blue-500/40 rounded-t-sm transition-all hover:to-[#3ecf8e] hover:shadow-[0_0_15px_rgba(62,207,142,0.4)]"
                                    style={{ height: `${Math.min(h, 100)}%` }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="panel p-6 rounded-xl bg-[#080808] border-[#1a1a1a] shadow-xl">
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-6 px-1">Quick Actions</h3>
                        <div className="space-y-3">
                            <QuickActionLink title="SQL Workbench" icon={<Code size={16} />} href="/sql" />
                            <QuickActionLink title="API Access Factory" icon={<Key size={16} />} href="/settings" />
                            <QuickActionLink title="Secure Storage" icon={<HardDrive size={16} />} href="/storage" />
                            <QuickActionLink title="Audit Logs" icon={<ShieldCheck size={16} />} href="/database" />
                        </div>
                    </div>

                    <div className="panel p-6 rounded-xl bg-gradient-to-br from-purple-950/20 to-blue-950/20 border-purple-500/20 shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ShieldCheck size={80} />
                        </div>
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="p-3 bg-purple-500 rounded-lg text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Quantum Protection</h4>
                                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">Active</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed relative z-10">
                            Your instance is running ML-KEM-1024 (Lattice-based) cryptography. Every request is verified against the Post-Quantum protocol.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

function StatCard({ label, value, sub, icon }: any) {
    return (
        <div className="panel p-6 rounded-xl bg-[#080808]/50 border-[#1a1a1a] transition-all hover:border-[#3ecf8e]/30 group">
            <div className="flex items-center gap-3 mb-4 text-gray-600 group-hover:text-[#3ecf8e] transition-colors">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-3xl font-bold text-white font-mono tracking-tighter">{value || "0"}</div>
            <div className="text-[10px] text-gray-600 mt-1 uppercase font-bold tracking-widest italic">{sub}</div>
        </div>
    )
}

function QuickActionLink({ title, icon, href }: any) {
    return (
        <Link href={href}>
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#111] border border-[#222] hover:bg-[#1a1a1a] hover:border-[#3ecf8e]/40 transition-all group/item shadow-inner">
                <div className="flex items-center gap-3">
                    <span className="text-gray-500 group-hover/item:text-[#3ecf8e] transition-colors">{icon}</span>
                    <span className="text-xs text-gray-400 group-hover/item:text-white transition-colors font-medium">{title}</span>
                </div>
                <ArrowUpRight size={14} className="text-gray-700 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 group-hover/item:-translate-y-1 transition-all" />
            </div>
        </Link>
    )
}
