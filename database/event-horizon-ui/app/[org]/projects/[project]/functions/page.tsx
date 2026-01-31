"use client";

import { useState, useEffect, useRef } from "react";
import {
    Cpu,
    Plus,
    Play,
    Trash2,
    Save,
    Loader2,
    RefreshCw,
    FileCode,
    FileJson,
    ChevronRight,
    MoreVertical,
    Settings,
    Activity,
    Terminal,
    Info,
    FileText,
    ExternalLink,
    Search,
    ChevronDown,
    PlusSquare,
    FolderPlus,
    X,
} from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { cn } from "@/lib/utils";

type Tab = "Overview" | "Invocations" | "Logs" | "Code" | "Details";

export default function AdvancedFunctionsPage() {
    const { currentProject } = useProject();
    const [functions, setFunctions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFunc, setSelectedFunc] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>("Code");
    const [selectedFilePath, setSelectedFilePath] = useState<string>("index.ts");
    const [fileContents, setFileContents] = useState<{ [path: string]: string }>({});
    const [logs, setLogs] = useState<any[]>([]);
    const [executing, setExecuting] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [isAddingFile, setIsAddingFile] = useState(false);
    const [newFilePath, setNewFilePath] = useState("");

    useEffect(() => {
        if (currentProject) fetchFunctions();
    }, [currentProject]);

    const fetchFunctions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/functions?projectId=${currentProject.id}`);
            if (res.ok) {
                const data = await res.json();
                setFunctions(data);
                if (data.length > 0 && !selectedFunc) {
                    selectFunc(data[0]);
                }
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const selectFunc = (func: any) => {
        setSelectedFunc(func);
        const contents: { [path: string]: string } = {};
        if (func.files && func.files.length > 0) {
            func.files.forEach((f: any) => contents[f.path] = f.content);
            const entry = func.files.find((f: any) => f.path === 'index.ts' || f.path === 'index.js') || func.files[0];
            setSelectedFilePath(entry.path);
        } else {
            contents['index.ts'] = "return { message: 'Hello World' };";
            setSelectedFilePath('index.ts');
        }
        setFileContents(contents);
        setLogs([]);
    };

    const handleCreate = async () => {
        if (!newName) return;
        try {
            const res = await fetch('/api/functions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.id,
                    name: newName,
                    files: [{ path: 'index.ts', content: "return { message: 'Hello from " + newName + "' };" }]
                })
            });
            if (res.ok) {
                const func = await res.json();
                setFunctions(prev => [...prev, func]);
                selectFunc(func);
                setIsCreating(false);
                setNewName("");
            }
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        if (!selectedFunc) return;
        try {
            const files = Object.entries(fileContents).map(([path, content]) => ({ path, content }));
            const res = await fetch('/api/functions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProject.id, name: selectedFunc.name, files })
            });
            if (res.ok) {
                const updatedFunc = await res.json();
                setFunctions(prev => prev.map(f => f.id === updatedFunc.id ? updatedFunc : f));
                setSelectedFunc(updatedFunc);
            }
        } catch (e) { console.error(e); }
    };

    const handleInvoke = async () => {
        if (!selectedFunc || !currentProject) return;
        setExecuting(true);
        // We don't clear logs here to show history like a terminal
        try {
            // Use internal invoke endpoint that works with session auth
            const res = await fetch(`/api/functions/invoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    projectId: currentProject.id,
                    functionSlug: selectedFunc.slug,
                    payload: { name: "Tester", timestamp: new Date().toISOString() }
                })
            });
            const data = await res.json();
            const logEntry = {
                id: Date.now(),
                time: new Date().toLocaleTimeString(),
                status: res.ok ? "success" : "error",
                result: data.result,
                logs: data.logs || [],
                details: data.details
            };
            setLogs(prev => [logEntry, ...prev]);
            if (activeTab !== "Logs" && activeTab !== "Code") setActiveTab("Logs");
        } catch (e: any) {
            setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), status: "error", details: e.message }, ...prev]);
        } finally {
            setExecuting(false);
        }
    };

    const beautifyCode = () => {
        const currentContent = fileContents[selectedFilePath];
        if (!currentContent) return;

        // Very simple beautifier: trim, fix basic spacing, and attempt primitive indentation
        let lines = currentContent.split('\n');
        let indent = 0;
        let beautified = lines.map(line => {
            let trimmed = line.trim();
            if (trimmed.startsWith('}') || trimmed.startsWith(']')) indent = Math.max(0, indent - 1);
            let result = '    '.repeat(indent) + trimmed;
            if (trimmed.endsWith('{') || trimmed.endsWith('[')) indent++;
            return result;
        }).join('\n');

        setFileContents(prev => ({ ...prev, [selectedFilePath]: beautified }));
    };

    const addFile = () => {
        if (!newFilePath) return;
        setFileContents(prev => ({ ...prev, [newFilePath]: "// Write your logic here" }));
        setSelectedFilePath(newFilePath);
        setNewFilePath("");
        setIsAddingFile(false);
    };

    const highlightCode = (code: string) => {
        if (!code) return "";
        // Escape HTML
        let html = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Comments
        html = html.replace(/\/\/.*/g, '<span class="syntax-comment">$&</span>');

        // Strings
        html = html.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '<span class="syntax-string">$&</span>');

        // Keywords
        const keywords = /\b(await|async|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g;
        html = html.replace(keywords, '<span class="syntax-keyword">$&</span>');

        // Builtins
        const builtins = /\b(console|db|secrets|event|require|JSON|Math|Object|Array|String|Number|Boolean|Promise)\b/g;
        html = html.replace(builtins, '<span class="syntax-builtin">$&</span>');

        // Constants/Numbers
        html = html.replace(/\b\d+\b/g, '<span class="syntax-number">$&</span>');

        return html;
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);

    const handleScroll = () => {
        if (textareaRef.current && preRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    return (
        <div className="flex h-full bg-[#0d0d0d] text-[#ededed] overflow-hidden selection:bg-[#3ecf8e]/30">
            {/* 1. Project Function List (Left) */}
            <div className="w-64 border-r border-[#262626] flex flex-col bg-[#0a0a0a] z-10">
                <div className="h-14 px-4 border-b border-[#262626] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] shadow-[0_0_8px_#3ecf8e]" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Functions</span>
                    </div>
                    <button onClick={() => setIsCreating(true)} className="p-1 hover:bg-[#1a1a1a] rounded transition-colors text-gray-500 hover:text-[#3ecf8e]">
                        <PlusSquare size={16} />
                    </button>
                </div>

                <div className="p-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-[#3ecf8e] transition-colors" size={12} />
                        <input className="w-full bg-[#050505] border border-[#222] rounded-lg pl-8 pr-3 py-1.5 text-[11px] focus:outline-none focus:border-[#3ecf8e] transition-all" placeholder="Search functions..." />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {functions.map(f => (
                        <div
                            key={f.id}
                            onClick={() => selectFunc(f)}
                            className={cn(
                                "group px-3 py-2 cursor-pointer rounded-lg transition-all border border-transparent flex items-center justify-between",
                                selectedFunc?.id === f.id ? "bg-[#3ecf8e]/10 border-[#3ecf8e]/20 text-[#3ecf8e]" : "text-gray-500 hover:bg-[#111] hover:text-gray-300"
                            )}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Cpu size={14} className={cn(selectedFunc?.id === f.id ? "text-[#3ecf8e]" : "text-gray-700")} />
                                <span className="font-mono text-xs font-bold truncate">{f.name}</span>
                            </div>
                        </div>
                    ))}
                    {isCreating && (
                        <div className="p-2 animate-in slide-in-from-top-2 duration-200">
                            <input
                                autoFocus
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="function-name"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                className="w-full bg-black border border-[#3ecf8e]/50 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Main Workspace */}
            {selectedFunc ? (
                <div className="flex-1 flex flex-col min-w-0 bg-[#050505]">
                    {/* Header Strip */}
                    <header className="h-14 border-b border-[#262626] flex items-center justify-between px-6 bg-[#0a0a0a]">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-lg">
                                    <Cpu size={14} className="text-[#3ecf8e]" />
                                </div>
                                <h1 className="font-bold text-sm tracking-tight">{selectedFunc.name}</h1>
                            </div>
                            <div className="h-4 w-px bg-[#222]" />
                            <div className="flex gap-1">
                                {(["Overview", "Invocations", "Logs", "Code", "Details"] as Tab[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setActiveTab(t)}
                                        className={cn(
                                            "px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-all rounded-md",
                                            activeTab === t ? "text-[#3ecf8e] bg-[#3ecf8e]/5" : "text-gray-600 hover:text-gray-300 hover:bg-[#111]"
                                        )}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1.5 bg-[#111] hover:bg-[#1a1a1a] border border-[#222] rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-300 transition-all active:scale-95 shadow-lg">
                                <Save size={14} /> Save
                            </button>
                            <button onClick={handleInvoke} disabled={executing} className="flex items-center gap-2 px-5 py-1.5 bg-[#3ecf8e] hover:bg-[#34b27b] text-black font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(62,207,142,0.1)]">
                                {executing ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />} Run
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 flex overflow-hidden">
                        {/* 3. Tab Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {activeTab === "Code" && (
                                <div className="flex-1 flex overflow-hidden">
                                    {/* File Explorer */}
                                    <div className="w-56 border-r border-[#262626] bg-[#080808] flex flex-col">
                                        <div className="px-4 py-2 flex items-center justify-between border-b border-[#111]">
                                            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Files</span>
                                            <button onClick={() => setIsAddingFile(true)} className="text-gray-600 hover:text-[#3ecf8e]">
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
                                            {Object.keys(fileContents).sort().map(path => (
                                                <div
                                                    key={path}
                                                    onClick={() => setSelectedFilePath(path)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-2 text-xs transition-colors",
                                                        selectedFilePath === path ? "bg-[#3ecf8e]/10 text-[#3ecf8e] font-bold" : "text-gray-600 hover:text-gray-300 hover:bg-[#111]"
                                                    )}>
                                                    {path.endsWith('.json') ? <FileJson size={12} /> : <FileCode size={12} />}
                                                    <span className="truncate">{path}</span>
                                                </div>
                                            ))}
                                            {isAddingFile && (
                                                <div className="p-1 px-3">
                                                    <input
                                                        autoFocus
                                                        value={newFilePath}
                                                        onChange={e => setNewFilePath(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && addFile()}
                                                        placeholder="utils.ts"
                                                        className="w-full bg-black border border-[#3ecf8e]/30 rounded px-2 py-1 text-[11px] focus:outline-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Editor Component */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="h-8 px-8 border-b border-[#111] bg-[#050505] flex items-center">
                                            <span className="text-[10px] font-mono text-gray-700">{selectedFilePath}</span>
                                        </div>
                                        <div className="flex-1 relative bg-[#0d0d0d] group overflow-hidden">
                                            {/* Highlight Layer */}
                                            <pre
                                                ref={preRef}
                                                aria-hidden="true"
                                                className="absolute inset-0 w-full h-full p-10 editor-font text-[13px] leading-relaxed pointer-events-none whitespace-pre-wrap break-all overflow-hidden text-gray-400"
                                                dangerouslySetInnerHTML={{ __html: highlightCode(fileContents[selectedFilePath] || "") + "\n" }}
                                            />
                                            {/* Edit Layer */}
                                            <textarea
                                                ref={textareaRef}
                                                value={fileContents[selectedFilePath] || ""}
                                                onChange={(e) => setFileContents(prev => ({ ...prev, [selectedFilePath]: e.target.value }))}
                                                onScroll={handleScroll}
                                                className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white editor-font text-[13px] leading-relaxed p-10 focus:outline-none resize-none custom-scrollbar whitespace-pre-wrap break-all"
                                                spellCheck={false}
                                            />
                                            <div className="absolute top-4 right-4 flex gap-2">
                                                <button
                                                    onClick={beautifyCode}
                                                    title="Auto-format Code"
                                                    className="p-1.5 bg-black/50 hover:bg-black border border-[#222] rounded-md text-gray-500 hover:text-[#3ecf8e] transition-all opacity-0 group-hover:opacity-100 z-20 backdrop-blur-md"
                                                >
                                                    <Activity size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "Overview" && (
                                <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
                                    <div className="max-w-3xl space-y-12">
                                        <section className="grid grid-cols-3 gap-6">
                                            {[
                                                { label: "Executions", val: "2,401", icon: <Activity size={16} /> },
                                                { label: "Avg Execution Time", val: "142ms", icon: <RefreshCw size={16} /> },
                                                { label: "Error Rate", val: "0.2%", icon: <Info size={16} /> },
                                            ].map((stat, i) => (
                                                <div key={i} className="p-6 bg-[#0a0a0a] border border-[#262626] rounded-2xl flex flex-col gap-2 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 text-[#3ecf8e] group-hover:opacity-20 transition-opacity transform group-hover:scale-110">{stat.icon}</div>
                                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{stat.label}</span>
                                                    <span className="text-2xl font-bold tracking-tight text-white">{stat.val}</span>
                                                </div>
                                            ))}
                                        </section>

                                        <section className="space-y-4">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">HTTP Endpoint</h3>
                                            <div className="p-4 bg-[#0a0a0a] border border-[#262626] rounded-xl flex items-center justify-between font-mono text-xs">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-0.5 bg-[#3ecf8e]/10 text-[#3ecf8e] rounded font-bold uppercase text-[9px]">POST</span>
                                                    <span className="text-gray-400 truncate">https://api.vectabase.io/v1/functions/{selectedFunc.slug}/invoke</span>
                                                </div>
                                                <button className="p-1.5 hover:bg-[#1a1a1a] rounded text-gray-600 hover:text-white transition-colors"><ExternalLink size={14} /></button>
                                            </div>
                                        </section>

                                        <section className="p-8 bg-gradient-to-br from-[#111] to-[#080808] border border-[#262626] rounded-3xl relative overflow-hidden">
                                            <div className="absolute inset-0 bg-[#3ecf8e]/5 opacity-20 pointer-events-none" />
                                            <div className="relative flex items-center justify-between">
                                                <div className="space-y-2">
                                                    <h3 className="text-lg font-bold">Quick Integration</h3>
                                                    <p className="text-sm text-gray-500 max-w-sm">Use our SDK or standard HTTP clients to invoke this serverless logic from any edge-enabled application.</p>
                                                </div>
                                                <button className="px-6 py-2 bg-white text-black text-[11px] font-bold uppercase rounded-xl hover:bg-gray-200 transition-colors">View Docs</button>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            )}

                            {activeTab === "Logs" && (
                                <div className="flex-1 flex flex-col bg-[#050505]">
                                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar font-mono text-xs space-y-4 selection:bg-[#3ecf8e]/50">
                                        {logs.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center opacity-10 text-center space-y-2">
                                                <Terminal size={48} className="mb-4" />
                                                <p className="uppercase tracking-[0.3em] font-bold text-xl">System Operational</p>
                                                <p className="text-sm uppercase tracking-widest leading-relaxed">Waiting for compute trigger event...</p>
                                            </div>
                                        )}
                                        {logs.map((log) => (
                                            <div key={log.id} className={cn(
                                                "p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-bottom-2",
                                                log.status === "error" ? "bg-red-500/5 border-red-500/10" : "bg-white/[0.02] border-white/5"
                                            )}>
                                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                                                    <div className="flex items-center gap-4">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                                                            log.status === "error" ? "bg-red-500/20 text-red-500" : "bg-[#3ecf8e]/20 text-[#3ecf8e]"
                                                        )}>
                                                            {log.status === "error" ? "Execution Failed" : "Invocation Success"}
                                                        </span>
                                                        <span className="text-gray-600 font-bold">{log.time}</span>
                                                    </div>
                                                    {log.status === "success" && (
                                                        <span className="text-[10px] text-gray-500 italic">21 ms execution time</span>
                                                    )}
                                                </div>

                                                {log.logs && log.logs.length > 0 && (
                                                    <div className="space-y-1 mb-6">
                                                        {log.logs.map((l: string, i: number) => (
                                                            <div key={i} className="flex gap-4">
                                                                <span className="text-gray-700 w-4 select-none">{i + 1}</span>
                                                                <span className={cn("flex-1", l.startsWith('ERROR') ? "text-red-400" : "text-gray-400")}>{l}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Return Value</div>
                                                    <pre className={cn(
                                                        "p-4 rounded-xl font-mono text-xs overflow-x-auto",
                                                        log.status === "error" ? "bg-red-900/10 text-red-400" : "bg-black/40 text-gray-300"
                                                    )}>
                                                        {JSON.stringify(log.result || log.details, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === "Invocations" && (
                                <div className="flex-1 flex items-center justify-center opacity-20">
                                    <div className="text-center space-y-4">
                                        <Activity size={48} className="mx-auto" />
                                        <h2 className="text-xl font-bold uppercase tracking-[0.2em]">Compute Analytics</h2>
                                        <p className="text-xs uppercase tracking-widest">Integrating telemetry providers...</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === "Details" && (
                                <div className="flex-1 flex items-center justify-center opacity-20">
                                    <div className="text-center space-y-4">
                                        <Info size={48} className="mx-auto" />
                                        <h2 className="text-xl font-bold uppercase tracking-[0.2em]">Function Configuration</h2>
                                        <p className="text-xs uppercase tracking-widest">System parameters established.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#050505] p-20 text-center space-y-10">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#3ecf8e]/20 rounded-full blur-[120px] animate-pulse" />
                        <div className="relative w-32 h-32 bg-gradient-to-br from-[#111] to-black border border-[#222] rounded-[40px] flex items-center justify-center shadow-2xl group transition-transform hover:scale-105 duration-500">
                            <Cpu size={56} className="text-gray-700 group-hover:text-[#3ecf8e] transition-colors" />
                        </div>
                    </div>
                    <div className="space-y-4 max-w-sm">
                        <h3 className="text-3xl font-bold text-white tracking-tghter">Edge Runtime</h3>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium">Develop ultra-low latency serverless logic that lives at the edge of your project's database ecosystem.</p>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-8 py-3 bg-[#3ecf8e] text-black text-[11px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:bg-[#34b27b] transition-all shadow-[0_0_40px_rgba(62,207,142,0.1)] active:scale-95"
                    >
                        Deploy First Function
                    </button>
                </div>
            )}
        </div>
    );
}
