"use client";

import { useState, useEffect } from "react";
import {
    Database,
    Settings,
    Table,
    Code,
    Cpu,
    HardDrive,
    Zap,
    PieChart,
    LogOut,
    ChevronDown,
    Search,
    Bell,
    HelpCircle,
    FileText,
    Shield,
    ShieldCheck,
    ShieldAlert,
    LayoutGrid,
    Plus,
    ArrowRight,
    Lock
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { useProject } from "@/hooks/useProject";

export function EnterpriseLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();
    const { currentProject, setCurrentProject, projects, setProjects } = useProject();
    const pathname = usePathname();
    const router = useRouter();
    const params = useParams();
    const [orgs, setOrgs] = useState<any[]>([]);
    const [currentOrg, setCurrentOrg] = useState<any>(null);
    const [isCreatingOrg, setIsCreatingOrg] = useState(false);
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [newProjectName, setNewProjectName] = useState("");

    useEffect(() => {
        if (user) {
            fetchWorkspaces();
        }
    }, [user]);

    useEffect(() => {
        if (currentOrg) {
            fetchProjects(currentOrg.id);
        }
    }, [currentOrg]);

    useEffect(() => {
        // Root redirect logic - centralized here where we have Org + Project context
        if (pathname === '/' && currentOrg && projects.length > 0) {
            // Check if we have a current project, otherwise default to first
            const targetProject = currentProject || projects[0];
            router.push(`/${currentOrg.name}/projects/${targetProject.slug}`);
        } else if (pathname === '/' && currentOrg && projects.length === 0) {
            // Org exists but no projects - stay on root (Initialize screen)
        }
    }, [pathname, currentOrg, projects, currentProject]);

    const fetchWorkspaces = async () => {
        try {
            const res = await fetch('/api/organizations');
            if (res.ok) {
                const data = await res.json();
                setOrgs(data);

                // Prioritize URL param for org selection
                if (params?.org) {
                    const orgName = decodeURIComponent(params.org as string);
                    const matchingOrg = data.find((o: any) => o.name === orgName);
                    if (matchingOrg) {
                        setCurrentOrg(matchingOrg);
                        return;
                    }
                }

                if (data.length > 0 && !currentOrg) {
                    setCurrentOrg(data[0]);
                }
            }
        } catch (e) {
            console.error("Failed to fetch workspaces", e);
        }
    };

    const fetchProjects = async (orgId: number) => {
        try {
            const pRes = await fetch(`/api/projects?orgId=${orgId}`);
            if (pRes.ok) {
                const data = await pRes.json();
                setProjects(data);
                // Ensure no auto-selection, force landing page
                // setCurrentProject(null); 
            }
        } catch (e) {
            console.error("Failed to fetch projects", e);
        }
    };

    const handleSelectOrg = (org: any) => {
        setCurrentOrg(org);
        setCurrentProject(null);
        // Navigate to the org's project list (which might default to first project via root page logic if we had one, but here just stay on layout?)
        // Or navigate to deep link base for org?
        // Let's just go to root and let root page redirect, OR better:
        // router.push(`/${org.name}/projects`); // If we had an org dashboard
        // But we don't have an org dashboard, only project dashboard.
        // So stay put or select first project? 
        // Logic: Set org, clear project. The UI shows "Select a project".
        router.push('/');
    };

    const handleSelectProject = (proj: any) => {
        setCurrentProject(proj);
        if (currentOrg) {
            router.push(`/${currentOrg.name}/projects/${proj.slug}`);
        }
    };

    const handleCreateOrg = async () => {
        if (!newOrgName) return;
        try {
            const res = await fetch('/api/organizations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newOrgName })
            });
            if (res.ok) {
                const newOrg = await res.json();
                setOrgs([...orgs, newOrg]);
                setCurrentOrg(newOrg);
                setNewOrgName("");
                setIsCreatingOrg(false);
            }
        } catch (e) {
            console.error("Failed to create org", e);
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectName || !currentOrg) return;
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProjectName, orgId: currentOrg.id })
            });
            if (res.ok) {
                const newProj = await res.json();
                setProjects([...projects, newProj]);
                setCurrentProject(newProj);
                setNewProjectName("");
                setIsCreatingProject(false);
                router.push(`/${currentOrg.name}/projects/${newProj.slug}`);
            }
        } catch (e) {
            console.error("Failed to create project", e);
        }
    };

    // Public routes that don't need the shell
    if (pathname === '/login' || pathname.startsWith('/api/auth')) {
        return <main className="h-screen w-full overflow-hidden bg-[#0d0d0d]">{children}</main>;
    }

    // Admin routes - render without project requirement (Lattice admin only)
    if (pathname.startsWith('/admin')) {
        return <main className="h-screen w-full overflow-hidden bg-[#0d0d0d]">{children}</main>;
    }

    // Account settings - render without project requirement
    if (pathname === '/settings') {
        return <main className="h-screen w-full overflow-hidden bg-[#0d0d0d]">{children}</main>;
    }

    // While loading user on protected routes, show nothing to prevent "leak"
    if (loading) {
        return <div className="h-screen w-full bg-[#0d0d0d] flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-[#3ecf8e]/20 border-t-[#3ecf8e] rounded-full animate-spin" />
        </div>;
    }

    // If no user after loading, redirect to login
    if (!user) {
        // Use effect to redirect to avoid render issues
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        return <div className="h-screen w-full bg-[#0d0d0d] flex flex-col items-center justify-center gap-4 text-gray-500">
            <div className="w-12 h-12 border-2 border-[#3ecf8e]/20 border-t-[#3ecf8e] rounded-full animate-spin" />
            <p className="text-xs font-mono uppercase tracking-widest">Redirecting to login...</p>
        </div>;
    }

    return (
        <div className="flex h-screen bg-[#0d0d0d] text-[#ededed] overflow-hidden">
            {/* Sidebar v1: Organization Switcher */}
            <aside className="w-16 flex flex-col items-center py-4 border-r border-[#262626] bg-[#080808] z-30">
                <div className="mb-6">
                    <div
                        onClick={() => router.push('/projects')}
                        className="cursor-pointer transition-transform hover:scale-105"
                    >
                        <Image 
                            src="/vectabase-logo.png" 
                            alt="Vectabase" 
                            width={40} 
                            height={40}
                            className="rounded-xl shadow-[0_0_15px_rgba(62,207,142,0.3)]"
                        />
                    </div>
                </div>
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto w-full items-center custom-scrollbar">
                    {orgs.map(org => (
                        <div
                            key={org.id}
                            title={org.name}
                            onClick={() => handleSelectOrg(org)}
                            className={cn(
                                "w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold border transition-all cursor-pointer overflow-hidden relative group",
                                currentOrg?.id === org.id ? "bg-[#141414] border-[#3ecf8e] text-[#3ecf8e]" : "bg-transparent border-[#262626] text-gray-500 hover:border-gray-500"
                            )}>
                            {org.name.substring(0, 2).toUpperCase()}
                            {currentOrg?.id === org.id && (
                                <div className="absolute -left-1 w-2 h-6 bg-[#3ecf8e] rounded-r-lg" />
                            )}
                        </div>
                    ))}
                    <div
                        onClick={() => setIsCreatingOrg(true)}
                        className="w-10 h-10 rounded-full flex-shrink-0 bg-[#141414] hover:bg-[#1a1a1a] flex items-center justify-center text-gray-500 cursor-pointer border border-[#262626] transition-colors"
                    >
                        <Plus size={16} />
                    </div>
                </div>
                <div className="mt-auto flex flex-col gap-4 pb-2">
                    <Link href="/settings" className="text-gray-500 hover:text-white transition-colors"><Settings size={20} /></Link>
                    <button 
                        onClick={() => {
                            // Clear all auth cookies
                            document.cookie = 'pqc_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                            document.cookie = 'lattice_admin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                            window.location.href = '/login';
                        }}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </aside>

            {/* Sidebar v2: Navigation */}
            <aside className="w-14 hover:w-64 group transition-all duration-300 ease-in-out border-r border-[#262626] flex flex-col bg-[#0d0d0d] overflow-hidden z-20 absolute left-[64px] top-0 bottom-0 h-full shadow-2xl">
                <div className="h-16 border-b border-[#262626] flex items-center px-4 gap-2 cursor-pointer hover:bg-[#141414] transition-colors min-w-[256px]">
                    <span className="font-bold text-sm whitespace-nowrap lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white leading-none">
                        {currentOrg?.name || "Initializing..."}
                    </span>
                    <span className="text-[10px] border border-[#262626] px-1 rounded text-[#3ecf8e] bg-[#3ecf8e]/10 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-4 flex items-center uppercase font-bold tracking-tighter">
                        PRO
                    </span>
                    <ChevronDown size={14} className="ml-auto text-gray-500 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                <div className="p-2 space-y-1 overflow-y-auto flex-1 min-w-[256px] custom-scrollbar">
                    <NavItem label="Project Overview" icon={<LayoutGrid size={18} />} href={currentProject ? `/projects/${currentProject.slug}` : "/projects"} exact />

                    <div className="mt-6 mb-2 px-3 flex items-center justify-between group-hover:opacity-100 h-4">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Projects</span>
                        <Plus
                            size={12}
                            onClick={(e) => { e.stopPropagation(); setIsCreatingProject(true); }}
                            className="text-gray-500 hover:text-[#3ecf8e] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                    </div>

                    <div className="space-y-0.5 mb-4 group-hover:opacity-100 opacity-0 transition-opacity">
                        {projects.map(proj => (
                            <div
                                key={proj.id}
                                onClick={() => handleSelectProject(proj)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-[13px] transition-all cursor-pointer flex items-center gap-2 group/proj",
                                    currentProject?.id === proj.id ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "text-gray-500 hover:text-gray-300 hover:bg-[#111]"
                                )}
                            >
                                <div className={cn("w-1.5 h-1.5 rounded-full", currentProject?.id === proj.id ? "bg-[#3ecf8e] shadow-[0_0_8px_#3ecf8e]" : "bg-gray-700")} />
                                <span className="truncate">{proj.name}</span>
                            </div>
                        ))}
                    </div>

                    {currentOrg && currentProject && (
                        <>
                            <div className="flex items-center justify-between group-hover:opacity-100 mt-4 mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 h-4">
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">Database Architecture</span>
                            </div>
                            <NavItem label="Table Editor" icon={<Table size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/data-studio`} />
                            <NavItem label="SQL Editor" icon={<Code size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/sql`} />
                            <NavItem label="RLS Policies" icon={<Shield size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/database/policies`} />
                            <NavItem label="Data Health" icon={<Database size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/database`} />

                            <div className="h-4 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 mt-4 mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3">Identity & Access</div>
                            <NavItem label="Authentication" icon={<ShieldCheck size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/auth`} />
                            <NavItem label="Permissions" icon={<ShieldAlert size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/permissions`} />
                            <NavItem label="Storage" icon={<HardDrive size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/storage`} />

                            <div className="h-4 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 mt-4 mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3">Edge Compute</div>
                            <NavItem label="Serverless Functions" icon={<Cpu size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/functions`} />
                            <NavItem label="Database Webhooks" icon={<Zap size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/webhooks`} />
                            <NavItem label="Realtime Engine" icon={<PieChart size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/realtime`} />

                            <div className="h-4 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 mt-4 mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3">Protocol Gateway</div>
                            <NavItem label="API Documentation" icon={<FileText size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/api-docs`} />
                            <NavItem label="MCP Server" icon={<Cpu size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/api-docs/mcp`} />
                            <NavItem label="Project Settings" icon={<Settings size={18} />} href={`/${currentOrg.name}/projects/${currentProject.slug}/settings`} />
                        </>
                    )}
                </div>
            </aside>
            <div className="w-14 flex-shrink-0" />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-[#262626] flex items-center justify-between px-8 bg-[#080808]">
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 font-bold uppercase tracking-widest">
                        <span className="text-gray-400">Org</span>
                        <ChevronDown size={10} className="-rotate-90 pointer-events-none opacity-40" />
                        <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">{currentOrg?.name || "..."}</span>
                        {currentProject && (
                            <>
                                <ChevronDown size={12} className="-rotate-90 pointer-events-none text-white mx-1 font-bold" />
                                <span className="text-[#3ecf8e] font-bold">{currentProject.name}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 mr-4 font-mono text-[10px] text-gray-500">
                            <span className="text-gray-700">ID: {(user as any).identity_id?.substring(0, 8)}...</span>
                            <div className="w-px h-3 bg-[#222]" />
                            <span className="text-[#3ecf8e]">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414] border border-[#262626]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                            <span className="text-[9px] font-bold text-[#3ecf8e]">QUANTUM_SYNC</span>
                        </div>
                        <button className="p-2 text-gray-600 hover:text-white transition-colors"><Bell size={18} /></button>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3ecf8e] to-[#3b82f6] shadow-lg border border-white/10 flex items-center justify-center text-[10px] font-bold text-black uppercase">
                            {user?.name ? user.name.substring(0, 1) : "A"}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto bg-[#0d0d0d] relative p-0">
                    {!currentProject ? (
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
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Initialize Your Vectabase</h2>
                                    <p className="text-gray-500 text-sm leading-relaxed">
                                        You are currently in <strong>{currentOrg?.name}</strong>. Create a new project to unlock the SQL Editor, Database management, and Auth services.
                                    </p>
                                </div>
                                <div className="pt-4 flex flex-col gap-3">
                                    <button
                                        onClick={() => setIsCreatingProject(true)}
                                        className="w-full h-12 bg-[#3ecf8e] text-black text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#34b27b] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(62,207,142,0.15)]"
                                    >
                                        <Plus size={16} /> Create Your First Project
                                    </button>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-700 font-bold uppercase tracking-widest justify-center">
                                        <Lock size={10} /> Select a project to begin
                                    </div>
                                </div>

                                {projects.length > 0 && (
                                    <div className="pt-10 space-y-4 text-left relative">
                                        <div className="h-px bg-gradient-to-r from-transparent via-[#222] to-transparent w-full mb-8" />
                                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] mb-6 text-center">Existing Database Instances</p>

                                        <div className="space-y-4 relative pl-8">
                                            {/* The Vertical Line Connecting Projects */}
                                            <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-[#3ecf8e]/40 via-[#222] to-transparent" />

                                            {projects.map(p => (
                                                <div key={p.id} className="relative group">
                                                    {/* The Horizontal Line Connector */}
                                                    <div className="absolute -left-5 top-1/2 w-5 h-px bg-[#3ecf8e]/40 border-t border-[#3ecf8e]/20" />

                                                    <button
                                                        onClick={() => setCurrentProject(p)}
                                                        className="w-full px-5 py-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl text-[13px] text-gray-400 hover:text-[#3ecf8e] hover:border-[#3ecf8e]/30 hover:bg-[#3ecf8e]/5 transition-all flex items-center justify-between group shadow-xl"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-gray-800 group-hover:bg-[#3ecf8e] transition-colors" />
                                                            <span className="font-mono tracking-tight">{p.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Select Node</span>
                                                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                                                        </div>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        children
                    )}

                    {/* Create Org Modal Overlay */}
                    {isCreatingOrg && (
                        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="w-full max-w-sm bg-[#0d0d0d] border border-[#262626] rounded-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Create Organization</h3>
                                <input
                                    autoFocus
                                    value={newOrgName}
                                    onChange={e => setNewOrgName(e.target.value)}
                                    placeholder="Enter organization name..."
                                    className="w-full bg-black border border-[#262626] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                />
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setIsCreatingOrg(false)} className="flex-1 h-9 rounded-lg bg-[#111] text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Cancel</button>
                                    <button onClick={handleCreateOrg} className="flex-1 h-9 rounded-lg bg-[#3ecf8e] text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#34b27b] transition-colors">Create</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Create Project Modal Overlay */}
                    {isCreatingProject && (
                        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="w-full max-w-sm bg-[#0d0d0d] border border-[#262626] rounded-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Create New Project</h3>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">In Organization: {currentOrg?.name}</p>
                                <input
                                    autoFocus
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                    placeholder="Enter project name..."
                                    className="w-full bg-black border border-[#262626] rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                />
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setIsCreatingProject(false)} className="flex-1 h-9 rounded-lg bg-[#111] text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Cancel</button>
                                    <button onClick={handleCreateProject} className="flex-1 h-9 rounded-lg bg-[#3ecf8e] text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#34b27b] transition-colors">Create</button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}


function NavItem({ label, icon, href, exact, disabled }: any) {
    const pathname = usePathname();
    const isActive = exact ? pathname === href : pathname.startsWith(href);

    if (disabled) {
        return (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-700 cursor-not-allowed whitespace-nowrap overflow-hidden group/item relative">
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-40">{icon}</div>
                <span className="text-sm font-medium lg:opacity-0 group-hover:opacity-100 transition-opacity duration-300 opacity-40">{label}</span>
                <Lock size={10} className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-800" />
            </div>
        );
    }

    return (
        <Link href={href}>
            <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all whitespace-nowrap overflow-hidden group/item",
                isActive ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20" : "text-gray-500 hover:bg-[#111] hover:text-white"
            )}>
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center transition-transform group-hover/item:scale-110">{icon}</div>
                <span className="text-sm font-medium lg:opacity-0 group-hover:opacity-100 transition-opacity duration-300">{label}</span>
            </div>
        </Link>
    );
}
