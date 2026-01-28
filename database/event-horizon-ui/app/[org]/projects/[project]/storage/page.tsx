"use client";

import { useState, useEffect, useRef } from "react";
import { HardDrive, Folder, File, Search, Upload, Plus, Download, Trash2, MoreVertical, Shield, ChevronRight, Globe, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProject";

export default function StoragePage() {
    const { currentProject } = useProject();
    const [buckets, setBuckets] = useState<any[]>([]);
    const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
    const [objects, setObjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingObjects, setLoadingObjects] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showCreateBucket, setShowCreateBucket] = useState(false);
    const [newBucketName, setNewBucketName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (currentProject) {
            fetchBuckets();
        }
    }, [currentProject]);

    useEffect(() => {
        if (selectedBucket && currentProject) {
            fetchObjects();
        }
    }, [selectedBucket]);

    const fetchBuckets = async () => {
        if (!currentProject) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/storage?projectId=${currentProject.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.type === 'buckets') {
                    setBuckets(data.data);
                    if (data.data.length > 0 && !selectedBucket) {
                        setSelectedBucket(data.data[0].name);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch buckets", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchObjects = async () => {
        if (!currentProject || !selectedBucket) return;
        setLoadingObjects(true);
        try {
            const res = await fetch(`/api/storage?projectId=${currentProject.id}&bucket=${selectedBucket}`);
            if (res.ok) {
                const data = await res.json();
                if (data.type === 'objects') {
                    setObjects(data.data);
                }
            }
        } catch (e) {
            console.error("Failed to fetch objects", e);
        } finally {
            setLoadingObjects(false);
        }
    };

    const handleCreateBucket = async () => {
        if (!currentProject || !newBucketName.trim()) return;
        try {
            const res = await fetch('/api/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProject.id, bucketName: newBucketName.trim() })
            });
            if (res.ok) {
                setNewBucketName("");
                setShowCreateBucket(false);
                fetchBuckets();
            } else {
                const err = await res.json();
                alert(`Failed to create bucket: ${err.error}`);
            }
        } catch (e: any) {
            alert(`Failed to create bucket: ${e.message}`);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentProject || !selectedBucket) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', currentProject.id.toString());
            formData.append('bucket', selectedBucket);
            formData.append('path', file.name);

            const res = await fetch('/api/storage', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                fetchObjects();
            } else {
                const err = await res.json();
                alert(`Upload failed: ${err.error}`);
            }
        } catch (e: any) {
            alert(`Upload failed: ${e.message}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteObject = async (objectPath: string) => {
        if (!currentProject || !selectedBucket) return;
        if (!confirm(`Delete "${objectPath}"?`)) return;

        try {
            const res = await fetch('/api/storage', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProject.id, bucketName: selectedBucket, objectPath })
            });
            if (res.ok) {
                fetchObjects();
            } else {
                const err = await res.json();
                alert(`Delete failed: ${err.error}`);
            }
        } catch (e: any) {
            alert(`Delete failed: ${e.message}`);
        }
    };

    const handleDeleteBucket = async (bucketName: string) => {
        if (!currentProject) return;
        if (!confirm(`Delete bucket "${bucketName}" and all its contents?`)) return;

        try {
            const res = await fetch('/api/storage', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProject.id, bucketName })
            });
            if (res.ok) {
                if (selectedBucket === bucketName) {
                    setSelectedBucket(null);
                    setObjects([]);
                }
                fetchBuckets();
            }
        } catch (e: any) {
            alert(`Delete failed: ${e.message}`);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '--';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="flex h-full bg-[#0d0d0d] animate-in fade-in duration-500 overflow-hidden">
            <aside className="w-64 border-r border-[#1a1a1a] bg-[#080808] flex flex-col pt-6 shadow-2xl z-10">
                <div className="px-6 mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Storage Buckets</h2>
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1 italic">AES-256-GCM Encrypted</p>
                    </div>
                    <button
                        onClick={() => setShowCreateBucket(true)}
                        className="p-1 px-2 border border-[#333] rounded hover:bg-[#1a1a1a] transition-all text-gray-500 hover:text-white"
                    >
                        <Plus size={14} />
                    </button>
                </div>
                <div className="px-3 space-y-1.5 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 size={20} className="animate-spin text-gray-700" />
                        </div>
                    ) : buckets.length === 0 ? (
                        <div className="py-8 text-center text-gray-700 text-[11px]">
                            No buckets yet. Create one to start uploading files.
                        </div>
                    ) : (
                        buckets.map(bucket => (
                            <BucketItem
                                key={bucket.name}
                                name={bucket.name}
                                icon={bucket.public ? <Globe size={14} /> : <Shield size={14} />}
                                active={selectedBucket === bucket.name}
                                onClick={() => setSelectedBucket(bucket.name)}
                                onDelete={() => handleDeleteBucket(bucket.name)}
                                objectCount={bucket.object_count}
                                totalSize={formatSize(bucket.total_size)}
                            />
                        ))
                    )}
                </div>

                <div className="mt-auto p-6">
                    <div className="panel p-4 rounded-xl bg-gradient-to-br from-green-950/20 to-black border-green-500/20 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#3ecf8e] uppercase tracking-widest">
                            <Shield size={12} fill="currentColor" /> Encrypted Mode
                        </div>
                        <p className="text-[10px] text-gray-600 leading-relaxed font-medium">All uploads are automatically encrypted with AES-256-GCM.</p>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between px-8">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2.5 bg-[#1a1a1a] rounded-lg border border-[#333] shadow-inner">
                            <Folder size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[13px] overflow-hidden">
                            <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">{selectedBucket || 'Select a bucket'}</span>
                            {selectedBucket && (
                                <>
                                    <ChevronRight size={14} className="text-gray-700 flex-shrink-0" />
                                    <span className="text-gray-600 font-bold uppercase overflow-hidden truncate">/</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleUpload}
                            className="hidden"
                            id="file-upload"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!selectedBucket || uploading}
                            className="flex items-center gap-2 px-6 py-2 bg-white text-black text-[11px] font-extrabold rounded-lg hover:bg-gray-200 transition-all uppercase tracking-tighter shadow-xl group disabled:opacity-50"
                        >
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} className="group-hover:-translate-y-0.5 transition-transform" />}
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-8 overflow-auto">
                    {!selectedBucket ? (
                        <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                            Select a bucket to view files
                        </div>
                    ) : loadingObjects ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 size={32} className="animate-spin text-[#3ecf8e] opacity-50" />
                        </div>
                    ) : (
                        <div className="panel rounded-xl overflow-hidden border-[#1a1a1a] bg-[#080808] shadow-2xl">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-[#111] text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-[#1a1a1a]">
                                    <tr>
                                        <th className="px-8 py-5 font-medium">Name</th>
                                        <th className="px-6 py-5 font-medium">Size</th>
                                        <th className="px-6 py-5 font-medium">Type</th>
                                        <th className="px-6 py-5 font-medium">Uploaded</th>
                                        <th className="px-6 py-5 text-right text-gray-800 italic uppercase select-none">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#151515]">
                                    {objects.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center text-gray-600 text-sm">
                                                No files in this bucket. Upload your first file.
                                            </td>
                                        </tr>
                                    ) : (
                                        objects.map(f => (
                                            <tr key={f.id} className="hover:bg-[#0c0c0c] transition-all group cursor-pointer border-l-2 border-transparent hover:border-[#3ecf8e]">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <Shield size={18} className="text-blue-500 opacity-30 group-hover:opacity-60 transition-opacity" />
                                                        <div className="flex flex-col">
                                                            <span className="text-gray-200 font-mono text-sm tracking-tight group-hover:text-white transition-colors">{f.name}</span>
                                                            <span className="text-[9px] text-gray-700 font-bold uppercase tracking-[0.1em] mt-0.5">AES-256-GCM</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-[11px] text-gray-500 font-mono font-bold">{formatSize(f.size)}</td>
                                                <td className="px-6 py-5 text-[10px] text-gray-600 font-mono">{f.mime_type || 'unknown'}</td>
                                                <td className="px-6 py-5 text-[10px] text-gray-700 font-bold uppercase tracking-tighter">
                                                    {new Date(f.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-2 text-gray-500 hover:text-white transition-colors"><Download size={16} /></button>
                                                        <button
                                                            onClick={() => handleDeleteObject(f.path)}
                                                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            <div className="px-8 py-4 bg-[#111]/30 flex items-center gap-4 border-t border-[#1a1a1a]">
                                <Info size={14} className="text-blue-500/50" />
                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest italic">All files are encrypted at rest using AES-256-GCM.</span>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Create Bucket Modal */}
            {showCreateBucket && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1a]">
                            <h2 className="text-lg font-bold text-white">Create New Bucket</h2>
                            <button onClick={() => setShowCreateBucket(false)} className="text-gray-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Bucket Name</label>
                                <input
                                    value={newBucketName}
                                    onChange={(e) => setNewBucketName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                    placeholder="my-bucket"
                                    className="w-full bg-black/40 border border-[#222] rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] font-mono"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-[#1a1a1a] flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateBucket(false)}
                                className="px-4 py-2 text-[11px] font-bold text-gray-400 border border-[#222] rounded-lg hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBucket}
                                disabled={!newBucketName.trim()}
                                className="px-6 py-2 bg-[#3ecf8e] text-black text-[11px] font-bold rounded-lg hover:bg-[#34b27b] disabled:opacity-50"
                            >
                                Create Bucket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function BucketItem({ name, icon, active, onClick, onDelete, objectCount, totalSize }: any) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center justify-between px-4 py-2.5 rounded-lg transition-all cursor-pointer group",
                active ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20 shadow-inner" : "text-gray-500 hover:text-gray-300 hover:bg-[#111]"
            )}
        >
            <div className="flex items-center gap-3 font-mono text-xs font-medium">
                {icon}
                <div className="flex flex-col">
                    <span>{name}</span>
                    <span className="text-[9px] text-gray-700">{objectCount || 0} files · {totalSize}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {active && <div className="w-1 h-3 rounded-full bg-[#3ecf8e] shadow-[0_0_8px_#3ecf8e]" />}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-500 transition-all"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}
