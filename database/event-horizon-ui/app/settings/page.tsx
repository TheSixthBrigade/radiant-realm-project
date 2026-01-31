"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { 
    User, 
    Mail, 
    Shield, 
    Key, 
    Bell, 
    Palette, 
    LogOut, 
    Save, 
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    Loader2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AccountSettingsPage() {
    const { user, loading } = useUser();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications">("profile");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Profile form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    
    // Security form state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
        }
    }, [user]);

    const handleSignOut = () => {
        document.cookie = 'pqc_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'lattice_admin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/login';
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            
            if (res.ok) {
                setSuccess("Profile updated successfully");
            } else {
                const data = await res.json();
                setError(data.error || "Failed to update profile");
            }
        } catch (e) {
            setError("Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        
        setSaving(true);
        setError(null);
        setSuccess(null);
        
        try {
            const res = await fetch('/api/user/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            
            if (res.ok) {
                setSuccess("Password changed successfully");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                const data = await res.json();
                setError(data.error || "Failed to change password");
            }
        } catch (e) {
            setError("Network error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#3ecf8e]" size={32} />
            </div>
        );
    }

    if (!user) {
        router.push('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white">
            {/* Header */}
            <header className="h-16 border-b border-[#262626] flex items-center px-6 bg-[#080808]">
                <Link href="/" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={18} />
                    <span className="text-sm font-medium">Back to Dashboard</span>
                </Link>
                <div className="ml-auto flex items-center gap-4">
                    <span className="text-sm text-gray-500">{user.email}</span>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                    >
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold mb-2">Account Settings</h1>
                    <p className="text-gray-500 text-sm">Manage your account preferences and security</p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 flex items-center gap-2 p-4 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-lg text-[#3ecf8e] text-sm">
                        <CheckCircle size={16} />
                        {success}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 mb-8 p-1 bg-[#111] rounded-xl border border-[#262626]">
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            activeTab === "profile" 
                                ? "bg-[#1a1a1a] text-white" 
                                : "text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <User size={14} />
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab("security")}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            activeTab === "security" 
                                ? "bg-[#1a1a1a] text-white" 
                                : "text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <Shield size={14} />
                        Security
                    </button>
                    <button
                        onClick={() => setActiveTab("notifications")}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                            activeTab === "notifications" 
                                ? "bg-[#1a1a1a] text-white" 
                                : "text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <Bell size={14} />
                        Notifications
                    </button>
                </div>

                {/* Profile Tab */}
                {activeTab === "profile" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="p-6 bg-[#111] border border-[#262626] rounded-xl space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#3ecf8e] to-[#3b82f6] flex items-center justify-center text-2xl font-bold text-black">
                                    {name ? name.substring(0, 1).toUpperCase() : "?"}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">{name || "No name set"}</h3>
                                    <p className="text-gray-500 text-sm">{email}</p>
                                </div>
                            </div>
                            
                            <div className="h-px bg-[#262626]" />
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        disabled
                                        className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                                    />
                                    <p className="text-[10px] text-gray-600 mt-1">Email cannot be changed</p>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-[#3ecf8e] text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#34b27b] transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === "security" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="p-6 bg-[#111] border border-[#262626] rounded-xl space-y-6">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest mb-1">Change Password</h3>
                                <p className="text-gray-500 text-xs">Update your password to keep your account secure</p>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                        placeholder="Enter current password"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                        placeholder="Min 8 characters"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#3ecf8e] transition-all"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>
                            
                            <button
                                onClick={handleChangePassword}
                                disabled={saving || !currentPassword || !newPassword}
                                className="flex items-center gap-2 px-6 py-3 bg-[#3ecf8e] text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#34b27b] transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                                Update Password
                            </button>
                        </div>
                        
                        <div className="p-6 bg-[#111] border border-[#262626] rounded-xl space-y-4">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest mb-1">Active Sessions</h3>
                                <p className="text-gray-500 text-xs">Manage your active login sessions</p>
                            </div>
                            <div className="p-4 bg-[#0d0d0d] border border-[#262626] rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-[#3ecf8e]" />
                                    <div>
                                        <p className="text-sm font-medium">Current Session</p>
                                        <p className="text-[10px] text-gray-500">This device</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-[#3ecf8e] font-bold uppercase">Active</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="p-6 bg-[#111] border border-[#262626] rounded-xl space-y-6">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest mb-1">Email Notifications</h3>
                                <p className="text-gray-500 text-xs">Choose what updates you want to receive</p>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-4 bg-[#0d0d0d] border border-[#262626] rounded-lg cursor-pointer hover:border-[#3a3a3a] transition-colors">
                                    <div>
                                        <p className="text-sm font-medium">Security Alerts</p>
                                        <p className="text-[10px] text-gray-500">Get notified about security events</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#3ecf8e]" />
                                </label>
                                <label className="flex items-center justify-between p-4 bg-[#0d0d0d] border border-[#262626] rounded-lg cursor-pointer hover:border-[#3a3a3a] transition-colors">
                                    <div>
                                        <p className="text-sm font-medium">Product Updates</p>
                                        <p className="text-[10px] text-gray-500">New features and improvements</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#3ecf8e]" />
                                </label>
                                <label className="flex items-center justify-between p-4 bg-[#0d0d0d] border border-[#262626] rounded-lg cursor-pointer hover:border-[#3a3a3a] transition-colors">
                                    <div>
                                        <p className="text-sm font-medium">Usage Reports</p>
                                        <p className="text-[10px] text-gray-500">Weekly database usage summaries</p>
                                    </div>
                                    <input type="checkbox" className="w-4 h-4 accent-[#3ecf8e]" />
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Danger Zone */}
                <div className="mt-12 p-6 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">Danger Zone</h3>
                    <p className="text-gray-500 text-xs mb-4">Irreversible actions for your account</p>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                    >
                        <LogOut size={14} />
                        Sign Out of All Devices
                    </button>
                </div>
            </div>
        </div>
    );
}
