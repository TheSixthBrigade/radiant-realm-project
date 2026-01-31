"use client";

import { useState, useEffect } from "react";
import {
    Table,
    Search,
    Plus,
    Filter,
    RefreshCw,
    ChevronDown,
    ArrowUpDown,
    Key,
    Loader2,
    Trash2,
    Save,
    X,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProject";
import { useUser } from "@/hooks/useUser";

export default function DataStudioPage() {
    const { user } = useUser();
    const { currentProject } = useProject();
    const [tables, setTables] = useState<any[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [columns, setColumns] = useState<any[]>([]);
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingRows, setLoadingRows] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [pagination, setPagination] = useState({ total: 0, offset: 0, limit: 50 });

    // Modal states
    const [showInsertModal, setShowInsertModal] = useState(false);
    const [insertData, setInsertData] = useState<Record<string, any>>({});
    const [inserting, setInserting] = useState(false);
    const [insertError, setInsertError] = useState<string | null>(null);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [deleting, setDeleting] = useState(false);

    // Create Table Modal
    const [showCreateTableModal, setShowCreateTableModal] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [customColumns, setCustomColumns] = useState<{ name: string; type: string; nullable: boolean }[]>([]);
    const [creatingTable, setCreatingTable] = useState(false);
    const [createTableError, setCreateTableError] = useState<string | null>(null);
    const COLUMN_TYPES = ['text', 'varchar', 'integer', 'bigint', 'uuid', 'boolean', 'timestamptz', 'jsonb', 'float8', 'bytea'];

    // Delete Table Modal
    const [showDeleteTableModal, setShowDeleteTableModal] = useState(false);
    const [tableToDelete, setTableToDelete] = useState<string | null>(null);
    const [deletingTable, setDeletingTable] = useState(false);


    // Fetch tables - simple and direct
    const fetchTables = async () => {
        setLoading(true);
        try {
            const projectId = currentProject?.id;
            const timestamp = Date.now(); // Cache buster
            const url = projectId
                ? `/api/database/tables?schema=public&projectId=${projectId}&_t=${timestamp}`
                : `/api/database/tables?schema=public&_t=${timestamp}`;
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setTables(data);
                if (data.length > 0 && !selectedTable) {
                    setSelectedTable(data[0].table_name);
                }
            }
        } catch (e) {
            console.error("Failed to fetch tables", e);
        } finally {
            setLoading(false);
        }
    };

    // Fetch on mount and when project changes
    useEffect(() => {
        fetchTables();
    }, [currentProject?.id]);

    useEffect(() => {
        if (selectedTable) {
            fetchColumns(selectedTable);
            fetchRows(selectedTable);
            setSelectedRows(new Set());
        }
    }, [selectedTable]);

    const fetchColumns = async (tableName: string) => {
        try {
            const res = await fetch(`/api/database/columns?table=${tableName}&schema=public`);
            if (res.ok) {
                const cols = await res.json();
                setColumns(cols);
                // Pre-populate insert form
                const initialData: Record<string, any> = {};
                cols.forEach((col: any) => {
                    const colName = col.column_name.toLowerCase();
                    if (!col.column_default?.includes('nextval') && !col.is_primary_key) {
                        if ((colName === 'owner_id' || colName === 'user_id' || colName === 'author_id') && user?.id) {
                            initialData[col.column_name] = user.id.toString();
                        } else if (colName === 'project_id' && currentProject?.id) {
                            initialData[col.column_name] = currentProject.id.toString();
                        } else if (colName === 'created_at' || colName === 'updated_at') {
                            initialData[col.column_name] = new Date().toISOString();
                        } else {
                            initialData[col.column_name] = '';
                        }
                    }
                });
                setInsertData(initialData);
            }
        } catch (e) {
            console.error("Failed to fetch columns", e);
        }
    };

    const fetchRows = async (tableName: string, offset = 0) => {
        setLoadingRows(true);
        try {
            const res = await fetch(`/api/database/rows?table=${tableName}&schema=public&limit=50&offset=${offset}`);
            if (res.ok) {
                const data = await res.json();
                setRows(data.rows || []);
                setPagination({ total: data.total || 0, offset: data.offset || 0, limit: data.limit || 50 });
            }
        } catch (e) {
            console.error("Failed to fetch rows", e);
        } finally {
            setLoadingRows(false);
        }
    };


    const handleInsertRow = async () => {
        if (!selectedTable) return;
        setInsertError(null);

        const transformedData: Record<string, any> = {};
        for (const col of columns) {
            if (col.column_default?.includes('nextval') || col.is_primary_key) continue;

            const value = insertData[col.column_name];
            const isEmpty = value === '' || value === undefined || value === null;

            if (isEmpty) {
                if (col.is_nullable === 'NO') {
                    setInsertError(`"${col.column_name}" is required.`);
                    return;
                }
                transformedData[col.column_name] = null;
                continue;
            }

            const type = col.udt_name.toLowerCase();
            if (['int2', 'int4', 'integer', 'smallint'].includes(type)) {
                const num = parseInt(value, 10);
                if (isNaN(num)) {
                    setInsertError(`"${col.column_name}" must be a valid integer.`);
                    return;
                }
                transformedData[col.column_name] = num;
            } else if (['int8', 'bigint'].includes(type)) {
                transformedData[col.column_name] = value;
            } else if (['float4', 'float8', 'real', 'double precision', 'numeric', 'decimal'].includes(type)) {
                const num = parseFloat(value);
                if (isNaN(num)) {
                    setInsertError(`"${col.column_name}" must be a valid number.`);
                    return;
                }
                transformedData[col.column_name] = num;
            } else if (['bool', 'boolean'].includes(type)) {
                const lower = String(value).toLowerCase();
                transformedData[col.column_name] = ['true', '1', 't', 'yes'].includes(lower);
            } else if (['json', 'jsonb'].includes(type)) {
                try {
                    transformedData[col.column_name] = JSON.parse(value);
                } catch {
                    setInsertError(`"${col.column_name}" must be valid JSON.`);
                    return;
                }
            } else {
                transformedData[col.column_name] = value;
            }
        }

        // Force project_id to current project
        if (currentProject?.id) {
            transformedData.project_id = currentProject.id;
        }

        setInserting(true);
        try {
            const res = await fetch('/api/database/rows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: selectedTable, schema: 'public', data: transformedData })
            });
            const result = await res.json();
            if (res.ok) {
                setShowInsertModal(false);
                setInsertError(null);
                // Refresh rows
                await fetchRows(selectedTable);
            } else {
                setInsertError(result.error || 'Insert failed');
            }
        } catch (e: any) {
            setInsertError(e.message || 'Insert failed');
        } finally {
            setInserting(false);
        }
    };

    const handleCreateTable = async () => {
        if (!newTableName.trim()) {
            setCreateTableError('Table name is required');
            return;
        }
        setCreateTableError(null);
        setCreatingTable(true);
        
        try {
            const tableName = newTableName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const res = await fetch('/api/database/create-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableName,
                    columns: customColumns.filter(c => c.name.trim()),
                    projectId: currentProject?.id
                })
            });
            const result = await res.json();
            if (res.ok) {
                setShowCreateTableModal(false);
                setNewTableName('');
                setCustomColumns([]);
                // Add to local state immediately
                setTables(prev => [...prev, { table_name: tableName, row_count_estimate: 0 }]);
                setSelectedTable(tableName);
                // Force refresh
                await fetchTables();
            } else {
                setCreateTableError(result.error || 'Failed to create table');
            }
        } catch (e: any) {
            setCreateTableError(e.message);
        } finally {
            setCreatingTable(false);
        }
    };

    const handleDeleteTable = async () => {
        if (!tableToDelete) return;
        setDeletingTable(true);
        
        try {
            const res = await fetch('/api/database/delete-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableName: tableToDelete,
                    projectId: currentProject?.id
                })
            });
            const result = await res.json();
            if (res.ok) {
                setShowDeleteTableModal(false);
                setTableToDelete(null);
                // Remove from local state
                setTables(prev => prev.filter(t => t.table_name !== tableToDelete));
                // Select another table or clear
                if (selectedTable === tableToDelete) {
                    const remaining = tables.filter(t => t.table_name !== tableToDelete);
                    setSelectedTable(remaining.length > 0 ? remaining[0].table_name : null);
                }
            } else {
                alert(result.error || 'Failed to delete table');
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setDeletingTable(false);
        }
    };


    const handleDeleteSelected = async () => {
        if (!selectedTable || selectedRows.size === 0) return;
        if (!confirm(`Delete ${selectedRows.size} row(s)?`)) return;

        setDeleting(true);
        try {
            const pkCol = columns.find(c => c.is_primary_key);
            if (!pkCol) {
                alert('Cannot delete: No primary key found');
                return;
            }
            for (const rowIndex of selectedRows) {
                const row = rows[rowIndex];
                await fetch('/api/database/rows', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        table: selectedTable,
                        schema: 'public',
                        where: { [pkCol.column_name]: row[pkCol.column_name] }
                    })
                });
            }
            setSelectedRows(new Set());
            fetchRows(selectedTable);
        } catch (e: any) {
            alert(`Delete failed: ${e.message}`);
        } finally {
            setDeleting(false);
        }
    };

    const toggleRowSelection = (index: number) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(index)) newSelected.delete(index);
        else newSelected.add(index);
        setSelectedRows(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedRows.size === rows.length) setSelectedRows(new Set());
        else setSelectedRows(new Set(rows.map((_, i) => i)));
    };

    const filteredTables = tables.filter(t =>
        t.table_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-full bg-[#0d0d0d] overflow-hidden animate-in fade-in duration-500">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[#1a1a1a] bg-[#0d0d0d] flex flex-col pt-4 overflow-hidden shadow-2xl z-10">
                <div className="px-4 mb-2 space-y-4">
                    <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
                            schema <span className="text-white">public</span>
                        </label>
                        <button className="w-full flex items-center justify-between px-3 py-1 bg-[#141414] border border-[#222] rounded-md text-[11px] text-gray-400 font-medium h-8">
                            <span className="opacity-0 w-0">public</span>
                            <ChevronDown size={14} className="text-gray-600 ml-auto" />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowCreateTableModal(true)}
                        className="w-full flex items-center gap-2 px-1 text-[11px] text-gray-400 hover:text-white transition-colors h-6 font-medium"
                    >
                        <Plus size={14} className="text-gray-600" /> New table
                    </button>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-2 text-gray-600" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#0d0d0d] border border-[#222] rounded-md pl-9 pr-9 py-1.5 text-[11px] text-gray-400 focus:outline-none focus:border-[#3ecf8e] transition-all h-8"
                            placeholder="Search tables..."
                        />
                        <button className="absolute right-2.5 top-2 text-gray-600 hover:text-gray-400">
                            <Filter size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar mt-2 border-t border-[#1a1a1a]">
                    {loading ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 size={20} className="animate-spin text-gray-700" />
                        </div>
                    ) : filteredTables.length === 0 ? (
                        <div className="py-8 text-center text-gray-600 text-xs">No tables found</div>
                    ) : (
                        filteredTables.map((table) => (
                            <div
                                key={table.table_name}
                                onClick={() => setSelectedTable(table.table_name)}
                                className={cn(
                                    "group flex items-center justify-between px-4 py-2 text-[11px] font-medium cursor-pointer transition-all",
                                    table.table_name === selectedTable
                                        ? "bg-[#141414] text-white border-l-2 border-[#3ecf8e]"
                                        : "text-gray-500 hover:text-gray-200 border-l-2 border-transparent hover:bg-[#111]"
                                )}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Table size={14} className={cn("flex-shrink-0", table.table_name === selectedTable ? "text-[#3ecf8e]" : "text-gray-700")} />
                                    <span className="truncate">{table.table_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-gray-700">{table.row_count_estimate}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTableToDelete(table.table_name);
                                            setShowDeleteTableModal(true);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                        title="Delete table"
                                    >
                                        <Trash2 size={12} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>


            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full bg-[#0d0d0d] relative overflow-hidden">
                <div className="h-10 bg-[#080808] border-b border-[#1a1a1a] flex items-center px-4 gap-0.5">
                    <div className="flex items-center h-full px-4 gap-2 bg-[#0d0d0d] border-t border-[#3ecf8e] text-xs font-bold text-white cursor-pointer select-none">
                        <Table size={14} className="text-gray-500" />
                        public.{selectedTable || '...'}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 font-mono">{pagination.total} rows</span>
                        <button
                            onClick={() => selectedTable && fetchRows(selectedTable)}
                            className="p-1 px-3 bg-[#111] border border-[#222] rounded text-[10px] font-bold text-gray-400 hover:text-white transition-all flex items-center gap-2"
                        >
                            <RefreshCw size={12} /> Refresh
                        </button>
                    </div>
                </div>

                <header className="h-12 border-b border-[#1a1a1a] flex items-center justify-between px-4 bg-[#0d0d0d]">
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 text-[11px] font-bold text-gray-400 hover:text-white transition-colors">
                            <Filter size={14} className="text-gray-600" /> Filter
                        </button>
                        <button className="flex items-center gap-2 text-[11px] font-bold text-gray-400 hover:text-white transition-colors">
                            <ArrowUpDown size={14} className="text-gray-600" /> Sort
                        </button>
                        <div className="w-px h-4 bg-[#1a1a1a] mx-2" />
                        <button
                            onClick={() => setShowInsertModal(true)}
                            className="flex items-center gap-2 px-3 py-1 bg-[#2ea043] text-white text-[11px] font-bold rounded-md hover:bg-[#3fb950] transition-all h-7"
                        >
                            <Plus size={14} fill="currentColor" /> Insert Row
                        </button>
                        {selectedRows.size > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                disabled={deleting}
                                className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-[11px] font-bold rounded-md hover:bg-red-500 transition-all h-7"
                            >
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Delete ({selectedRows.size})
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-auto bg-[#0d0d0d] custom-scrollbar">
                    {loadingRows ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 size={32} className="animate-spin text-[#3ecf8e] opacity-50" />
                        </div>
                    ) : (
                        <div className="min-w-full inline-block align-middle">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-[#1a1a1a] bg-[#0d0d0d] sticky top-0 z-10">
                                        <th className="w-11 px-4 py-2 text-left sticky left-0 z-10 bg-[#0d0d0d] border-r border-[#1a1a1a]">
                                            <div
                                                onClick={toggleSelectAll}
                                                className={cn(
                                                    "w-4 h-4 rounded border cursor-pointer flex items-center justify-center",
                                                    selectedRows.size === rows.length && rows.length > 0
                                                        ? "bg-[#3ecf8e] border-[#3ecf8e]"
                                                        : "border-[#333] bg-[#050505]"
                                                )}
                                            >
                                                {selectedRows.size === rows.length && rows.length > 0 && <Check size={10} className="text-black" />}
                                            </div>
                                        </th>
                                        {columns.map((col, i) => (
                                            <th key={col.column_name} className={cn("px-6 py-2 text-left border-r border-[#1a1a1a]", i === columns.length - 1 && "border-r-0")}>
                                                <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 tracking-tighter cursor-pointer">
                                                    {col.is_primary_key && <Key size={12} className="text-[#3ecf8e]" />}
                                                    <span className="text-white font-bold">{col.column_name}</span>
                                                    <span className="text-gray-700 opacity-80">{col.udt_name}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr key={i} className={cn("border-b border-[#1a1a1a] hover:bg-[#111] group transition-colors", selectedRows.has(i) && "bg-[#3ecf8e]/10")}>
                                            <td className="px-4 py-3 sticky left-0 z-10 bg-[#0d0d0d] group-hover:bg-[#111] border-r border-[#1a1a1a]">
                                                <div
                                                    onClick={() => toggleRowSelection(i)}
                                                    className={cn(
                                                        "w-4 h-4 rounded border cursor-pointer flex items-center justify-center",
                                                        selectedRows.has(i) ? "bg-[#3ecf8e] border-[#3ecf8e]" : "border-[#333] bg-transparent"
                                                    )}
                                                >
                                                    {selectedRows.has(i) && <Check size={10} className="text-black" />}
                                                </div>
                                            </td>
                                            {columns.map((col, j) => (
                                                <td key={col.column_name} className={cn("px-6 py-3 border-r border-[#1a1a1a] font-mono text-[11px]", j === columns.length - 1 && "border-r-0")}>
                                                    <CellValue value={row[col.column_name]} type={col.udt_name} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={columns.length + 1} className="py-20 text-center text-gray-600 text-sm">
                                                No rows found in this table.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {pagination.total > pagination.limit && (
                    <div className="h-10 border-t border-[#1a1a1a] bg-[#080808] flex items-center justify-between px-4 text-[10px] text-gray-600">
                        <span>Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}</span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={pagination.offset === 0}
                                onClick={() => selectedTable && fetchRows(selectedTable, Math.max(0, pagination.offset - pagination.limit))}
                                className="px-3 py-1 border border-[#222] rounded text-gray-400 hover:text-white disabled:opacity-30"
                            >
                                Previous
                            </button>
                            <button
                                disabled={pagination.offset + pagination.limit >= pagination.total}
                                onClick={() => selectedTable && fetchRows(selectedTable, pagination.offset + pagination.limit)}
                                className="px-3 py-1 border border-[#222] rounded text-gray-400 hover:text-white disabled:opacity-30"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </main>


            {/* Insert Row Modal */}
            {showInsertModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1a]">
                            <h2 className="text-lg font-bold text-white">Insert Row into {selectedTable}</h2>
                            <button onClick={() => setShowInsertModal(false)} className="text-gray-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh] custom-scrollbar">
                            {columns.filter(c => !c.column_default?.includes('nextval') && !c.is_primary_key).map(col => {
                                const colName = col.column_name.toLowerCase();
                                const isProjectId = colName === 'project_id';
                                return (
                                    <div key={col.column_name} className="space-y-2">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            {col.column_name}
                                            <span className="text-gray-700 font-mono normal-case">{col.udt_name}</span>
                                            {col.is_nullable === 'NO' && <span className="text-red-500">*</span>}
                                            {isProjectId && <span className="text-[9px] text-[#3ecf8e] ml-auto">Auto-set to {currentProject?.id}</span>}
                                        </label>
                                        <input
                                            value={isProjectId ? (currentProject?.id || '') : (insertData[col.column_name] || '')}
                                            onChange={(e) => !isProjectId && setInsertData({ ...insertData, [col.column_name]: e.target.value })}
                                            disabled={isProjectId}
                                            className={cn(
                                                "w-full bg-black/40 border border-[#222] rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] font-mono",
                                                isProjectId && "opacity-50 cursor-not-allowed bg-[#111]"
                                            )}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        {insertError && (
                            <div className="mx-6 mb-4 p-4 bg-red-950/30 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 text-sm font-medium">{insertError}</p>
                            </div>
                        )}
                        <div className="p-6 border-t border-[#1a1a1a] flex justify-end gap-3">
                            <button onClick={() => setShowInsertModal(false)} className="px-4 py-2 text-[11px] font-bold text-gray-400 border border-[#222] rounded-lg hover:text-white">
                                Cancel
                            </button>
                            <button onClick={handleInsertRow} disabled={inserting} className="px-6 py-2 bg-[#3ecf8e] text-black text-[11px] font-bold rounded-lg hover:bg-[#34b27b] flex items-center gap-2">
                                {inserting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Insert Row
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Table Modal */}
            {showCreateTableModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1a]">
                            <div>
                                <h2 className="text-lg font-bold text-white">Create New Table</h2>
                                <p className="text-xs text-gray-500 mt-1">Base columns (id, project_id, created_at, updated_at) are auto-included.</p>
                            </div>
                            <button onClick={() => setShowCreateTableModal(false)} className="text-gray-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto max-h-[55vh] custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Table Name</label>
                                <input
                                    value={newTableName}
                                    onChange={(e) => setNewTableName(e.target.value)}
                                    placeholder="e.g. blog_posts, user_preferences"
                                    className="w-full bg-black/40 border border-[#222] rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] font-mono"
                                />
                            </div>

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

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Custom Columns</label>
                                    <button onClick={() => setCustomColumns([...customColumns, { name: '', type: 'text', nullable: true }])} className="text-[10px] font-bold text-[#3ecf8e] flex items-center gap-1 hover:underline">
                                        <Plus size={12} /> Add Column
                                    </button>
                                </div>
                                {customColumns.length === 0 && (
                                    <p className="text-xs text-gray-600 italic">No custom columns yet.</p>
                                )}
                                {customColumns.map((col, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-[#111] border border-[#222] rounded-lg p-3">
                                        <input
                                            value={col.name}
                                            onChange={(e) => {
                                                const updated = [...customColumns];
                                                updated[i].name = e.target.value;
                                                setCustomColumns(updated);
                                            }}
                                            placeholder="column_name"
                                            className="flex-1 bg-black/40 border border-[#333] rounded px-3 py-1.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-[#3ecf8e]"
                                        />
                                        <select
                                            value={col.type}
                                            onChange={(e) => {
                                                const updated = [...customColumns];
                                                updated[i].type = e.target.value;
                                                setCustomColumns(updated);
                                            }}
                                            className="bg-black/40 border border-[#333] rounded px-3 py-1.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-[#3ecf8e]"
                                        >
                                            {COLUMN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <button onClick={() => setCustomColumns(customColumns.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {createTableError && (
                            <div className="mx-6 mb-4 p-4 bg-red-950/30 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 text-sm font-medium">{createTableError}</p>
                            </div>
                        )}

                        <div className="p-6 border-t border-[#1a1a1a] flex justify-end gap-3">
                            <button onClick={() => setShowCreateTableModal(false)} className="px-4 py-2 text-[11px] font-bold text-gray-400 border border-[#222] rounded-lg hover:text-white">
                                Cancel
                            </button>
                            <button onClick={handleCreateTable} disabled={creatingTable} className="px-6 py-2 bg-[#3ecf8e] text-black text-[11px] font-bold rounded-lg hover:bg-[#34b27b] flex items-center gap-2">
                                {creatingTable ? <Loader2 size={14} className="animate-spin" /> : <Table size={14} />}
                                Create Table
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Table Confirmation Modal */}
            {showDeleteTableModal && tableToDelete && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1a]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/20 rounded-lg">
                                    <Trash2 size={20} className="text-red-500" />
                                </div>
                                <h2 className="text-lg font-bold text-white">Delete Table</h2>
                            </div>
                            <button onClick={() => { setShowDeleteTableModal(false); setTableToDelete(null); }} className="text-gray-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-400 text-sm">
                                Are you sure you want to delete the table <span className="font-mono text-white bg-[#1a1a1a] px-2 py-0.5 rounded">{tableToDelete}</span>?
                            </p>
                            <p className="text-red-400 text-xs mt-3">
                                This action cannot be undone. All data in this table will be permanently deleted.
                            </p>
                        </div>
                        <div className="p-6 border-t border-[#1a1a1a] flex justify-end gap-3">
                            <button 
                                onClick={() => { setShowDeleteTableModal(false); setTableToDelete(null); }} 
                                className="px-4 py-2 text-[11px] font-bold text-gray-400 border border-[#222] rounded-lg hover:text-white"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteTable} 
                                disabled={deletingTable} 
                                className="px-6 py-2 bg-red-600 text-white text-[11px] font-bold rounded-lg hover:bg-red-500 flex items-center gap-2"
                            >
                                {deletingTable ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Delete Table
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CellValue({ value, type }: { value: any; type: string }) {
    if (value === null) return <span className="text-gray-700 italic">NULL</span>;
    if (type === 'bool') return <span className={value ? "text-[#3ecf8e]" : "text-red-400"}>{String(value).toUpperCase()}</span>;
    if (type === 'uuid') return <span className="text-gray-200">{value}</span>;
    if (type === 'timestamptz' || type === 'timestamp') return <span className="text-gray-500">{new Date(value).toLocaleString()}</span>;
    if (type === 'jsonb' || type === 'json') return <span className="text-blue-400 truncate max-w-xs block">{JSON.stringify(value)}</span>;
    return <span className="text-gray-300 truncate max-w-xs block">{String(value)}</span>;
}
