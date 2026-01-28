"use client";

import { useState } from "react";
import {
    Database,
    Table,
    Zap,
    Code,
    Hash,
    Layout,
    Share2,
    Box,
    Settings,
    FileText,
    Shield,
    Clock,
    Layers,
    Users,
    Key,
    Activity,
    ChevronDown,
    Search,
    Maximize2,
    Plus,
    Filter,
    ArrowRight,
    Lock,
    Unlock,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    X,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DatabasePage() {
    const [selectedSchema, setSelectedSchema] = useState("public");
    const [activeSection, setActiveSection] = useState("Database Overview");

    return (
        <div className="flex h-full bg-[#0d0d0d] overflow-hidden">
            {/* 1. Sub-Sidebar Navigation */}
            <aside className="w-56 border-r border-[#1a1a1a] bg-[#080808] flex flex-col pt-4 overflow-y-auto">
                <div className="px-4 mb-6">
                    <h1 className="text-sm font-bold text-white tracking-widest font-mono">Database</h1>
                </div>

                <div className="space-y-8 pb-10">
                    <NavSection title="Database Management">
                        <SubNavItem label="Database Overview" icon={<Layout size={14} />} active={activeSection === "Database Overview"} onClick={() => setActiveSection("Database Overview")} />
                        <SubNavItem label="Tables" icon={<Table size={14} />} active={activeSection === "Tables"} onClick={() => setActiveSection("Tables")} />
                        <SubNavItem label="Functions" icon={<Zap size={14} />} active={activeSection === "Functions"} onClick={() => setActiveSection("Functions")} />
                        <SubNavItem label="Triggers" icon={<Zap size={14} />} active={activeSection === "Triggers"} onClick={() => setActiveSection("Triggers")} />
                        <SubNavItem label="Enumerated Types" icon={<Hash size={14} />} active={activeSection === "Enumerated Types"} onClick={() => setActiveSection("Enumerated Types")} />
                        <SubNavItem label="Extensions" icon={<Box size={14} />} active={activeSection === "Extensions"} onClick={() => setActiveSection("Extensions")} />
                        <SubNavItem label="Indexes" icon={<Layers size={14} />} active={activeSection === "Indexes"} onClick={() => setActiveSection("Indexes")} />
                        <SubNavItem label="Publications" icon={<FileText size={14} />} active={activeSection === "Publications"} onClick={() => setActiveSection("Publications")} />
                    </NavSection>

                    <NavSection title="Configuration">
                        <SubNavItem label="Roles" icon={<Users size={14} />} active={activeSection === "Roles"} onClick={() => setActiveSection("Roles")} />
                        <SubNavItem label="Policies" icon={<Shield size={14} />} active={activeSection === "Policies"} onClick={() => setActiveSection("Policies")} />
                        <SubNavItem label="Settings" icon={<Settings size={14} />} active={activeSection === "Settings"} onClick={() => setActiveSection("Settings")} />
                    </NavSection>

                    <NavSection title="Platform">
                        <SubNavItem label="Replication" icon={<Share2 size={14} />} active={activeSection === "Replication"} onClick={() => setActiveSection("Replication")} />
                        <SubNavItem label="Backups" icon={<Clock size={14} />} active={activeSection === "Backups"} onClick={() => setActiveSection("Backups")} />
                        <SubNavItem label="Migrations" icon={<FileText size={14} />} active={activeSection === "Migrations"} onClick={() => setActiveSection("Migrations")} />
                    </NavSection>

                    <NavSection title="Tools">
                        <SubNavItem label="Security Advisor" icon={<Shield size={14} />} active={activeSection === "Security Advisor"} onClick={() => setActiveSection("Security Advisor")} />
                    </NavSection>
                </div>
            </aside>

            {/* 2. Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-full">
                <header className="h-12 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-3 py-1 bg-[#1a1a1a] border border-[#222] rounded text-xs text-gray-300 font-mono">
                            schema <span className="font-bold text-white">{selectedSchema}</span>
                            <ChevronDown size={12} className="text-gray-500" />
                        </button>
                        <span className="text-gray-600 text-xs">/</span>
                        <span className="text-gray-300 text-xs font-medium">{activeSection}</span>
                    </div>

                    <div className="flex items-center gap-3 text-gray-500">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-2.5" />
                            <input className="bg-transparent border border-[#222] rounded pl-9 pr-4 py-1.5 text-xs text-gray-400 w-48 focus:outline-none" placeholder="Search..." />
                        </div>
                        <button className="p-2 hover:bg-[#1a1a1a] rounded transition-colors transition-transform"><Maximize2 size={14} /></button>
                    </div>
                </header>

                <div className="flex-1 overflow-auto relative bg-[#090909]">
                    {activeSection === "Database Overview" && <SchemaVisualizer />}
                    {activeSection === "Tables" && <TablesListView />}
                    {activeSection === "Functions" && <GenericListView title="Functions" items={["handle_new_user()", "authorize_request()", "check_pqc_signature()"]} type="PL/pgSQL" />}
                    {activeSection === "Policies" && <PoliciesView />}
                    {activeSection === "Security Advisor" && <SecurityAdvisorView />}
                    {activeSection === "Indexes" && <GenericListView title="Indexes" items={["users_email_idx", "profiles_pkey", "posts_author_id_idx"]} type="Index" />}
                    {activeSection === "Extensions" && <GenericListView title="Extensions" items={["pg_pqc", "pgcrypto", "pg_stat_statements"]} type="Extension" />}
                    {activeSection === "Publications" && <GenericListView title="Publications" items={["realtime_broadcast", "auth_sync"]} type="CDC" />}
                    {activeSection === "Triggers" && <GenericListView title="Triggers" items={["on_auth_user_created", "on_post_updated"]} type="Trigger" />}

                    {["Roles", "Settings", "Replication", "Backups", "Migrations", "Enumerated Types"].includes(activeSection) && activeSection !== "Schema Visualizer" && (
                        <div className="p-8 flex items-center justify-center h-full">
                            <div className="text-center space-y-4">
                                <Database size={48} className="mx-auto text-gray-700 opacity-50" />
                                <h2 className="text-xl font-bold text-white tracking-tight">{activeSection.toUpperCase()}</h2>
                                <p className="text-gray-500 text-sm max-w-sm">Configuration for {activeSection} is synchronized with the Edge Orchestrator.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

import { useEffect, useRef, useCallback } from "react";

function SchemaVisualizer() {
    const [tables, setTables] = useState<any[]>([]);
    const [tableData, setTableData] = useState<Record<string, any[]>>({});
    const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({});
    const [dragging, setDragging] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);

    const fetchSchema = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/database/tables?schema=public');
            if (res.ok) {
                const tablesList = await res.json();
                setTables(tablesList);

                // Fetch columns for each table
                const data: Record<string, any[]> = {};
                const initialPositions: Record<string, { x: number, y: number }> = {};

                await Promise.all(tablesList.map(async (t: any, i: number) => {
                    const cRes = await fetch(`/api/database/columns?table=${t.table_name}&schema=public`);
                    if (cRes.ok) {
                        data[t.table_name] = await cRes.json();
                    }
                    // Arrange in a grid or circle initially
                    initialPositions[t.table_name] = {
                        x: 100 + (i % 3) * 350,
                        y: 100 + Math.floor(i / 3) * 300
                    };
                }));

                // Add auth.users manually as requested
                data['auth.users'] = [
                    { column_name: 'id', udt_name: 'uuid', is_primary_key: true },
                    { column_name: 'email', udt_name: 'text' },
                    { column_name: 'pqc_verified', udt_name: 'bool' },
                    { column_name: 'created_at', udt_name: 'timestamptz' }
                ];
                initialPositions['auth.users'] = { x: 400, y: 50 };

                setTableData(data);
                setPositions(initialPositions);
            }
        } catch (e) {
            console.error("Failed to fetch visualizer data", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchema();
    }, [fetchSchema]);

    const handleMouseDown = (tableName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDragging(tableName);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - 128; // Adjust for node width/2
        const y = e.clientY - rect.top - 20;

        setPositions(prev => ({
            ...prev,
            [dragging]: { x, y }
        }));
    };

    const handleMouseUp = () => setDragging(null);

    // Calculate lines for foreign keys
    const renderConnections = () => {
        const connections: React.ReactNode[] = [];
        Object.keys(tableData).forEach(tableName => {
            const cols = tableData[tableName];
            const startPos = positions[tableName];
            if (!startPos) return;

            cols.forEach(col => {
                if (col.is_foreign_key && col.foreign_table_name) {
                    const endPos = positions[col.foreign_table_name];
                    if (endPos) {
                        // Simple straight line with curve
                        const x1 = startPos.x + 256; // Left side
                        const y1 = startPos.y + 40;
                        const x2 = endPos.x;
                        const y2 = endPos.y + 40;

                        connections.push(
                            <path
                                key={`${tableName}-${col.column_name}`}
                                d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${(y1 + y2) / 2} T ${x2} ${y2}`}
                                stroke="#3ecf8e"
                                fill="none"
                                strokeWidth="1.5"
                                className="opacity-30 pointer-events-none"
                            />
                        );
                    }
                }
            });
        });
        return connections;
    };

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#3ecf8e]" size={40} /></div>;

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="absolute inset-0 p-10 cursor-default select-none overflow-auto"
            style={{ backgroundImage: 'radial-gradient(#222 1px, transparent 1px)', backgroundSize: '32px 32px', minWidth: '1500px', minHeight: '1200px' }}>

            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {renderConnections()}
            </svg>

            {Object.keys(positions).map(tableName => (
                <div
                    key={tableName}
                    onMouseDown={(e) => handleMouseDown(tableName, e)}
                    style={{
                        top: positions[tableName].y,
                        left: positions[tableName].x,
                        cursor: dragging === tableName ? 'grabbing' : 'grab'
                    }}
                    className={cn(
                        "absolute w-64 panel bg-[#0d0d0d] rounded-lg overflow-hidden border-[#222] shadow-2xl z-10 transition-shadow",
                        dragging === tableName && "shadow-[0_0_30px_rgba(62,207,142,0.2)] border-[#3ecf8e]/30 scale-[1.02] z-20"
                    )}
                >
                    <div className={cn("px-3 py-2 border-b border-[#222] flex items-center justify-between", tableName.includes('auth') ? "bg-blue-950/20" : "bg-[#1a1a1a]")}>
                        <div className="flex items-center gap-2">
                            {tableName.includes('auth') ? <Shield size={12} className="text-blue-400" /> : <Table size={12} className="text-gray-400" />}
                            <span className={cn("text-[11px] font-bold tracking-widest font-mono", tableName.includes('auth') ? "text-blue-400" : "text-white")}>{tableName}</span>
                        </div>
                        <span className="text-[9px] text-gray-500 font-mono">{tableData[tableName]?.length || 0} cols</span>
                    </div>
                    <div className="p-2 space-y-0.5">
                        {tableData[tableName]?.map((col: any) => (
                            <ColumnRow
                                key={col.column_name}
                                name={col.column_name}
                                type={col.udt_name}
                                pk={col.is_primary_key}
                                fk={col.is_foreign_key}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

function TableNode({ top, left, name, cols, color }: any) {
    return (
        <div style={{ top, left }} className="absolute w-64 panel bg-[#0d0d0d] rounded-lg overflow-hidden border-[#222] shadow-2xl z-10 transition-transform hover:scale-[1.01]">
            <div className={cn("px-3 py-2 border-b border-[#222] flex items-center justify-between", color === 'blue' ? "bg-blue-950/20" : "bg-[#1a1a1a]")}>
                <div className="flex items-center gap-2">
                    {color === 'blue' ? <Shield size={12} className="text-blue-400" /> : <Table size={12} className="text-gray-400" />}
                    <span className={cn("text-[11px] font-bold tracking-widest font-mono", color === 'blue' ? "text-blue-400" : "text-white")}>{name}</span>
                </div>
                {cols && <span className="text-[9px] text-gray-500 font-mono">{cols} cols</span>}
            </div>
            <div className="p-2 space-y-0.5">
                <ColumnRow name="id" type="uuid" pk />
                <ColumnRow name="email" type="text" />
                <ColumnRow name="pqc_verified" type="bool" />
                <ColumnRow name="created_at" type="timestamptz" />
            </div>
        </div>
    )
}

function PoliciesView() {
    return (
        <div className="p-8 space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-white tracking-tight">Row Level Security (RLS)</h2>
            <div className="grid gap-4">
                {["auth.users", "public.profiles"].map(table => (
                    <div key={table} className="panel p-5 rounded-lg bg-[#080808] border-[#1a1a1a] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Lock size={16} className="text-green-500" />
                            <div>
                                <div className="text-sm font-bold text-white font-mono">{table}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">RLS Enabled</div>
                            </div>
                        </div>
                        <button className="px-3 py-1.5 text-[10px] font-bold text-gray-400 border border-[#222] rounded hover:text-white transition-colors">VIEW POLICIES</button>
                    </div>
                ))}
            </div>
        </div>
    )
}

function SecurityAdvisorView() {
    return (
        <div className="p-8 space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-white tracking-tight">Security Advisor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="panel p-6 rounded-lg bg-[#080808] border-[#1a1a1a] space-y-4">
                    <AlertTriangle className="text-red-500" size={20} />
                    <h4 className="text-sm font-bold text-white">RLS Disabled</h4>
                    <p className="text-xs text-gray-500">2 tables have RLS disabled and are potentially exposed to public queries.</p>
                </div>
                <div className="panel p-6 rounded-lg bg-[#080808] border-[#1a1a1a] space-y-4">
                    <CheckCircle2 className="text-green-500" size={20} />
                    <h4 className="text-sm font-bold text-white">PQC Encryption</h4>
                    <p className="text-xs text-gray-500">ML-KEM-1024 re-keying successfully performed 4 hours ago.</p>
                </div>
            </div>
        </div>
    )
}

function GenericListView({ title, items, type }: any) {
    return (
        <div className="p-8 space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                <button className="px-4 py-2 bg-white text-black text-xs font-bold rounded hover:bg-gray-200 transition-colors">NEW {type.toUpperCase()}</button>
            </div>
            <div className="panel rounded-lg overflow-hidden border-[#1a1a1a] bg-[#080808]">
                <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-[#151515]">
                        {items.map((item: string, i: number) => (
                            <tr key={i} className="hover:bg-[#0c0c0c] transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="p-1.5 bg-[#141414] rounded border border-[#222]">
                                        <Database size={14} className="text-gray-400" />
                                    </div>
                                    <span className="text-gray-200 font-mono text-xs">{item}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold text-gray-600 bg-black/40 px-2 py-0.5 rounded border border-[#222]">{type}</span>
                                </td>
                                <td className="px-6 py-4 text-right capitalize text-gray-600 italic text-[10px] tracking-widest font-bold">
                                    Managed
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function NavSection({ title, children }: any) {
    return (
        <div className="space-y-1 px-2">
            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-4 mb-2">{title}</h3>
            {children}
        </div>
    )
}

function SubNavItem({ label, icon, active, onClick }: any) {
    return (
        <div onClick={onClick} className={cn(
            "flex items-center gap-3 px-4 py-1.5 rounded text-xs transition-all cursor-pointer group",
            active ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20" : "text-gray-500 hover:text-gray-300 hover:bg-[#111]"
        )}>
            {icon}
            {label}
        </div>
    )
}

function ColumnRow({ name, type, pk, fk }: any) {
    return (
        <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors group">
            <div className="flex items-center gap-2 overflow-hidden">
                {pk ? <Key size={10} className="text-yellow-600" /> : fk ? <Share2 size={10} className="text-blue-500" /> : <div className="w-2.5" />}
                <span className="font-mono text-[11px] text-gray-300 truncate">{name}</span>
            </div>
            <span className="font-mono text-[10px] text-gray-600 uppercase">{type}</span>
        </div>
    )
}

function TablesListView() {
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [customColumns, setCustomColumns] = useState<{ name: string; type: string; nullable: boolean }[]>([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const COLUMN_TYPES = ['text', 'varchar', 'integer', 'bigint', 'uuid', 'boolean', 'timestamptz', 'jsonb', 'float8', 'bytea'];

    const fetchTables = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/database/tables?schema=public');
            if (res.ok) {
                setTables(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch tables", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    const handleAddColumn = () => {
        setCustomColumns([...customColumns, { name: '', type: 'text', nullable: true }]);
    };

    const handleRemoveColumn = (index: number) => {
        setCustomColumns(customColumns.filter((_, i) => i !== index));
    };

    const handleColumnChange = (index: number, field: string, value: any) => {
        const updated = [...customColumns];
        (updated[index] as any)[field] = value;
        setCustomColumns(updated);
    };

    const handleCreateTable = async () => {
        if (!newTableName.trim()) {
            setError('Table name is required');
            return;
        }
        setError(null);
        setCreating(true);

        try {
            const res = await fetch('/api/database/create-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableName: newTableName.toLowerCase().replace(/\s+/g, '_'),
                    columns: customColumns.filter(c => c.name.trim())
                })
            });

            if (res.ok) {
                setShowCreateModal(false);
                setNewTableName('');
                setCustomColumns([]);
                fetchTables();
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to create table');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#3ecf8e]" size={32} /></div>;

    return (
        <div className="p-8 space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight">Tables</h2>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-[#3ecf8e] text-black text-xs font-bold rounded hover:bg-[#34b27b] transition-colors flex items-center gap-2"
                >
                    <Plus size={14} /> NEW TABLE
                </button>
            </div>
            <div className="panel rounded-lg overflow-hidden border-[#1a1a1a] bg-[#080808]">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-[#1a1a1a] bg-[#0c0c0c]">
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Name</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rows</th>
                            <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Management</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#151515]">
                        {tables.map((table: any, i: number) => (
                            <tr key={i} className="hover:bg-[#0c0c0c] transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="p-1.5 bg-[#141414] rounded border border-[#222]">
                                        <Table size={14} className="text-[#3ecf8e]" />
                                    </div>
                                    <span className="text-gray-200 font-mono text-xs italic">{table.table_name}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold text-gray-600 bg-black/40 px-2 py-0.5 rounded border border-[#222]">{table.table_type}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs text-gray-400 font-mono">{table.row_count_estimate || 0}</span>
                                </td>
                                <td className="px-6 py-4 text-right capitalize text-gray-600 italic text-[10px] tracking-widest font-bold">
                                    Live
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Table Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1a]">
                            <div>
                                <h2 className="text-lg font-bold text-white">Create New Table</h2>
                                <p className="text-xs text-gray-500 mt-1">Base columns (id, project_id, created_at, updated_at) are auto-included.</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto max-h-[55vh] custom-scrollbar">
                            {/* Table Name */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Table Name</label>
                                <input
                                    value={newTableName}
                                    onChange={(e) => setNewTableName(e.target.value)}
                                    placeholder="e.g. blog_posts, user_preferences"
                                    className="w-full bg-black/40 border border-[#222] rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] font-mono"
                                />
                            </div>

                            {/* Base Columns (Read-only) */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Base Columns (Required)</label>
                                <div className="grid grid-cols-2 gap-2 opacity-50">
                                    {['id (serial, PK)', 'project_id (integer)', 'created_at (timestamptz)', 'updated_at (timestamptz)'].map((col, i) => (
                                        <div key={i} className="bg-[#111] border border-dashed border-[#333] rounded px-3 py-2 text-[10px] text-gray-500 font-mono">
                                            {col}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Columns */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Custom Columns</label>
                                    <button onClick={handleAddColumn} className="text-[10px] font-bold text-[#3ecf8e] flex items-center gap-1 hover:underline">
                                        <Plus size={12} /> Add Column
                                    </button>
                                </div>

                                {customColumns.length === 0 && (
                                    <p className="text-xs text-gray-600 italic">No custom columns yet. Click "Add Column" to define your data structure.</p>
                                )}

                                {customColumns.map((col, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-[#111] border border-[#222] rounded-lg p-3">
                                        <input
                                            value={col.name}
                                            onChange={(e) => handleColumnChange(i, 'name', e.target.value)}
                                            placeholder="column_name"
                                            className="flex-1 bg-black/40 border border-[#333] rounded px-3 py-1.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-[#3ecf8e]"
                                        />
                                        <select
                                            value={col.type}
                                            onChange={(e) => handleColumnChange(i, 'type', e.target.value)}
                                            className="bg-black/40 border border-[#333] rounded px-3 py-1.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-[#3ecf8e]"
                                        >
                                            {COLUMN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <label className="flex items-center gap-1 text-[10px] text-gray-500">
                                            <input
                                                type="checkbox"
                                                checked={col.nullable}
                                                onChange={(e) => handleColumnChange(i, 'nullable', e.target.checked)}
                                                className="rounded border-gray-600"
                                            />
                                            Nullable
                                        </label>
                                        <button onClick={() => handleRemoveColumn(i)} className="text-red-500 hover:text-red-400">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="mx-6 mb-4 p-4 bg-red-950/30 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <div className="p-6 border-t border-[#1a1a1a] flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-[11px] font-bold text-gray-400 border border-[#222] rounded-lg hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTable}
                                disabled={creating}
                                className="px-6 py-2 bg-[#3ecf8e] text-black text-[11px] font-bold rounded-lg hover:bg-[#34b27b] flex items-center gap-2"
                            >
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                                Create Table
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
