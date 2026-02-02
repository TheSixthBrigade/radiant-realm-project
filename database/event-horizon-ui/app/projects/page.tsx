"use client";

import { useProject } from "@/hooks/useProject";
import { Database, Plus, ArrowRight, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export default function ProjectsPage() {
    const { projects, currentProject, setCurrentProject } = useProject();
    const router = useRouter();
    const [currentOrg, setCurrentOrg] = useState<any>(null);

    // Fetch current org to build correct URL
    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const res = await fetch('/api/organizations');
                if (res.ok) {
                    const orgs = await res.json();
                    if (orgs.length > 0) {
                        setCurrentOrg(orgs[0]);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch org', e);
            }
        };
        fetchOrg();
    }, []);

    const handleSelectProject = (p: any) => {
        setCurrentProject(p);
        // Navigate to the correct URL format: /{org}/projects/{project}
        if (currentOrg) {
            router.push(`/${currentOrg.name}/projects/${p.slug}`);
        } else {
            // Fallback to old format if org not loaded yet
            router.push(`/projects/${p.slug}`);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-[#0a0a0a]/50">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-[#3ecf8e]/20 rounded-3xl blur-2xl animate-pulse" />
                    <div className="relative w-full h-full bg-gradient-to-br from-[#111] to-black border border-[#222] rounded-3xl flex items-center justify-center shadow-2xl">
                        <Database size={40} className="text-gray-700" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#3ecf8e] rounded-full flex items-center justify-center shadow-lg border-4 border-[#0d0d0d]">
                            <Plus size={12} className="text-black font-bold" />
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Vectabase Nodes</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Select a database node to manage your vectors, SQL schema, and security policies.
                    </p>
                </div>

                {projects.length > 0 ? (
                    <div className="pt-6 space-y-4 text-left relative pl-8">
                        <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-[#3ecf8e]/40 via-[#222] to-transparent" />

                        {projects.map(p => (
                            <div key={p.id} className="relative group">
                                <div className="absolute -left-5 top-1/2 w-5 h-px bg-[#3ecf8e]/40 border-t border-[#3ecf8e]/20" />
                                <button
                                    onClick={() => handleSelectProject(p)}
                                    className="w-full px-5 py-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl text-[13px] text-gray-400 hover:text-[#3ecf8e] hover:border-[#3ecf8e]/30 hover:bg-[#3ecf8e]/5 transition-all flex items-center justify-between group shadow-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-gray-800 group-hover:bg-[#3ecf8e] transition-colors" />
                                        <span className="font-mono tracking-tight">{p.name}</span>
                                    </div>
                                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="pt-4 flex flex-col gap-3">
                        <div className="w-full h-24 border border-dashed border-[#222] rounded-xl flex items-center justify-center text-gray-600 text-xs font-mono">
                            NO PROJECTS FOUND IN THIS ORG
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-700 font-bold uppercase tracking-widest justify-center">
                            <Lock size={10} /> Create a project to begin
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
