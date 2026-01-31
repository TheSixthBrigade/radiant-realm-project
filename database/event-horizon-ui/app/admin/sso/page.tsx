"use client";

import { useState, useEffect } from "react";
import { Shield, Plus, Trash2, Edit2, Check, X, Globe, Building2, Users, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { useUser } from "@/hooks/useUser";

interface SSOConfig {
    id: number;
    domain: string;
    enabled: boolean;
    idp_type: string;
    idp_url?: string;
    auto_provision_users: boolean;
    default_role: string;
    allowed_project_ids?: number[];
    created_at: string;
    updated_at: string;
    created_by_email?: string;
}

interface Project {
    id: number;
    name: string;
    slug: string;
    org_name?: string;
}

export default function SSOManagementPage() {
    const { user, loading: userLoading } = useUser();
    const [configs, setConfigs] = useState<SSOConfig[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        domain: "",
        enabled: true,
        idp_type: "email",  // Default to email/password for non-Google domains
        idp_url: "",
        auto_provision_users: true,
        default_role: "Member",
        allowed_project_ids: [] as number[]
    });

    useEffect(() => {
        fetchConfigs();
        fetchAllProjects();
    }, []);

    const fetchConfigs = async () => {
        try {
            const res = await fetch("/api/admin/sso");
            if (res.ok) {
                const data = await res.json();
                setConfigs(data);
            } else if (res.status === 403) {
                setError("Lattice admin access required");
            }
        } catch (err) {
            setError("Failed to load SSO configurations");
        } finally {
            setLoading(false);
        }
    };

    const fetchAllProjects = async () => {
        try {
            // Fetch all orgs first
            const orgsRes = await fetch("/api/organizations");
            if (!orgsRes.ok) return;
            const orgs = await orgsRes.json();

            // Fetch projects for each org
            const allProjects: Project[] = [];
            for (const org of orgs) {
                const projRes = await fetch(`/api/projects?orgId=${org.id}`);
                if (projRes.ok) {
                    const projs = await projRes.json();
                    allProjects.push(...projs.map((p: any) => ({ ...p, org_name: org.name })));
                }
            }
            setProjects(allProjects);
        } catch (err) {
            console.error("Failed to fetch projects:", err);
        }
    };

    const handleCreate = async () => {
        setError(null);
        setSuccess(null);

        if (!formData.domain) {
            setError("Domain is required");
            return;
        }

        try {
            const res = await fetch("/api/admin/sso", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    allowed_project_ids: formData.allowed_project_ids.length > 0 ? formData.allowed_project_ids : null
                })
            });

            if (res.ok) {
                const newConfig = await res.json();
                setConfigs([...configs, newConfig]);
                setIsCreating(false);
                resetForm();
                setSuccess(`SSO configured for ${formData.domain}`);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to create SSO configuration");
            }
        } catch (err) {
            setError("Failed to create SSO configuration");
        }
    };

    const handleUpdate = async (id: number) => {
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/admin/sso", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    ...formData,
                    allowed_project_ids: formData.allowed_project_ids.length > 0 ? formData.allowed_project_ids : null
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setConfigs(configs.map(c => c.id === id ? { ...c, ...updated } : c));
                setEditingId(null);
                resetForm();
                setSuccess("SSO configuration updated");
            } else {
                const data = await res.json();
                setError(data.error || "Failed to update");
            }
        } catch (err) {
            setError("Failed to update SSO configuration");
        }
    };

    const handleDelete = async (id: number, domain: string) => {
        if (!confirm(`Delete SSO configuration for ${domain}?`)) return;

        try {
            const res = await fetch(`/api/admin/sso?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setConfigs(configs.filter(c => c.id !== id));
                setSuccess(`SSO configuration for ${domain} deleted`);
            }
        } catch (err) {
            setError("Failed to delete");
        }
    };

    const startEdit = (config: SSOConfig) => {
        setEditingId(config.id);
        setFormData({
            domain: config.domain,
            enabled: config.enabled,
            idp_type: config.idp_type,
            idp_url: config.idp_url || "",
            auto_provision_users: config.auto_provision_users,
            default_role: config.default_role,
            allowed_project_ids: config.allowed_project_ids || []
        });
    };

    const resetForm = () => {
        setFormData({
            domain: "",
            enabled: true,
            idp_type: "google",
            idp_url: "",
            auto_provision_users: true,
            default_role: "Member",
            allowed_project_ids: []
        });
    };

    const toggleProjectAccess = (projectId: number) => {
        setFormData(prev => ({
            ...prev,
            allowed_project_ids: prev.allowed_project_ids.includes(projectId)
                ? prev.allowed_project_ids.filter(id => id !== projectId)
                : [...prev.allowed_project_ids, projectId]
        }));
    };

    if (userLoading || loading) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-[#3ecf8e]/20 border-t-[#3ecf8e] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Enterprise SSO Management</h1>
                            <p className="text-gray-500 text-sm">Configure domain-based SSO access for projects</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setIsCreating(true); resetForm(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#3ecf8e] text-black font-bold text-sm rounded-lg hover:bg-[#34b27b] transition-colors"
                    >
                        <Plus size={16} /> Add SSO Domain
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                        <AlertCircle size={18} />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto"><X size={16} /></button>
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-4 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-lg text-[#3ecf8e]">
                        <CheckCircle size={18} />
                        {success}
                        <button onClick={() => setSuccess(null)} className="ml-auto"><X size={16} /></button>
                    </div>
                )}

                {/* Create Form */}
                {isCreating && (
                    <div className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Building2 size={20} className="text-blue-500" />
                            New SSO Configuration
                        </h3>
                        <SSOForm
                            formData={formData}
                            setFormData={setFormData}
                            projects={projects}
                            toggleProjectAccess={toggleProjectAccess}
                            onSave={handleCreate}
                            onCancel={() => { setIsCreating(false); resetForm(); }}
                        />
                    </div>
                )}

                {/* Configs List */}
                <div className="space-y-4">
                    {configs.length === 0 && !isCreating ? (
                        <div className="text-center py-16 text-gray-500">
                            <Globe size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No SSO configurations yet</p>
                            <p className="text-sm">Add a domain to enable Enterprise SSO login</p>
                        </div>
                    ) : (
                        configs.map(config => (
                            <div key={config.id} className="bg-[#111] border border-[#222] rounded-xl p-6">
                                {editingId === config.id ? (
                                    <SSOForm
                                        formData={formData}
                                        setFormData={setFormData}
                                        projects={projects}
                                        toggleProjectAccess={toggleProjectAccess}
                                        onSave={() => handleUpdate(config.id)}
                                        onCancel={() => { setEditingId(null); resetForm(); }}
                                    />
                                ) : (
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl font-bold">{config.domain}</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${config.enabled ? 'bg-[#3ecf8e]/20 text-[#3ecf8e]' : 'bg-gray-700 text-gray-400'}`}>
                                                    {config.enabled ? 'ENABLED' : 'DISABLED'}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 uppercase">
                                                    {config.idp_type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Users size={14} />
                                                    {config.auto_provision_users ? 'Auto-provision users' : 'Manual user creation'}
                                                </span>
                                                <span>Default role: {config.default_role}</span>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {config.allowed_project_ids && config.allowed_project_ids.length > 0 ? (
                                                    <span>Access to {config.allowed_project_ids.length} project(s)</span>
                                                ) : (
                                                    <span className="text-yellow-500">⚠️ No projects assigned - users won't have access</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => startEdit(config)}
                                                className="p-2 text-gray-500 hover:text-white hover:bg-[#222] rounded-lg transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(config.id, config.domain)}
                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function SSOForm({ formData, setFormData, projects, toggleProjectAccess, onSave, onCancel }: any) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Domain</label>
                    <input
                        type="text"
                        value={formData.domain}
                        onChange={e => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="company.com"
                        className="w-full bg-black border border-[#333] rounded-lg px-3 py-2 text-sm focus:border-[#3ecf8e] focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">IdP Type</label>
                    <select
                        value={formData.idp_type}
                        onChange={e => setFormData({ ...formData, idp_type: e.target.value })}
                        className="w-full bg-black border border-[#333] rounded-lg px-3 py-2 text-sm focus:border-[#3ecf8e] focus:outline-none"
                    >
                        <option value="email">Email/Password (Privateemail, etc.)</option>
                        <option value="google">Google Workspace</option>
                        <option value="saml">SAML 2.0</option>
                        <option value="oidc">OpenID Connect</option>
                    </select>
                    {formData.idp_type === 'email' && (
                        <p className="text-xs text-gray-500 mt-1">Users will set their password on first login</p>
                    )}
                </div>
            </div>

            {(formData.idp_type === 'saml' || formData.idp_type === 'oidc') && (
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">IdP URL</label>
                    <input
                        type="text"
                        value={formData.idp_url}
                        onChange={e => setFormData({ ...formData, idp_url: e.target.value })}
                        placeholder="https://idp.company.com/sso"
                        className="w-full bg-black border border-[#333] rounded-lg px-3 py-2 text-sm focus:border-[#3ecf8e] focus:outline-none"
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Default Role</label>
                    <select
                        value={formData.default_role}
                        onChange={e => setFormData({ ...formData, default_role: e.target.value })}
                        className="w-full bg-black border border-[#333] rounded-lg px-3 py-2 text-sm focus:border-[#3ecf8e] focus:outline-none"
                    >
                        <option value="Member">Member</option>
                        <option value="Developer">Developer</option>
                        <option value="Admin">Admin</option>
                    </select>
                </div>
                <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.enabled}
                            onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                            className="w-4 h-4 rounded border-[#333] bg-black text-[#3ecf8e] focus:ring-[#3ecf8e]"
                        />
                        <span className="text-sm">Enabled</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.auto_provision_users}
                            onChange={e => setFormData({ ...formData, auto_provision_users: e.target.checked })}
                            className="w-4 h-4 rounded border-[#333] bg-black text-[#3ecf8e] focus:ring-[#3ecf8e]"
                        />
                        <span className="text-sm">Auto-provision users</span>
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Project Access</label>
                <p className="text-xs text-gray-600 mb-2">Select which projects users from this domain can access</p>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-black/50 rounded-lg border border-[#222]">
                    {projects.map((project: any) => (
                        <label
                            key={project.id}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                formData.allowed_project_ids.includes(project.id)
                                    ? 'bg-[#3ecf8e]/10 border border-[#3ecf8e]/30'
                                    : 'bg-[#111] border border-[#222] hover:border-[#333]'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={formData.allowed_project_ids.includes(project.id)}
                                onChange={() => toggleProjectAccess(project.id)}
                                className="w-4 h-4 rounded border-[#333] bg-black text-[#3ecf8e] focus:ring-[#3ecf8e]"
                            />
                            <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{project.name}</div>
                                {project.org_name && (
                                    <div className="text-xs text-gray-600 truncate">{project.org_name}</div>
                                )}
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onSave}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3ecf8e] text-black font-bold text-sm rounded-lg hover:bg-[#34b27b] transition-colors"
                >
                    <Check size={16} /> Save
                </button>
            </div>
        </div>
    );
}
