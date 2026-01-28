
"use client";

import {
    Cpu,
    Copy,
    Check,
    Terminal,
    Shield,
    Zap,
    Info,
    BookOpen,
    ArrowRight,
    ExternalLink
} from "lucide-react";
import { useState } from "react";
import { useParams } from "next/navigation";

export default function MCPDocsPage() {
    const params = useParams();
    const [copied, setCopied] = useState(false);

    // In a real app, we'd get the actual domain
    const mcpUrl = `http://localhost:3000/api/mcp`;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-[#0d0d0d] animate-in fade-in duration-500 overflow-hidden">
            <header className="h-16 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#3ecf8e]/10 rounded-lg border border-[#3ecf8e]/20">
                        <Cpu className="text-[#3ecf8e]" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Model Context Protocol (MCP)</h1>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">Native AI Agent Proximity Gateway</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-8 space-y-10 overflow-auto custom-scrollbar max-w-5xl mx-auto">
                {/* Hero Section */}
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[10px] font-black pointer-events-none text-[#3ecf8e] uppercase tracking-widest">
                        <Zap size={10} /> Active Protocol Gateway
                    </div>
                    <h2 className="text-3xl font-black text-white leading-tight">
                        Enable Your AI Agents to <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3ecf8e] to-[#3b82f6]">Speak Database Natively.</span>
                    </h2>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                        Vectabase implements the <strong>Model Context Protocol (MCP)</strong>, allowing tools like Claude Desktop, ChatGPT, or custom agents to discover and query your database tables with full schema-awareness and zero-trust isolation.
                    </p>
                </div>

                {/* URL Card */}
                <div className="p-1 rounded-3xl bg-gradient-to-r from-[#3ecf8e]/30 via-[#222] to-transparent">
                    <div className="bg-[#080808] rounded-[22px] p-8 space-y-6 border border-[#222]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">MCP Server Endpoint</h3>
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[9px] font-bold text-[#3ecf8e]">
                                <Shield size={10} /> PROJECT SCOPED
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1 bg-black border border-[#222] rounded-xl px-4 py-3 font-mono text-sm text-[#3ecf8e] flex items-center justify-between group">
                                <span className="truncate">{mcpUrl}</span>
                                <button
                                    onClick={() => copyToClipboard(mcpUrl)}
                                    className="p-2 hover:bg-[#111] rounded-lg transition-colors text-gray-500 hover:text-white"
                                >
                                    {copied ? <Check size={16} className="text-[#3ecf8e]" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                    <Terminal size={12} /> Authentication
                                </p>
                                <p className="text-xs text-gray-400">Apply your <strong>Service Role</strong> key as a Bearer token in the auth header.</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                    <Shield size={12} /> Isolation
                                </p>
                                <p className="text-xs text-gray-400">Agents are physically locked to the <strong>p{params.project}</strong> schema.</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={12} /> Speed
                                </p>
                                <p className="text-xs text-gray-400">sub-10ms response times for schema introspection.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Configuration Guides */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="panel p-8 rounded-2xl bg-[#080808] border border-[#1a1a1a] space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-white text-black flex items-center justify-center font-bold">C</div>
                            <h4 className="font-bold text-white">Claude Desktop Setup</h4>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Add the following to your <code className="text-[#3ecf8e]">claude_desktop_config.json</code>:
                        </p>
                        <div className="bg-black rounded-lg p-4 font-mono text-[10px] text-gray-400 border border-[#222] relative group">
                            <pre className="whitespace-pre-wrap leading-relaxed">
                                {`"mcpServers": {
  "vectabase": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-postgres", "--url", "${mcpUrl}"]
  }
}`}
                            </pre>
                            <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[#111] rounded">
                                <Copy size={12} />
                            </button>
                        </div>
                    </div>

                    <div className="panel p-8 rounded-2xl bg-[#080808] border border-[#1a1a1a] space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-[#3ecf8e] text-black flex items-center justify-center">
                                <Zap size={16} />
                            </div>
                            <h4 className="font-bold text-white">Exposed Capabilities</h4>
                        </div>
                        <div className="space-y-3">
                            {[
                                { name: "list_tables", desc: "Allows agents to see available database entities." },
                                { name: "get_schema", desc: "Provides column names, types, and constraints." },
                                { name: "query_database", desc: "Native SQL execution with row-level filtering." }
                            ].map(tool => (
                                <div key={tool.name} className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-[#111]">
                                    <ArrowRight size={14} className="mt-0.5 text-[#3ecf8e]" />
                                    <div>
                                        <p className="text-[11px] font-mono font-bold text-white">{tool.name}</p>
                                        <p className="text-[10px] text-gray-600 mt-1">{tool.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Help Section */}
                <div className="flex items-center justify-between p-6 rounded-2xl border border-dashed border-[#222] bg-[#0d0d0d]">
                    <div className="flex items-center gap-4">
                        <Info className="text-gray-600" size={20} />
                        <div>
                            <p className="text-[11px] font-bold text-gray-300">Need help with the protocol?</p>
                            <p className="text-[10px] text-gray-600">The Model Context Protocol is an open standard by Anthropic.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white transition-colors">
                            <BookOpen size={14} /> Documentation
                        </button>
                        <button className="flex items-center gap-2 text-[10px] font-bold text-[#3ecf8e]">
                            <ExternalLink size={14} /> Official MCP Site
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
