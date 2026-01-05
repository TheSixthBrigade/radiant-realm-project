import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import GlowingLogo from "@/components/GlowingLogo";
import { SEO, BreadcrumbSchema } from "@/components/SEO";
import { 
  Shield, Users, Trash2, Copy, Check,
  LayoutDashboard, Search, Filter, Plus,
  UserPlus, Clock, CheckCircle, XCircle,
  Package, ChevronDown, Key, X, Loader2
} from "lucide-react";
import { toast } from "sonner";

// Types from Supabase
type WhitelistSystem = {
  id: string;
  name: string;
  product_id: string | null;
  description: string | null;
  created_at: string | null;
  user_id: string;
};

type WhitelistUser = {
  id: string;
  whitelist_id: string;
  username: string;
  discord_id: string | null;
  roblox_id: string | null;
  license_key: string;
  status: string | null;
  added_at: string | null;
  expires_at: string | null;
  banned_at: string | null;
  ban_reason: string | null;
};

// Animated gradient canvas component
const GradientCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;
    let time = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    
    const animate = () => {
      time += 0.002;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const offset1 = (Math.sin(time * 0.8) + 1) / 2;
      const offset2 = (Math.sin(time * 0.8 + 2) + 1) / 2;
      // Dark greys with visible green accents
      gradient.addColorStop(0, `hsl(160, 20%, ${6 + Math.sin(time) * 2}%)`);
      gradient.addColorStop(0.2, `hsl(155, 25%, ${10 + Math.sin(time + 1) * 2}%)`);
      gradient.addColorStop(offset1 * 0.2 + 0.35, `hsl(${152 + Math.sin(time) * 8}, ${35 + Math.sin(time) * 10}%, ${16 + Math.sin(time) * 4}%)`);
      gradient.addColorStop(0.55, `hsl(${155 + Math.sin(time + 2) * 10}, ${25 + Math.sin(time) * 8}%, ${14 + Math.sin(time) * 3}%)`);
      gradient.addColorStop(offset2 * 0.15 + 0.7, `hsl(160, 15%, ${9 + Math.sin(time + 3) * 2}%)`);
      gradient.addColorStop(1, `hsl(155, 20%, ${5 + Math.sin(time + 4) * 2}%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Flowing waves with prominent green
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x += 6) {
          const y = canvas.height * (0.35 + i * 0.12) + Math.sin(x * 0.002 + time * 1.5 + i * 0.8) * 100 + Math.sin(x * 0.004 + time * 1.2 + i * 1.2) * 50 + Math.cos(x * 0.001 + time + i) * 70;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        const alpha = 0.12 - i * 0.02;
        ctx.fillStyle = i % 2 === 0 ? `rgba(34, 197, 94, ${alpha})` : `rgba(16, 185, 129, ${alpha})`;
        ctx.fill();
      }
      // Glowing green orbs
      for (let i = 0; i < 50; i++) {
        const x = (Math.sin(time * 0.3 + i * 47) + 1) / 2 * canvas.width;
        const y = (Math.cos(time * 0.2 + i * 31) + 1) / 2 * canvas.height;
        const size = 2 + Math.sin(time + i) * 1.5;
        const alpha = 0.25 + Math.sin(time * 2 + i) * 0.15;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = i % 4 === 0 ? `rgba(34, 197, 94, ${alpha})` : i % 4 === 1 ? `rgba(16, 185, 129, ${alpha})` : i % 4 === 2 ? `rgba(52, 211, 153, ${alpha})` : `rgba(100, 116, 139, ${alpha * 0.5})`;
        ctx.fill();
      }
      // Green glow in corner
      const glowGradient = ctx.createRadialGradient(canvas.width * 0.1, canvas.height * 0.9, 0, canvas.width * 0.1, canvas.height * 0.9, canvas.width * 0.5);
      glowGradient.addColorStop(0, `rgba(34, 197, 94, ${0.15 + Math.sin(time) * 0.05})`);
      glowGradient.addColorStop(0.5, `rgba(16, 185, 129, ${0.05 + Math.sin(time + 1) * 0.02})`);
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />;
};

const DeveloperWhitelist = () => {
  const { user } = useAuth();
  const [whitelists, setWhitelists] = useState<WhitelistSystem[]>([]);
  const [whitelistUsers, setWhitelistUsers] = useState<Record<string, WhitelistUser[]>>({});
  const [selectedWhitelist, setSelectedWhitelist] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showCreateWhitelistModal, setShowCreateWhitelistModal] = useState(false);
  const [showWhitelistDropdown, setShowWhitelistDropdown] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDiscordId, setNewDiscordId] = useState('');
  const [newRobloxId, setNewRobloxId] = useState('');
  const [newLicenseKey, setNewLicenseKey] = useState('');
  const [newWhitelistName, setNewWhitelistName] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch whitelists from Supabase
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchWhitelists();
  }, [user]);

  const fetchWhitelists = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('whitelist_systems')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) { toast.error('Failed to load whitelists'); console.error(error); }
    else { setWhitelists(data || []); if (data && data.length > 0 && !selectedWhitelist) setSelectedWhitelist(data[0].id); }
    setLoading(false);
  };

  // Fetch users for selected whitelist
  useEffect(() => {
    if (selectedWhitelist) fetchWhitelistUsers(selectedWhitelist);
  }, [selectedWhitelist]);

  const fetchWhitelistUsers = async (whitelistId: string) => {
    const { data, error } = await supabase
      .from('whitelist_users')
      .select('*')
      .eq('whitelist_id', whitelistId)
      .order('added_at', { ascending: false });
    
    if (error) { toast.error('Failed to load users'); console.error(error); }
    else { setWhitelistUsers(prev => ({ ...prev, [whitelistId]: data || [] })); }
  };

  const currentUsers = selectedWhitelist ? (whitelistUsers[selectedWhitelist] || []) : [];
  const currentWhitelist = whitelists.find(w => w.id === selectedWhitelist);
  const filteredUsers = currentUsers.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.discord_id || '').includes(searchQuery) || (u.roblox_id || '').includes(searchQuery) ||
      u.license_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || u.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const generateLicenseKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const key = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    ).join('-');
    setNewLicenseKey(key);
  };

  const handleCreateWhitelist = async () => {
    if (!newWhitelistName.trim()) { toast.error('Please enter a whitelist name'); return; }
    if (!user) { toast.error('Please sign in'); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from('whitelist_systems')
      .insert({ name: newWhitelistName, user_id: user.id })
      .select()
      .single();
    
    if (error) { toast.error('Failed to create whitelist'); console.error(error); }
    else { setWhitelists([data, ...whitelists]); setSelectedWhitelist(data.id); toast.success('Whitelist created!'); }
    setNewWhitelistName('');
    setShowCreateWhitelistModal(false);
    setSaving(false);
  };

  const handleAddUser = async () => {
    if (!selectedWhitelist) { toast.error('Please select a whitelist first'); return; }
    if (!newUsername.trim()) { toast.error('Please enter a username'); return; }
    setSaving(true);
    const licenseKey = newLicenseKey || `VB-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from('whitelist_users')
      .insert({
        whitelist_id: selectedWhitelist,
        username: newUsername,
        discord_id: newDiscordId || null,
        roblox_id: newRobloxId || null,
        license_key: licenseKey,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) { toast.error('Failed to add user'); console.error(error); }
    else {
      setWhitelistUsers(prev => ({ ...prev, [selectedWhitelist]: [data, ...(prev[selectedWhitelist] || [])] }));
      toast.success('User added to whitelist!');
    }
    setNewUsername(''); setNewDiscordId(''); setNewRobloxId(''); setNewLicenseKey('');
    setShowAddUserModal(false);
    setSaving(false);
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedWhitelist) return;
    const { error } = await supabase.from('whitelist_users').delete().eq('id', userId);
    if (error) { toast.error('Failed to remove user'); console.error(error); }
    else {
      setWhitelistUsers(prev => ({ ...prev, [selectedWhitelist]: prev[selectedWhitelist].filter(u => u.id !== userId) }));
      toast.success('User removed');
    }
  };

  const handleToggleBan = async (userId: string) => {
    if (!selectedWhitelist) return;
    const targetUser = currentUsers.find(u => u.id === userId);
    if (!targetUser) return;
    const newStatus = targetUser.status === 'banned' ? 'active' : 'banned';
    
    const { error } = await supabase
      .from('whitelist_users')
      .update({ status: newStatus, banned_at: newStatus === 'banned' ? new Date().toISOString() : null })
      .eq('id', userId);
    
    if (error) { toast.error('Failed to update user'); console.error(error); }
    else {
      setWhitelistUsers(prev => ({
        ...prev,
        [selectedWhitelist]: prev[selectedWhitelist].map(u => u.id === userId ? { ...u, status: newStatus } : u)
      }));
      toast.success(newStatus === 'banned' ? 'User banned' : 'User unbanned');
    }
  };

  const handleDeleteWhitelist = async (whitelistId: string) => {
    const { error } = await supabase.from('whitelist_systems').delete().eq('id', whitelistId);
    if (error) { toast.error('Failed to delete whitelist'); console.error(error); }
    else {
      setWhitelists(whitelists.filter(w => w.id !== whitelistId));
      if (selectedWhitelist === whitelistId) {
        const remaining = whitelists.filter(w => w.id !== whitelistId);
        setSelectedWhitelist(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success('Whitelist deleted');
    }
  };

  const handleCopy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); toast.success('Copied!'); };
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'expired': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'banned': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-white/60 bg-white/10 border-white/10';
    }
  };
  const getStatusIcon = (status: string | null) => { switch (status) { case 'active': return CheckCircle; case 'expired': return Clock; case 'banned': return XCircle; default: return Clock; } };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <GradientCanvas />
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px]" style={{ zIndex: 1 }} />
        <div className="relative flex items-center justify-center min-h-screen" style={{ zIndex: 2 }}>
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SEO 
        title="Whitelist Management"
        description="Manage user access to your scripts with the Vectabase whitelist system. Control licenses, HWID locks, Discord authentication, and real-time user tracking."
        url="/developer/whitelist"
        keywords="whitelist system, license management, HWID lock, Discord authentication, script access control, user management"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: '/' },
        { name: 'Developer', url: '/developer' },
        { name: 'Whitelist', url: '/developer/whitelist' }
      ]} />
      <GradientCanvas />
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px]" style={{ zIndex: 1 }} />
      <div className="relative" style={{ zIndex: 2 }}>
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to="/developer"><GlowingLogo size="sm" showText={false} /></Link>
                <div className="hidden sm:flex items-center">
                  <span className="text-white/60 mx-2">/</span>
                  <Link to="/developer" className="text-white/60 hover:text-white">Developer</Link>
                  <span className="text-white/60 mx-2">/</span>
                  <span className="text-white font-semibold">Whitelist</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {user ? (
                  <Button asChild size="sm" className="bg-white text-black hover:bg-white/90 rounded-full px-4">
                    <Link to="/dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" className="bg-white text-black hover:bg-white/90 rounded-full px-4">
                    <Link to="/auth?mode=register">Sign Up Free</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="pt-20 pb-10 min-h-screen">
          <div className="container mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-2">
                  <Shield className="w-3 h-3 text-white" />
                  <span className="text-xs text-white">Whitelist Manager</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Whitelist Systems</h1>
                <p className="text-white/60 text-sm mt-1">Manage multiple whitelists for your products</p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => setShowCreateWhitelistModal(true)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Plus className="w-4 h-4 mr-2" />New Whitelist
                </Button>
                {selectedWhitelist && (
                  <Button onClick={() => setShowAddUserModal(true)} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                    <UserPlus className="w-4 h-4 mr-2" />Add User
                  </Button>
                )}
              </div>
            </div>

            {/* Not signed in */}
            {!user && (
              <div className="rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 p-12 text-center">
                <Shield className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Sign In Required</h3>
                <p className="text-white/50 mb-6 max-w-md mx-auto">Please sign in to manage your whitelist systems.</p>
                <Button asChild className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                  <Link to="/auth?mode=login">Sign In</Link>
                </Button>
              </div>
            )}

            {/* Whitelist Selector */}
            {user && whitelists.length > 0 && (
              <div className="mb-6">
                <div className="relative inline-block">
                  <button onClick={() => setShowWhitelistDropdown(!showWhitelistDropdown)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors">
                    <Package className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">{currentWhitelist?.name || 'Select Whitelist'}</span>
                    <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${showWhitelistDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showWhitelistDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-white/10 shadow-xl overflow-hidden z-50">
                      {whitelists.map(w => (
                        <div key={w.id} className={`flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer ${selectedWhitelist === w.id ? 'bg-white/10' : ''}`}>
                          <div className="flex-1" onClick={() => { setSelectedWhitelist(w.id); setShowWhitelistDropdown(false); }}>
                            <div className="text-white font-medium">{w.name}</div>
                            <div className="text-xs text-white/50">{(whitelistUsers[w.id] || []).length} users</div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteWhitelist(w.id); }} className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {user && whitelists.length === 0 && (
              <div className="rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 p-12 text-center">
                <Package className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Whitelist Systems</h3>
                <p className="text-white/50 mb-6 max-w-md mx-auto">Create your first whitelist system to start managing user access for your products.</p>
                <Button onClick={() => setShowCreateWhitelistModal(true)} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />Create Whitelist
                </Button>
              </div>
            )}

            {/* Stats */}
            {user && selectedWhitelist && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Users', value: currentUsers.length, icon: Users },
                  { label: 'Active', value: currentUsers.filter(u => u.status === 'active').length, icon: CheckCircle },
                  { label: 'Expired', value: currentUsers.filter(u => u.status === 'expired').length, icon: Clock },
                  { label: 'Banned', value: currentUsers.filter(u => u.status === 'banned').length, icon: XCircle },
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center"><stat.icon className="w-5 h-5 text-white/60" /></div>
                      <div><div className="text-2xl font-bold text-white">{stat.value}</div><div className="text-xs text-white/50">{stat.label}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search & Filter */}
            {user && selectedWhitelist && (
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input type="text" placeholder="Search by username, Discord ID, Roblox ID, or license key..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30" />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-white/40" />
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:border-white/30 cursor-pointer">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>
            )}

            {/* Users Table */}
            {user && selectedWhitelist && (
              <div className="rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 overflow-hidden">
                <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 border-b border-white/10 text-xs text-white/50 font-medium uppercase tracking-wider">
                  <div className="col-span-2">Username</div>
                  <div className="col-span-2">Discord ID</div>
                  <div className="col-span-2">Roblox ID</div>
                  <div className="col-span-3">License Key</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                      <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                      <p className="text-white/40">{currentUsers.length === 0 ? 'No users in this whitelist yet' : 'No users match your search'}</p>
                      {currentUsers.length === 0 && (
                        <Button onClick={() => setShowAddUserModal(true)} variant="ghost" className="mt-4 text-green-400 hover:text-green-300 hover:bg-green-400/10">
                          <UserPlus className="w-4 h-4 mr-2" />Add First User
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const StatusIcon = getStatusIcon(u.status);
                      return (
                        <div key={u.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-4 py-4 hover:bg-white/5 transition-colors">
                          <div className="lg:col-span-2 flex items-center gap-2">
                            <span className="lg:hidden text-xs text-white/40 w-20">Username:</span>
                            <span className="text-sm text-white font-medium">{u.username}</span>
                          </div>
                          <div className="lg:col-span-2 flex items-center gap-2">
                            <span className="lg:hidden text-xs text-white/40 w-20">Discord:</span>
                            <code className="text-sm text-white/70 font-mono">{u.discord_id || '-'}</code>
                          </div>
                          <div className="lg:col-span-2 flex items-center gap-2">
                            <span className="lg:hidden text-xs text-white/40 w-20">Roblox:</span>
                            <code className="text-sm text-white/70 font-mono">{u.roblox_id || '-'}</code>
                          </div>
                          <div className="lg:col-span-3 flex items-center gap-2">
                            <span className="lg:hidden text-xs text-white/40 w-20">License:</span>
                            <code className="text-sm text-green-400/80 font-mono truncate">{u.license_key}</code>
                            <button onClick={() => handleCopy(u.license_key, `key-${u.id}`)} className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0">
                              {copied === `key-${u.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-white/40" />}
                            </button>
                          </div>
                          <div className="lg:col-span-1 flex items-center">
                            <span className="lg:hidden text-xs text-white/40 w-20 mr-2">Status:</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(u.status)}`}>
                              <StatusIcon className="w-3 h-3" />
                              <span className="hidden sm:inline">{(u.status || 'active').charAt(0).toUpperCase() + (u.status || 'active').slice(1)}</span>
                            </span>
                          </div>
                          <div className="lg:col-span-2 flex items-center justify-end gap-1">
                            <button onClick={() => handleToggleBan(u.id)} className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${u.status === 'banned' ? 'text-green-400' : 'text-white/40 hover:text-yellow-400'}`} title={u.status === 'banned' ? 'Unban' : 'Ban'}>
                              <Shield className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleRemoveUser(u.id)} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-red-400" title="Remove">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Whitelist Modal */}
        {showCreateWhitelistModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateWhitelistModal(false)} />
            <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6">
              <button onClick={() => setShowCreateWhitelistModal(false)} className="absolute top-4 right-4 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center"><Package className="w-5 h-5 text-green-400" /></div>
                <div><h3 className="text-lg font-bold text-white">Create Whitelist</h3><p className="text-sm text-white/50">Create a new whitelist for a product</p></div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Whitelist Name *</label>
                  <input type="text" value={newWhitelistName} onChange={(e) => setNewWhitelistName(e.target.value)} placeholder="e.g., My Script Pro" className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-green-500/50" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowCreateWhitelistModal(false)} className="flex-1 text-white/60 hover:text-white hover:bg-white/10">Cancel</Button>
                <Button onClick={handleCreateWhitelist} disabled={saving} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Create
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddUserModal(false)} />
            <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6">
              <button onClick={() => setShowAddUserModal(false)} className="absolute top-4 right-4 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center"><UserPlus className="w-5 h-5 text-green-400" /></div>
                <div><h3 className="text-lg font-bold text-white">Add User</h3><p className="text-sm text-white/50">Add to {currentWhitelist?.name}</p></div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Username / Nickname *</label>
                  <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter username" className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-green-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Discord ID</label>
                  <input type="text" value={newDiscordId} onChange={(e) => setNewDiscordId(e.target.value)} placeholder="e.g., 123456789012345678" className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-green-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Roblox ID</label>
                  <input type="text" value={newRobloxId} onChange={(e) => setNewRobloxId(e.target.value)} placeholder="e.g., 12345678" className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-green-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">License Key</label>
                  <div className="flex gap-2">
                    <input type="text" value={newLicenseKey} onChange={(e) => setNewLicenseKey(e.target.value)} placeholder="Auto-generated if empty" className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-green-500/50 font-mono" />
                    <Button type="button" variant="outline" onClick={generateLicenseKey} className="border-white/20 text-white hover:bg-white/10 px-3"><Key className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowAddUserModal(false)} className="flex-1 text-white/60 hover:text-white hover:bg-white/10">Cancel</Button>
                <Button onClick={handleAddUser} disabled={saving} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}Add User
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="py-8 border-t border-white/10">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2"><img src="/Logo_pic.png" alt="Vectabase" className="w-6 h-6 object-contain" /><span className="text-white font-medium text-sm">Vectabase Developer</span></div>
              <p className="text-white/40 text-xs">© {new Date().getFullYear()} Vectabase</p>
              <div className="flex items-center gap-4">
                <Link to="/" className="text-white/50 hover:text-white text-xs transition-colors">Home</Link>
                <Link to="/developer" className="text-white/50 hover:text-white text-xs transition-colors">Developer</Link>
                <Link to="/shop" className="text-white/50 hover:text-white text-xs transition-colors">Marketplace</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DeveloperWhitelist;
