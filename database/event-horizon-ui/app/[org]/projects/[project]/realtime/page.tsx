"use client";

import { Activity, Shield, Database, Zap, Terminal, Search, Filter, Globe, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const MOCK_EVENTS = [
    { id: 1, type: "auth", msg: "PQC Login Handshake Success", target: "user_772", time: "just now", status: "success", node: "us-east-1" },
    { id: 2, type: "query", msg: "PostgreSQL SELECT executed", target: "public.users", time: "2s ago", status: "info", node: "eu-central-1" },
    { id: 3, type: "system", msg: "Lattice-Encryption re-keyed", target: "orchestrator", time: "5s ago", status: "success", node: "us-west-2" },
    { id: 4, type: "threat", msg: "Detected non-PQC packet burst", target: "firewall_v4", time: "12s ago", status: "warning", node: "ap-south-1" },
];

export default function RealtimePage() {
    return (
        <div className="flex flex-col h-full bg-[#0d0d0d] animate-in fade-in duration-500">
            <header className="h-16 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Activity className="text-blue-500 animate-pulse outline-none" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Realtime Event Stream</h1>
                        <p className="text-[10px] text-[#3ecf8e] uppercase font-bold tracking-widest mt-0.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-ping" />
                            Broadcasting via PQC-Socket
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-4 py-1.5 bg-[#111] border border-[#222] text-gray-400 text-[10px] font-bold rounded hover:text-white transition-all uppercase tracking-widest">Pause Stream</button>
                    <button className="px-4 py-1.5 bg-white text-black text-[10px] font-bold rounded hover:bg-gray-200 transition-all uppercase tracking-widest">Clear Logs</button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d0d0d] custom-scrollbar">
                    {MOCK_EVENTS.map(event => (
                        <div key={event.id} className="panel bg-[#080808]/50 border-[#151515] p-5 rounded-xl flex items-center justify-between group hover:border-[#333] transition-all cursor-pointer shadow-lg hover:shadow-2xl">
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "w-1 h-10 rounded-full shadow-[0_0_10px_currentColor]",
                                    event.status === "success" ? "text-[#3ecf8e] bg-[#3ecf8e]" :
                                        event.status === "warning" ? "text-yellow-500 bg-yellow-500" : "text-blue-500 bg-blue-500"
                                )} />
                                <div>
                                    <div className="text-sm text-gray-200 font-bold font-mono tracking-tight group-hover:text-white transition-colors">{event.msg}</div>
                                    <div className="flex items-center gap-4 mt-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Target:</span>
                                            <span className="text-[10px] text-gray-400 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-[#222]">{event.target}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Globe size={10} className="text-gray-700" />
                                            <span className="text-[10px] text-gray-600 font-mono">{event.node}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="text-[10px] text-gray-700 font-mono font-bold uppercase">{event.time}</div>
                                <div className="p-1 px-1.5 bg-black/60 rounded text-[9px] text-gray-800 font-mono italic">sig_v4::sha256</div>
                            </div>
                        </div>
                    ))}
                    <div className="py-10 text-center">
                        <span className="text-[10px] text-gray-800 font-bold uppercase tracking-widest animate-pulse italic">Awaiting net-buffer sequence...</span>
                    </div>
                </main>

                <aside className="w-96 border-l border-[#1a1a1a] bg-[#080808] p-6 space-y-8 flex flex-col">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1">Network Observability</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <SmallStat label="Latency" value="22ms" color="text-green-500" />
                            <SmallStat label="Throughput" value="1.4 GB/s" color="text-blue-500" />
                            <SmallStat label="Packet-Loss" value="0.001%" color="text-green-500" />
                            <SmallStat label="Uptime" value="99.999%" color="text-purple-500" />
                        </div>
                    </div>

                    <div className="panel flex-1 p-5 rounded-xl bg-black border-[#222] shadow-inner relative overflow-hidden flex flex-col group">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                <Terminal size={12} className="text-[#3ecf8e]" /> System Output
                            </div>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-900/50" />
                                <div className="w-2 h-2 rounded-full bg-yellow-900/50" />
                                <div className="w-2 h-2 rounded-full bg-green-900/50" />
                            </div>
                        </div>
                        <div className="flex-1 font-mono text-[10px] space-y-1.5 text-gray-500 overflow-y-auto custom-scrollbar relative z-10">
                            <p className="text-gray-700">[09:22:11] Init: Socket-Layer:0</p>
                            <p className="text-green-900">[09:22:12] Handshake: PQC-AUTH-1 (Lattice-Signed)</p>
                            <p className="text-gray-700">[09:22:15] Load: config::orchestrator</p>
                            <p className="text-blue-900">[09:22:18] Connect: us-east-44 {"->"} active</p>
                            <p className="text-gray-700 animate-pulse tracking-widest text-[9px] mt-4 opacity-50 underline decoration-[#3ecf8e]/10 cursor-pointer">/tailing_global_events...</p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-b from-[#3ecf8e]/0 to-[#3ecf8e]/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </aside>
            </div>
        </div>
    );
}

function SmallStat({ label, value, color }: any) {
    return (
        <div className="panel p-3 bg-[#0d0d0d] border-[#1a1a1a] rounded-lg">
            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter mb-1">{label}</div>
            <div className={cn("text-xs font-bold font-mono", color)}>{value}</div>
        </div>
    )
}
