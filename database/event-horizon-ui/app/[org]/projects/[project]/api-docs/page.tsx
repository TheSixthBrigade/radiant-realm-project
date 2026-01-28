"use client";

import { useState } from "react";
import { Book, Code, Box, Terminal, Play, Server, Shield, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ENDPOINTS = [
    { method: "POST", path: "/auth/pqc/login", desc: "Quantum-safe user authentication", auth: false },
    { method: "GET", path: "/db/v1/query", desc: "Execute verified SQL query", auth: true },
    { method: "PUT", path: "/storage/v1/upload", desc: "Encrypted file ingestion", auth: true },
    { method: "GET", path: "/edge/v1/status", desc: "Monitor edge node distribution", auth: true },
];

export default function ApiDocsPage() {
    const [selectedId, setSelectedId] = useState(0);
    const [apiKeyType, setApiKeyType] = useState("anon");

    return (
        <div className="flex h-full bg-[#0d0d0d]">
            <aside className="w-72 border-r border-[#1a1a1a] bg-[#080808] flex flex-col overflow-y-auto">
                <div className="p-6 border-b border-[#1a1a1a]">
                    <div className="flex items-center gap-2 text-white font-bold text-sm mb-1 uppercase tracking-widest font-mono">
                        <Book size={16} className="text-gray-500" /> API v1.0
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">PQC-REST-INTERFACE</p>
                </div>

                <div className="p-4 space-y-6">
                    <div className="panel p-3.5 bg-blue-950/10 border-blue-500/20 rounded-lg border mb-4">
                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                            Active Key Selection
                            <Settings size={10} className="hover:rotate-90 transition-transform cursor-pointer" />
                        </div>
                        <select
                            value={apiKeyType}
                            onChange={(e) => setApiKeyType(e.target.value)}
                            className="w-full bg-black/40 border-none text-[10px] text-gray-300 font-mono focus:ring-0 outline-none cursor-pointer"
                        >
                            <option value="anon">PROJECT_ANON_KEY</option>
                            <option value="service">SERVICE_ROLE_KEY</option>
                        </select>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 px-2">Introduction</h3>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3 px-3 py-2 rounded text-xs bg-[#141414] text-gray-200 border border-[#222] font-medium transition-all group cursor-pointer"><Shield size={14} className="group-hover:text-[#3ecf8e] transition-colors" /> Authentication</div>
                            <div className="flex items-center gap-3 px-3 py-2 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-[#111] transition-all cursor-pointer"><Box size={14} /> PQC Encryption</div>
                            <div className="flex items-center gap-3 px-3 py-2 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-[#111] transition-all cursor-pointer"><Server size={14} /> Rate Limits</div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 px-2">Endpoints</h3>
                        <div className="space-y-1">
                            {ENDPOINTS.map((ep, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedId(i)}
                                    className={cn(
                                        "w-full text-left px-3 py-2.5 rounded-lg transition-all flex flex-col gap-1.5",
                                        selectedId === i ? "bg-[#141414] border border-[#222] shadow-inner" : "hover:bg-[#111] text-gray-500"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "font-bold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                            ep.method === "POST" ? "text-blue-400 bg-blue-950/20 border border-blue-500/20" :
                                                ep.method === "GET" ? "text-green-400 bg-green-950/20 border border-green-500/20" :
                                                    "text-purple-400 bg-purple-950/20 border border-purple-500/20"
                                        )}>{ep.method}</span>
                                        <span className={cn("font-mono text-[10px]", selectedId === i ? "text-gray-200" : "text-gray-600")}>{ep.path}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-auto bg-[#0d0d0d] p-12">
                <div className="max-w-3xl space-y-12 animate-in fade-in duration-500">
                    <section>
                        <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                            {ENDPOINTS[selectedId].auth ? "Authenticated Endpoint" : "Public Endpoint"}
                        </div>
                        <h1 className="text-4xl font-bold text-white mb-3 tracking-tighter">{ENDPOINTS[selectedId].desc}</h1>
                        <div className="flex items-center gap-3">
                            <span className="bg-[#111] border border-[#222] px-3 py-1.5 rounded-lg font-mono text-[11px] text-gray-400 flex items-center gap-3">
                                <span className="text-green-500 font-bold uppercase">{ENDPOINTS[selectedId].method}</span>
                                <span className="text-gray-600">https://api.evt-hrz.io</span>
                                <span className="text-white">{ENDPOINTS[selectedId].path}</span>
                            </span>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-white font-bold text-sm uppercase tracking-widest text-gray-400">Description</h3>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                            This endpoint utilizes the Lattice-based cryptography module (ML-KEM) to verify the integrity of the request source.
                            All headers must be signed via the EventHorizon client SDK using your project's post-quantum identity.
                        </p>
                    </section>

                    <div className="grid grid-cols-1 gap-8">
                        <div className="panel bg-[#080808] border-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl">
                            <div className="bg-[#111] px-5 py-3 border-b border-[#1a1a1a] flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 tracking-widest"><Code size={12} className="text-[#3ecf8e]" /> Request Example (cURL)</span>
                                <button className="text-[10px] text-[#3ecf8e] font-bold hover:text-white flex items-center gap-2 transition-colors"><Play size={10} /> RUN IN SHELL</button>
                            </div>
                            <pre className="p-8 font-mono text-[11px] text-gray-400 leading-relaxed overflow-x-auto bg-black/40">
                                {`curl -X ${ENDPOINTS[selectedId].method} "https://api.evt-hrz.io${ENDPOINTS[selectedId].path}" \\
  -H "Authorization: Bearer <${apiKeyType === 'anon' ? 'pqc_v1_anon_key' : 'pqc_v1_service_role_key'}>" \\
  -H "X-Client-Signature: ML-KEM-1024" \\
  -d '{
    "node_id": "us-east-44",
    "pqc_verification": "lattice_signed"
  }'`}
                            </pre>
                        </div>

                        <div className="panel bg-[#080808] border-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl">
                            <div className="bg-[#111] px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                                <Terminal size={12} className="text-purple-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Expected Response</span>
                            </div>
                            <pre className="p-8 font-mono text-[11px] text-gray-500 leading-relaxed bg-black/40">
                                {`{
  "status": "success",
  "verification": "quantum_confirmed",
  "request_id": "evt_${Math.random().toString(36).substr(2, 9)}",
  "timestamp": "${new Date().toISOString()}"
}`}
                            </pre>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
