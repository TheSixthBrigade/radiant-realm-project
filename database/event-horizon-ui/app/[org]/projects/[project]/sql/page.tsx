"use client";

import { useState, useEffect } from "react";
import { Play, Save, History, Database, Code, Maximize2, Share2, Info, Loader2, ChevronDown, Plus, Shield, Zap, Table, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProject";

export default function SqlPage() {
    const { currentProject } = useProject();
    const [query, setQuery] = useState("-- Live SQL Editor\n-- Connected to PostgreSQL\n\nSELECT \n  table_name,\n  table_type\nFROM information_schema.tables \nWHERE table_schema = 'public'\nORDER BY table_name\nLIMIT 20;");
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [tables, setTables] = useState<any[]>([]);
    const [loadingTables, setLoadingTables] = useState(true);

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        setLoadingTables(true);
        try {
            const res = await fetch('/api/database/tables?schema=public');
            if (res.ok) {
                setTables(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch tables", e);
        } finally {
            setLoadingTables(false);
        }
    };

    const executeQuery = async () => {
        if (!query.trim()) return;

        setIsExecuting(true);
        setError(null);
        setResults(null);

        try {
            const res = await fetch('/api/database/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: query })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Query execution failed');
                return;
            }

            setResults(data);
        } catch (e: any) {
            setError(e.message || 'Network error');
        } finally {
            setIsExecuting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl/Cmd + Enter to execute
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            executeQuery();
        }
    };

    return (
        <div className="flex h-full bg-[#0d0d0d] flex-col animate-in fade-in duration-500">
            <header className="h-14 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Code size={18} className="text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-xs font-bold text-white tracking-widest uppercase">Live SQL Workbench</h1>
                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">
                            Connected: PostgreSQL {currentProject?.name ? `(${currentProject.name})` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-600 font-mono">Ctrl+Enter to run</span>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-gray-500 hover:text-white transition-colors text-xs font-bold">
                        <History size={14} /> HISTORY
                    </button>
                    <button
                        onClick={executeQuery}
                        disabled={isExecuting}
                        className="flex items-center gap-2 px-6 py-2 bg-[#3ecf8e] text-black text-[11px] font-extrabold uppercase rounded-lg shadow-[0_0_20px_rgba(62,207,142,0.3)] hover:bg-[#34d399] transition-all group active:scale-95 disabled:opacity-50"
                    >
                        {isExecuting ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Play size={12} fill="currentColor" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        )}
                        {isExecuting ? 'Executing...' : 'Execute Query'}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col border-r border-[#1a1a1a]">
                    <div className="flex-1 bg-black/60 p-8 font-mono text-[13px] text-gray-400 relative group overflow-hidden">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 bg-[#1a1a1a] border border-[#333] rounded hover:bg-[#222] transition-colors"><Maximize2 size={14} /></button>
                            <button className="p-2 bg-[#1a1a1a] border border-[#333] rounded hover:bg-[#222] transition-colors"><Save size={14} /></button>
                        </div>
                        <textarea
                            className="w-full h-full bg-transparent border-none outline-none resize-none focus:text-white transition-colors custom-scrollbar font-mono leading-relaxed"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            spellCheck={false}
                        />
                    </div>

                    <div className="h-72 border-t border-[#1a1a1a] bg-[#080808] flex flex-col shadow-inner overflow-hidden">
                        <div className="h-10 border-b border-[#1a1a1a] bg-[#111] px-6 flex items-center justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-400 border-b-2 border-[#3ecf8e] pb-2.5 pt-2.5 h-10 flex items-center">Results</span>
                                <span className="hover:text-gray-400 transition-colors cursor-pointer h-10 flex items-center">Messages</span>
                            </div>
                            <div className="flex items-center gap-4">
                                {results && (
                                    <>
                                        <span className="flex items-center gap-1.5 text-[#3ecf8e]">
                                            <CheckCircle2 size={12} /> {results.rowCount} rows in {results.executionTime}ms
                                        </span>
                                        <button className="text-gray-500 hover:text-white transition-colors uppercase flex items-center gap-1.5">
                                            DOWNLOAD CSV <Share2 size={12} />
                                        </button>
                                    </>
                                )}
                                {error && (
                                    <span className="flex items-center gap-1.5 text-red-500">
                                        <AlertCircle size={12} /> Error
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {isExecuting && (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 size={32} className="animate-spin text-[#3ecf8e] opacity-50" />
                                </div>
                            )}

                            {error && !isExecuting && (
                                <div className="p-6 text-red-400 font-mono text-sm">
                                    <div className="flex items-center gap-2 mb-2 text-red-500 font-bold">
                                        <AlertCircle size={16} /> Query Error
                                    </div>
                                    <pre className="whitespace-pre-wrap text-xs opacity-80">{error}</pre>
                                </div>
                            )}

                            {results && results.rows && results.rows.length > 0 && !isExecuting && (
                                <table className="w-full text-left text-[11px] font-mono border-collapse">
                                    <thead className="bg-[#111] sticky top-0">
                                        <tr>
                                            {results.fields?.map((field: any, i: number) => (
                                                <th key={i} className="px-4 py-2 border-b border-[#1a1a1a] text-gray-500 font-bold uppercase tracking-wider">
                                                    {field.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#151515]">
                                        {results.rows.map((row: any, i: number) => (
                                            <tr key={i} className="hover:bg-[#0c0c0c] transition-colors">
                                                {Object.values(row).map((cell: any, j: number) => (
                                                    <td key={j} className="px-4 py-2 text-gray-400 max-w-xs truncate">
                                                        {cell === null ? <span className="text-gray-700 italic">NULL</span> : String(cell)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {results && results.rows && results.rows.length === 0 && !isExecuting && (
                                <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                                    Query executed successfully. No rows returned.
                                </div>
                            )}

                            {!results && !error && !isExecuting && (
                                <div className="flex-1 flex items-center justify-center text-center p-10 h-full">
                                    <div className="space-y-4 max-w-sm">
                                        <div className="p-4 bg-white/5 rounded-full inline-block border border-white/10 shadow-lg">
                                            <Database size={32} className="text-gray-700 opacity-40 animate-pulse" />
                                        </div>
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Ready for Instruction</h3>
                                        <p className="text-[10px] text-gray-700 font-medium leading-relaxed italic uppercase">
                                            Run a query to see live results from your PostgreSQL database.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <aside className="w-72 bg-[#0d0d0d] p-6 space-y-8 flex flex-col overflow-y-auto custom-scrollbar shadow-2xl z-10">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Schema Explorer</h3>
                            <button onClick={fetchTables} className="text-gray-700 hover:text-white transition-colors">
                                <Plus size={14} />
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            <SchemaItem name="public" icon={<Database size={12} />} active />
                            <div className="pl-4 space-y-1.5 border-l border-[#222]">
                                {loadingTables ? (
                                    <div className="py-4 flex justify-center">
                                        <Loader2 size={16} className="animate-spin text-gray-700" />
                                    </div>
                                ) : (
                                    tables.map((t: any) => (
                                        <TableItem
                                            key={t.table_name}
                                            name={t.table_name}
                                            onClick={() => setQuery(`SELECT * FROM "${t.table_name}" LIMIT 100;`)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="panel p-5 rounded-xl bg-blue-950/10 border-blue-500/20 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                            <Zap size={14} fill="currentColor" /> Pro Tip
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                            Press <code className="bg-black/50 px-1 rounded text-blue-400">Ctrl+Enter</code> to execute your query instantly.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function SchemaItem({ name, icon, active }: any) {
    return (
        <div className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer group",
            active ? "bg-[#1a1a1a] text-white border border-[#333]" : "text-gray-500 hover:text-gray-300 hover:bg-[#111]"
        )}>
            <div className="flex items-center gap-3 font-mono text-xs">
                {icon}
                {name}
            </div>
            <ChevronDown size={14} className={cn("text-gray-700 transition-transform", active ? "" : "-rotate-90")} />
        </div>
    )
}

function TableItem({ name, active, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer",
                active ? "text-[#3ecf8e] bg-[#3ecf8e]/10 border border-[#3ecf8e]/20" : "text-gray-600 hover:text-gray-300 hover:bg-[#111]"
            )}
        >
            <Table size={12} />
            {name}
        </div>
    )
}
