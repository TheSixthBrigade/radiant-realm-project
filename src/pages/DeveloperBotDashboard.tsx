import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import GlowingLogo from "@/components/GlowingLogo";
import { 
  Bot, Shield, Users, Settings, Plus, Trash2, Save, X,
  LayoutDashboard, Server, Key, UserCheck, RefreshCw, Link2
} from "lucide-react";
import { toast } from "sonner";

// Animated gradient canvas
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
      gradient.addColorStop(0, `hsl(160, 20%, ${6 + Math.sin(time) * 2}%)`);
      gradient.addColorStop(0.3, `hsl(155, 25%, ${10 + Math.sin(time + 1) * 2}%)`);
      gradient.addColorStop(0.6, `hsl(${152 + Math.sin(time) * 8}, ${30 + Math.sin(time) * 10}%, ${14 + Math.sin(time) * 3}%)`);
      gradient.addColorStop(1, `hsl(155, 20%, ${5 + Math.sin(time + 4) * 2}%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 30; i++) {
        const x = (Math.sin(time * 0.3 + i * 47) + 1) / 2 * canvas.width;
        const y = (Math.cos(time * 0.2 + i * 31) + 1) / 2 * canvas.height;
        const size = 2 + Math.sin(time + i) * 1.5;
        const alpha = 0.2 + Math.sin(time * 2 + i) * 0.1;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />;
};

interface Product {
  id: string;
  name: string;
  roblox_group_id: string;
  payhip_api_key: string;
  role_id?: string;
  redemption_message?: string;
  whitelisted_count?: number;
}

interface DiscordServer {
  id: string;
  guild_id: string;
  guild_name: string;
  guild_icon?: string;
  member_count: number;
  is_configured: boolean;
  user_id?: string;
  products: Product[];
}

interface CommandPermission {
  command_name: string;
  allowed_role_ids: string[];
  require_admin: boolean;
  enabled: boolean;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

interface WhitelistedUser {
  id: string;
  discord_id: string;
  discord_username?: string;
  roblox_id?: string;
  roblox_username?: string;
  redeemed_at: string;
}

const BOT_INVITE_URL = "https://discord.com/oauth2/authorize?client_id=1452697259463540816&permissions=402688000&integration_type=0&scope=bot";
const DISCORD_CLIENT_ID = "1452697259463540816";
const SUPABASE_URL = "https://cmmeqzkbiiqqfvzkmkzt.supabase.co";

// Build OAuth URL dynamically based on current origin
const getDiscordOAuthUrl = () => {
  const redirectUri = encodeURIComponent(window.location.origin + "/developer/bot");
  return `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&scope=guilds+identify`;
};

// Commands that server admins can configure permissions for
const CONFIGURABLE_COMMANDS = [
  { name: 'admin-product-add', description: 'Add a new product' },
  { name: 'admin-product-remove', description: 'Remove a product' },
  { name: 'admin-product-list', description: 'List all products' },
  { name: 'admin-product-edit', description: 'Edit a product' },
  { name: 'admin-whitelist-list', description: 'View whitelisted users' },
  { name: 'admin-whitelist-add', description: 'Manually add user to whitelist' },
  { name: 'admin-whitelist-remove', description: 'Remove user from whitelist' },
  { name: 'admin-config-copy', description: 'Copy config from another server' },
];

// Skeleton component for smooth loading
const StatSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 w-12 bg-white/10 rounded mb-1" />
  </div>
);

// Cache key for localStorage
const CACHE_KEY = 'bot_dashboard_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  servers: DiscordServer[];
  timestamp: number;
}

const getCachedData = (userId: string): CachedData | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}_${userId}`);
    if (!cached) return null;
    const data = JSON.parse(cached) as CachedData;
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

const setCachedData = (userId: string, servers: DiscordServer[]) => {
  try {
    localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
      servers,
      timestamp: Date.now()
    }));
  } catch { /* ignore */ }
};

// Get initial state from cache synchronously
const getInitialState = (userId: string | undefined) => {
  if (!userId) return { servers: [], selectedServer: null, hasCache: false };
  const cached = getCachedData(userId);
  if (cached && cached.servers.length > 0) {
    return { 
      servers: cached.servers, 
      selectedServer: cached.servers[0], 
      hasCache: true 
    };
  }
  return { servers: [], selectedServer: null, hasCache: false };
};

const DeveloperBotDashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Initialize from cache synchronously to avoid blank flash
  const initialState = getInitialState(user?.id);
  
  const [servers, setServers] = useState<DiscordServer[]>(initialState.servers);
  const [selectedServer, setSelectedServer] = useState<DiscordServer | null>(initialState.selectedServer);
  const [isLoading, setIsLoading] = useState(!initialState.hasCache); // Only show loading if no cache
  const [isRefreshing, setIsRefreshing] = useState(initialState.hasCache); // Start refreshing if we have cache
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [whitelistedUsers, setWhitelistedUsers] = useState<WhitelistedUser[]>([]);
  const [loadingWhitelist, setLoadingWhitelist] = useState(false);
  const [permissions, setPermissions] = useState<CommandPermission[]>([]);
  const [discordLinked, setDiscordLinked] = useState(false);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [needsRelink, setNeedsRelink] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    roblox_group_id: '',
    payhip_api_key: '',
    role_id: '',
    redemption_message: ''
  });

  // Handle Discord OAuth callback
  useEffect(() => {
    const handleDiscordCallback = async () => {
      const code = searchParams.get('code');
      
      // Skip if no code or already processed
      if (!code || !user) return;
      
      // Check if we already have this code processed (prevent double processing)
      const processedCode = sessionStorage.getItem('discord_oauth_code');
      if (processedCode === code) {
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }
      
      setIsLoading(true);
      try {
        // Mark code as being processed
        sessionStorage.setItem('discord_oauth_code', code);
        
        // Use edge function to exchange code for token (keeps client secret secure)
        const redirectUri = window.location.origin + "/developer/bot";
        const response = await fetch(`${SUPABASE_URL}/functions/v1/discord-oauth/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
          }),
        });

        // Clear URL params immediately
        window.history.replaceState({}, '', window.location.pathname);

        if (!response.ok) {
          const errorData = await response.json();
          // Don't show error if Discord is already linked - just reload servers
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('discord_id, discord_username')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.discord_id) {
            setDiscordLinked(true);
            setDiscordUsername(profile.discord_username);
            await loadAllServers();
            return;
          }
          throw new Error(errorData.error || 'Failed to exchange code for token');
        }

        const data = await response.json();
        const discordUser = data.user;
        const guilds: DiscordGuild[] = data.guilds;
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token;
        const expiresIn = data.expires_in;

        // Calculate expiry time
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Save Discord info to profile (including tokens for permission verification)
        await (supabase as any)
          .from('profiles')
          .update({
            discord_id: discordUser.id,
            discord_username: discordUser.username,
            discord_access_token: accessToken,
            discord_refresh_token: refreshToken,
            discord_token_expires_at: expiresAt
          })
          .eq('user_id', user.id);

        setDiscordLinked(true);
        setDiscordUsername(discordUser.username);

        toast.success(`Discord linked as ${discordUser.username}!`);

        // Load servers with the new guild data
        await loadServersWithGuilds(guilds);
      } catch (error: any) {
        console.error('Discord OAuth error:', error);
        // Only show error if not already linked
        if (!discordLinked) {
          toast.error('Failed to link Discord. Please try again.');
        }
        setIsLoading(false);
      }
    };

    handleDiscordCallback();
  }, [searchParams, user]);

  // Check if Discord is already linked
  useEffect(() => {
    const checkDiscordLink = async () => {
      if (!user) return;
      
      const { data: profile, error } = await (supabase as any)
        .from('profiles')
        .select('discord_id, discord_username')
        .eq('user_id', user.id)
        .single();
      
      console.log('[Bot Dashboard] Check Discord link - Profile:', profile, 'Error:', error);
      
      if (profile?.discord_id) {
        setDiscordLinked(true);
        setDiscordUsername(profile.discord_username);
      }
    };
    
    checkDiscordLink();
  }, [user]);

  // Load servers using BOT token (Dyno approach) - no user OAuth refresh needed
  // This is called after user has linked Discord at least once
  const loadAllServers = async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      // Get user's Discord ID from profile
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('discord_id, discord_username')
        .eq('user_id', user.id)
        .single();
      
      console.log('[Bot Dashboard] loadAllServers - Profile:', profile?.discord_id ? 'found' : 'not found');
      
      if (!profile?.discord_id) {
        // User hasn't linked Discord yet - they need to do initial OAuth
        setDiscordLinked(false);
        setIsLoading(false);
        return;
      }
      
      setDiscordLinked(true);
      setDiscordUsername(profile.discord_username);
      
      // Use the new bot-based endpoint to get servers
      // This uses the BOT token to check permissions, not user's OAuth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/discord-oauth/bot-servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.needsLink) {
          // User needs to link Discord (first time)
          setDiscordLinked(false);
        }
        console.error('[Bot Dashboard] Bot-servers error:', errorData);
        setServers([]);
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      const serversData = data.servers || [];
      
      console.log('[Bot Dashboard] Servers found via bot token:', serversData.length);
      
      if (serversData.length === 0) {
        setServers([]);
        setNeedsRelink(false); // Don't nag - bot just isn't in any servers user admins
        setIsLoading(false);
        return;
      }
      
      // Fetch products for servers
      const serverIds = serversData.map((s: any) => s.id);
      
      const { data: productsData } = await (supabase as any)
        .from('bot_products')
        .select('*')
        .in('server_id', serverIds);
      
      // Fetch whitelist counts by roblox_group_id (shared across copied configs)
      // Group products by roblox_group_id to count unique whitelisted users
      const groupIdToProducts: Record<string, string[]> = {};
      (productsData || []).forEach((p: any) => {
        if (!groupIdToProducts[p.roblox_group_id]) {
          groupIdToProducts[p.roblox_group_id] = [];
        }
        groupIdToProducts[p.roblox_group_id].push(p.id);
      });
      
      // Get all unique roblox_group_ids
      const uniqueGroupIds = Object.keys(groupIdToProducts);
      
      // For each group, count unique whitelisted users
      let whitelistCountsByGroup: Record<string, number> = {};
      
      if (uniqueGroupIds.length > 0) {
        // Get all products for these group IDs (including from other servers)
        const { data: allGroupProducts } = await (supabase as any)
          .from('bot_products')
          .select('id, roblox_group_id')
          .in('roblox_group_id', uniqueGroupIds);
        
        // Group all product IDs by roblox_group_id
        const allProductIdsByGroup: Record<string, string[]> = {};
        (allGroupProducts || []).forEach((p: any) => {
          if (!allProductIdsByGroup[p.roblox_group_id]) {
            allProductIdsByGroup[p.roblox_group_id] = [];
          }
          allProductIdsByGroup[p.roblox_group_id].push(p.id);
        });
        
        // Count unique users per group
        for (const groupId of uniqueGroupIds) {
          const productIdsForGroup = allProductIdsByGroup[groupId] || [];
          if (productIdsForGroup.length > 0) {
            const { data: users } = await (supabase as any)
              .from('bot_whitelisted_users')
              .select('discord_id')
              .in('product_id', productIdsForGroup);
            
            // Count unique discord_ids
            const uniqueDiscordIds = new Set((users || []).map((u: any) => u.discord_id));
            whitelistCountsByGroup[groupId] = uniqueDiscordIds.size;
          }
        }
      }
      
      // Format servers - use group-based counts
      const formattedServers: DiscordServer[] = serversData.map((server: any) => ({
        id: server.id,
        guild_id: server.guild_id,
        guild_name: server.guild_name || 'Unknown Server',
        guild_icon: server.guild_icon,
        member_count: server.member_count || 0,
        is_configured: server.is_configured || false,
        user_id: server.user_id,
        products: (productsData || [])
          .filter((p: any) => p.server_id === server.id)
          .map((p: any) => ({
            ...p,
            whitelisted_count: whitelistCountsByGroup[p.roblox_group_id] || 0
          }))
      }));
      
      setServers(formattedServers);
      setCachedData(user.id, formattedServers); // Cache the data
      setNeedsRelink(false); // Never need to re-link with bot-based approach
      if (formattedServers.length > 0 && !selectedServer) {
        setSelectedServer(formattedServers[0]);
      } else if (selectedServer) {
        // Update selected server with fresh data
        const updated = formattedServers.find(s => s.id === selectedServer.id);
        if (updated) setSelectedServer(updated);
      }
    } catch (error: any) {
      console.error('Error loading servers:', error);
      if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
        toast.error('Failed to load servers');
      }
      setServers([]);
    }
    
    setIsLoading(false);
    setIsRefreshing(false);
  };

  // Load servers that match user's Discord guilds
  const loadServersWithGuilds = async (guilds: DiscordGuild[]) => {
    if (!user || guilds.length === 0) {
      // If no guilds, try loading all servers
      await loadAllServers();
      return;
    }
    setIsLoading(true);
    setNeedsRelink(false); // Fresh OAuth means we have valid permissions
    
    try {
      // Filter guilds where user is OWNER or has ADMINISTRATOR permission (0x8)
      const ADMINISTRATOR_PERMISSION = BigInt(0x8);
      
      const adminGuilds = guilds.filter(g => {
        if (g.owner) {
          console.log(`[Bot Dashboard OAuth] ${g.name}: User is OWNER`);
          return true;
        }
        
        const permissions = BigInt(g.permissions || '0');
        const hasAdmin = (permissions & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;
        
        console.log(`[Bot Dashboard OAuth] ${g.name}: permissions=${g.permissions}, hasAdmin=${hasAdmin}`);
        
        return hasAdmin;
      });
      
      const adminGuildIds = adminGuilds.map(g => g.id);
      console.log('[Bot Dashboard OAuth] Admin guilds:', adminGuilds.map(g => g.name));
      
      // Cache the admin guild IDs for future refreshes (avoids re-auth)
      localStorage.setItem(`discord_admin_guilds_${user.id}`, JSON.stringify(adminGuildIds));
      localStorage.setItem(`discord_admin_guilds_time_${user.id}`, Date.now().toString());
      
      if (adminGuildIds.length === 0) {
        // No admin guilds, try loading all servers
        await loadAllServers();
        return;
      }
      
      // Fetch bot's servers that match user's admin guilds
      const { data: serversData, error: serversError } = await (supabase as any)
        .from('discord_servers')
        .select('*')
        .in('guild_id', adminGuildIds);
      
      if (serversError) {
        if (serversError.code === '42P01' || serversError.message?.includes('does not exist')) {
          setServers([]);
          setIsLoading(false);
          return;
        }
        throw serversError;
      }
      
      if (!serversData || serversData.length === 0) {
        setServers([]);
        setIsLoading(false);
        return;
      }
      
      // Auto-claim servers for this user if not already claimed
      for (const server of serversData) {
        if (!server.user_id) {
          await (supabase as any)
            .from('discord_servers')
            .update({ user_id: user.id, is_configured: true })
            .eq('id', server.id);
        }
      }
      
      // Fetch products
      const serverIds = serversData.map((s: any) => s.id);
      const { data: productsData } = await (supabase as any)
        .from('bot_products')
        .select('*')
        .in('server_id', serverIds);
      
      // Fetch whitelist counts by roblox_group_id (shared across copied configs)
      const groupIdToProducts2: Record<string, string[]> = {};
      (productsData || []).forEach((p: any) => {
        if (!groupIdToProducts2[p.roblox_group_id]) {
          groupIdToProducts2[p.roblox_group_id] = [];
        }
        groupIdToProducts2[p.roblox_group_id].push(p.id);
      });
      
      const uniqueGroupIds2 = Object.keys(groupIdToProducts2);
      let whitelistCountsByGroup2: Record<string, number> = {};
      
      if (uniqueGroupIds2.length > 0) {
        const { data: allGroupProducts2 } = await (supabase as any)
          .from('bot_products')
          .select('id, roblox_group_id')
          .in('roblox_group_id', uniqueGroupIds2);
        
        const allProductIdsByGroup2: Record<string, string[]> = {};
        (allGroupProducts2 || []).forEach((p: any) => {
          if (!allProductIdsByGroup2[p.roblox_group_id]) {
            allProductIdsByGroup2[p.roblox_group_id] = [];
          }
          allProductIdsByGroup2[p.roblox_group_id].push(p.id);
        });
        
        for (const groupId of uniqueGroupIds2) {
          const productIdsForGroup = allProductIdsByGroup2[groupId] || [];
          if (productIdsForGroup.length > 0) {
            const { data: users } = await (supabase as any)
              .from('bot_whitelisted_users')
              .select('discord_id')
              .in('product_id', productIdsForGroup);
            
            const uniqueDiscordIds = new Set((users || []).map((u: any) => u.discord_id));
            whitelistCountsByGroup2[groupId] = uniqueDiscordIds.size;
          }
        }
      }
      
      // Combine with Discord guild info for better names/icons
      const formattedServers: DiscordServer[] = serversData.map((server: any) => {
        const discordGuild = adminGuilds.find(g => g.id === server.guild_id);
        return {
          id: server.id,
          guild_id: server.guild_id,
          guild_name: discordGuild?.name || server.guild_name || 'Unknown Server',
          guild_icon: discordGuild?.icon 
            ? `https://cdn.discordapp.com/icons/${server.guild_id}/${discordGuild.icon}.png`
            : server.guild_icon,
          member_count: server.member_count || 0,
          is_configured: true,
          user_id: user.id,
          products: (productsData || [])
            .filter((p: any) => p.server_id === server.id)
            .map((p: any) => ({
              ...p,
              whitelisted_count: whitelistCountsByGroup2[p.roblox_group_id] || 0
            }))
        };
      });
      
      setServers(formattedServers);
      setCachedData(user.id, formattedServers); // Cache the data
      if (formattedServers.length > 0 && !selectedServer) {
        setSelectedServer(formattedServers[0]);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
      toast.error('Failed to load servers');
    }
    
    setIsLoading(false);
    setIsRefreshing(false);
  };

  // Load servers from database
  useEffect(() => {
    const loadServers = async () => {
      if (!user) return;
      
      // Skip if there's a code in the URL (OAuth callback will handle it)
      const code = searchParams.get('code');
      if (code) return;
      
      // Check if we have cached data - if so, do background refresh
      const cached = getCachedData(user.id);
      const isBackground = cached && cached.servers.length > 0;
      
      // Load all servers (background if we have cache)
      await loadAllServers(isBackground);
    };
    
    loadServers();
  }, [user, searchParams]);

  // Load permissions when server changes
  useEffect(() => {
    const loadPermissions = async () => {
      if (!selectedServer) return;
      
      try {
        const { data, error } = await (supabase as any)
          .from('bot_command_permissions')
          .select('*')
          .eq('server_id', selectedServer.id);
        
        if (error) throw error;
        
        // Initialize with defaults if no permissions exist
        const existingPerms = data || [];
        const allPerms = CONFIGURABLE_COMMANDS.map(cmd => {
          const existing = existingPerms.find((p: any) => p.command_name === cmd.name);
          return existing || {
            command_name: cmd.name,
            allowed_role_ids: [],
            require_admin: true,
            enabled: true
          };
        });
        
        setPermissions(allPerms);
      } catch (error) {
        console.error('Error loading permissions:', error);
      }
    };
    
    loadPermissions();
  }, [selectedServer]);

  const handleAddProduct = async () => {
    if (!selectedServer || !newProduct.name || !newProduct.roblox_group_id || !newProduct.payhip_api_key) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const { data, error } = await (supabase as any)
        .from('bot_products')
        .insert({
          server_id: selectedServer.id,
          name: newProduct.name,
          roblox_group_id: newProduct.roblox_group_id,
          payhip_api_key: newProduct.payhip_api_key,
          role_id: newProduct.role_id || null,
          redemption_message: newProduct.redemption_message || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      const updatedServer = {
        ...selectedServer,
        products: [...selectedServer.products, { ...data, whitelisted_count: 0 }]
      };
      setSelectedServer(updatedServer);
      setServers(servers.map(s => s.id === selectedServer.id ? updatedServer : s));
      
      toast.success(`Product "${newProduct.name}" added!`);
      setShowAddProduct(false);
      setNewProduct({ name: '', roblox_group_id: '', payhip_api_key: '', role_id: '', redemption_message: '' });
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error(error.message || 'Failed to add product');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!selectedServer) return;
    
    try {
      const { error } = await (supabase as any)
        .from('bot_products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
      
      // Update local state
      const updatedServer = {
        ...selectedServer,
        products: selectedServer.products.filter(p => p.id !== productId)
      };
      setSelectedServer(updatedServer);
      setServers(servers.map(s => s.id === selectedServer.id ? updatedServer : s));
      
      toast.success('Product deleted');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleViewProductDetails = async (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
    setLoadingWhitelist(true);
    
    try {
      // First get ALL products with the same roblox_group_id
      // This ensures copied configs share the same whitelist
      const { data: allProducts, error: productsError } = await (supabase as any)
        .from('bot_products')
        .select('id')
        .eq('roblox_group_id', product.roblox_group_id);
      
      if (productsError) throw productsError;
      
      const productIds = (allProducts || []).map((p: any) => p.id);
      
      // Fetch whitelisted users for ALL products with this roblox_group_id
      const { data, error } = await (supabase as any)
        .from('bot_whitelisted_users')
        .select('*')
        .in('product_id', productIds)
        .order('redeemed_at', { ascending: false });
      
      if (error) throw error;
      
      // Deduplicate by discord_id (same user might be in multiple products)
      const uniqueUsers: WhitelistedUser[] = [];
      const seenDiscordIds = new Set<string>();
      for (const user of (data || [])) {
        if (!seenDiscordIds.has(user.discord_id)) {
          seenDiscordIds.add(user.discord_id);
          uniqueUsers.push(user);
        }
      }
      
      setWhitelistedUsers(uniqueUsers);
    } catch (error) {
      console.error('Error loading whitelisted users:', error);
      toast.error('Failed to load whitelisted users');
      setWhitelistedUsers([]);
    }
    
    setLoadingWhitelist(false);
  };

  const handleSavePermissions = async () => {
    if (!selectedServer) return;
    
    try {
      // Upsert all permissions
      for (const perm of permissions) {
        const { error } = await (supabase as any)
          .from('bot_command_permissions')
          .upsert({
            server_id: selectedServer.id,
            command_name: perm.command_name,
            allowed_role_ids: perm.allowed_role_ids,
            require_admin: perm.require_admin,
            enabled: perm.enabled
          }, {
            onConflict: 'server_id,command_name'
          });
        
        if (error) throw error;
      }
      
      toast.success('Permissions saved!');
      setShowPermissions(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    }
  };

  const refreshServers = async () => {
    if (!user || isRefreshing) return;
    await loadAllServers(true); // Background refresh
    toast.success('Refreshed!');
  };

  // Force re-link Discord - clears stored token and redirects to OAuth
  const forceRelinkDiscord = async () => {
    if (!user) return;
    
    try {
      // Clear the stored Discord access token
      await (supabase as any)
        .from('profiles')
        .update({ discord_access_token: null })
        .eq('user_id', user.id);
      
      // Clear session storage and localStorage cache
      sessionStorage.removeItem('discord_oauth_code');
      localStorage.removeItem(`discord_admin_guilds_${user.id}`);
      localStorage.removeItem(`discord_admin_guilds_time_${user.id}`);
      
      toast.info('Redirecting to Discord...');
      
      // Redirect to Discord OAuth
      window.location.href = getDiscordOAuthUrl();
    } catch (error) {
      console.error('Error clearing Discord token:', error);
      toast.error('Failed to re-link Discord');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <GradientCanvas />
        <div className="fixed inset-0 bg-black/30" style={{ zIndex: 1 }} />
        <div className="relative flex items-center justify-center min-h-screen" style={{ zIndex: 2 }}>
          <div className="text-center p-8 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10">
            <Bot className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Sign In Required</h2>
            <p className="text-white/60 mb-6">Please sign in to access the bot dashboard.</p>
            <Button asChild className="bg-white text-black hover:bg-white/90">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <GradientCanvas />
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px]" style={{ zIndex: 1 }} />
      
      <div className="relative" style={{ zIndex: 2 }}>
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GlowingLogo size="sm" showText={false} />
                <div className="hidden sm:flex items-center">
                  <span className="text-white/60 mx-2">/</span>
                  <Link to="/developer" className="text-white/60 hover:text-white">Developer</Link>
                  <span className="text-white/60 mx-2">/</span>
                  <span className="text-white font-semibold">Bot Dashboard</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={refreshServers}
                  disabled={isRefreshing}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button asChild size="sm" className="bg-white text-black hover:bg-white/90 rounded-full px-4">
                  <Link to="/dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="pt-20 pb-10 min-h-screen">
          <div className="container mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4">
                    <Bot className="w-4 h-4 text-white" />
                    <span className="text-sm text-white">Whitelist Bot</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Bot Dashboard</h1>
                  <p className="text-white/60">Manage your whitelist bot across all your Discord servers.</p>
                </div>
                <Button 
                  onClick={() => window.open(BOT_INVITE_URL, '_blank')}
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Bot to Server
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Server List Sidebar */}
              <div className="lg:col-span-1">
                <div className="p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4" /> Your Servers
                  </h3>
                  
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : !discordLinked ? (
                    <div className="text-center py-8">
                      <Link2 className="w-10 h-10 text-white/20 mx-auto mb-2" />
                      <p className="text-white/40 text-sm mb-2">Link your Discord</p>
                      <p className="text-white/30 text-xs mb-4">Connect Discord to see servers where you're an admin</p>
                      <Button 
                        size="sm" 
                        className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
                        onClick={() => window.location.href = getDiscordOAuthUrl()}
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        Link Discord
                      </Button>
                    </div>
                  ) : servers.length === 0 ? (
                    <div className="text-center py-8">
                      <Server className="w-10 h-10 text-white/20 mx-auto mb-2" />
                      <p className="text-white/40 text-sm mb-2">No servers found</p>
                      <p className="text-white/30 text-xs mb-4">Add the bot to a server, then click refresh</p>
                      <div className="space-y-2">
                        <Button 
                          size="sm" 
                          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
                          onClick={() => window.open(BOT_INVITE_URL, '_blank')}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add Bot to Server
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10"
                          onClick={refreshServers}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                        </Button>
                      </div>
                      {discordUsername && (
                        <p className="text-white/30 text-xs mt-4">
                          Linked as <span className="text-green-400">{discordUsername}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {servers.map(server => (
                        <div
                          key={server.id}
                          className={`w-full rounded-lg transition-all ${
                            selectedServer?.id === server.id
                              ? 'bg-white text-black'
                              : 'bg-white/5 hover:bg-white/10 text-white'
                          }`}
                        >
                          <button
                            onClick={() => setSelectedServer(server)}
                            className="w-full flex items-center gap-3 p-3"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                              selectedServer?.id === server.id ? 'bg-black/10' : 'bg-white/10'
                            }`}>
                              {server.guild_icon ? (
                                <img src={server.guild_icon} alt="" className="w-full h-full rounded-lg" />
                              ) : (
                                server.guild_name.charAt(0)
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm truncate">{server.guild_name}</p>
                              <p className={`text-xs ${selectedServer?.id === server.id ? 'text-black/60' : 'text-white/40'}`}>
                                {server.products.length} products
                              </p>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${selectedServer?.id === server.id ? 'bg-green-600' : 'bg-green-400'}`} />
                          </button>
                        </div>
                      ))}
                      
                      {/* Re-link Discord - only show when user has no servers */}
                      {needsRelink && servers.length === 0 && (
                        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                          <p className="text-yellow-400 text-xs mb-2">Link Discord to see your servers.</p>
                          <Button 
                            size="sm" 
                            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs"
                            onClick={forceRelinkDiscord}
                          >
                            Link Discord
                          </Button>
                        </div>
                      )}
                      
                      {/* Show linked status and option to add new servers */}
                      {discordLinked && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-white/30 text-xs mb-2 text-center">
                            Linked as <span className="text-green-400">{discordUsername}</span>
                          </p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full border-white/10 text-white/50 hover:text-white hover:bg-white/5 text-xs"
                            onClick={forceRelinkDiscord}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Add New Server
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3 space-y-6">
                {selectedServer ? (
                  <>
                    {/* Server Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                        <Users className="w-5 h-5 text-green-400 mb-2" />
                        {isLoading && !selectedServer.member_count ? (
                          <div className="h-8 w-12 bg-white/10 rounded animate-pulse mb-1" />
                        ) : (
                          <p className="text-2xl font-bold text-white">{selectedServer.member_count}</p>
                        )}
                        <p className="text-xs text-white/40">Members</p>
                      </div>
                      <div className="p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                        <Shield className="w-5 h-5 text-green-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{selectedServer.products.length}</p>
                        <p className="text-xs text-white/40">Products</p>
                      </div>
                      <div className="p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                        <UserCheck className="w-5 h-5 text-green-400 mb-2" />
                        {isRefreshing ? (
                          <p className="text-2xl font-bold text-white">
                            {selectedServer.products.reduce((sum, p) => sum + (p.whitelisted_count || 0), 0)}
                          </p>
                        ) : (
                          <p className="text-2xl font-bold text-white">
                            {selectedServer.products.reduce((sum, p) => sum + (p.whitelisted_count || 0), 0)}
                          </p>
                        )}
                        <p className="text-xs text-white/40">Whitelisted</p>
                      </div>
                      <div className="p-4 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                        <Settings className="w-5 h-5 text-green-400 mb-2" />
                        <button 
                          onClick={() => setShowPermissions(true)}
                          className="text-sm text-green-400 hover:text-green-300 underline"
                        >
                          Permissions
                        </button>
                        <p className="text-xs text-white/40">Configure</p>
                      </div>
                    </div>

                    {/* Products Section */}
                    <div className="p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Key className="w-5 h-5" /> Products
                        </h3>
                        <Button 
                          size="sm" 
                          onClick={() => setShowAddProduct(true)}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add Product
                        </Button>
                      </div>

                      {selectedServer.products.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                          <Shield className="w-12 h-12 text-white/20 mx-auto mb-3" />
                          <p className="text-white/60 mb-2">No products configured</p>
                          <p className="text-white/40 text-sm mb-4">Add a product to start accepting whitelist redemptions.</p>
                          <Button 
                            size="sm" 
                            onClick={() => setShowAddProduct(true)}
                            className="bg-white/10 hover:bg-white/20 text-white"
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add Your First Product
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedServer.products.map(product => (
                            <div 
                              key={product.id}
                              onClick={() => handleViewProductDetails(product)}
                              className="p-4 rounded-lg bg-black/30 border border-white/10 hover:border-green-500/50 hover:bg-black/40 transition-all cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-white">{product.name}</h4>
                                    {product.role_id && (
                                      <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                                        Role Assigned
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-white/40 text-xs">Group ID</p>
                                      <p className="text-white/80 font-mono">{product.roblox_group_id}</p>
                                    </div>
                                    <div>
                                      <p className="text-white/40 text-xs">API Key</p>
                                      <p className="text-white/80 font-mono">****{product.payhip_api_key.slice(-4)}</p>
                                    </div>
                                    <div>
                                      <p className="text-white/40 text-xs">Whitelisted</p>
                                      <p className="text-green-400 font-semibold">{product.whitelisted_count || 0}</p>
                                    </div>
                                  </div>
                                  <p className="text-white/30 text-xs mt-2">Click to view whitelisted users</p>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProduct(product.id);
                                  }}
                                  className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bot Commands Reference */}
                    <div className="p-6 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10">
                      <h3 className="text-lg font-semibold text-white mb-4">Bot Commands</h3>
                      
                      {/* User Commands */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-white/60 mb-3">User Commands</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                            <code className="text-green-400">/redeem</code>
                            <p className="text-white/50 text-xs mt-1">Users redeem their license key</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                            <code className="text-green-400">/update</code>
                            <p className="text-white/50 text-xs mt-1">Update Roblox username</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Admin Commands */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-white/60 mb-3">Admin Commands (Configurable)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="p-3 rounded-lg bg-black/30 border border-green-500/20">
                            <code className="text-green-400">/admin-product-add</code>
                            <p className="text-white/50 text-xs mt-1">Add a new product</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/30 border border-green-500/20">
                            <code className="text-green-400">/admin-product-list</code>
                            <p className="text-white/50 text-xs mt-1">List all products</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/30 border border-green-500/20">
                            <code className="text-green-400">/admin-whitelist-list</code>
                            <p className="text-white/50 text-xs mt-1">View whitelisted users</p>
                          </div>
                          <div className="p-3 rounded-lg bg-black/30 border border-green-500/20">
                            <code className="text-green-400">/admin-whitelist-add</code>
                            <p className="text-white/50 text-xs mt-1">Manually whitelist a user</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <Server className="w-16 h-16 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">Select a server to manage</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add Product Modal */}
            {showAddProduct && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-lg p-6 rounded-2xl bg-[#1a1a1a] border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Add Product</h3>
                    <button onClick={() => setShowAddProduct(false)} className="p-2 rounded-lg hover:bg-white/10">
                      <X className="w-5 h-5 text-white/60" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-1">Product Name *</label>
                      <input
                        type="text"
                        value={newProduct.name}
                        onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                        placeholder="e.g., Premium Script Pack"
                        className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1">Roblox Group ID *</label>
                      <input
                        type="text"
                        value={newProduct.roblox_group_id}
                        onChange={e => setNewProduct({ ...newProduct, roblox_group_id: e.target.value })}
                        placeholder="e.g., 5451777"
                        className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1">Payhip API Key *</label>
                      <input
                        type="text"
                        value={newProduct.payhip_api_key}
                        onChange={e => setNewProduct({ ...newProduct, payhip_api_key: e.target.value })}
                        placeholder="prod_sk_..."
                        className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1">Discord Role ID (optional)</label>
                      <input
                        type="text"
                        value={newProduct.role_id}
                        onChange={e => setNewProduct({ ...newProduct, role_id: e.target.value })}
                        placeholder="Role to assign on redemption"
                        className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1">Redemption Message (optional)</label>
                      <textarea
                        value={newProduct.redemption_message}
                        onChange={e => setNewProduct({ ...newProduct, redemption_message: e.target.value })}
                        placeholder="Message shown after successful redemption"
                        rows={2}
                        className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500 resize-none"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <Button 
                      onClick={() => setShowAddProduct(false)}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddProduct}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Product
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Permissions Modal */}
            {showPermissions && selectedServer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 rounded-2xl bg-[#1a1a1a] border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5" /> Command Permissions
                    </h3>
                    <button onClick={() => setShowPermissions(false)} className="p-2 rounded-lg hover:bg-white/10">
                      <X className="w-5 h-5 text-white/60" />
                    </button>
                  </div>
                  
                  <p className="text-white/60 text-sm mb-6">
                    Configure which roles can use admin commands in <span className="text-white font-medium">{selectedServer.guild_name}</span>.
                  </p>
                  
                  {/* Configurable Commands */}
                  <div className="space-y-4">
                    {permissions.map((perm, idx) => {
                      const cmdInfo = CONFIGURABLE_COMMANDS.find(c => c.name === perm.command_name);
                      return (
                        <div key={perm.command_name} className="p-4 rounded-lg bg-black/30 border border-white/10">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-green-400 text-sm">/{perm.command_name}</code>
                                <button
                                  onClick={() => {
                                    const updated = [...permissions];
                                    updated[idx] = { ...perm, enabled: !perm.enabled };
                                    setPermissions(updated);
                                  }}
                                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                                    perm.enabled 
                                      ? 'bg-green-500/20 text-green-400' 
                                      : 'bg-white/10 text-white/40'
                                  }`}
                                >
                                  {perm.enabled ? 'Enabled' : 'Disabled'}
                                </button>
                              </div>
                              <p className="text-white/50 text-xs">{cmdInfo?.description}</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 text-xs text-white/60">
                                <input
                                  type="checkbox"
                                  checked={perm.require_admin}
                                  onChange={e => {
                                    const updated = [...permissions];
                                    updated[idx] = { ...perm, require_admin: e.target.checked };
                                    setPermissions(updated);
                                  }}
                                  className="rounded border-white/20 bg-black/50"
                                />
                                Require Admin
                              </label>
                            </div>
                          </div>
                          
                          {!perm.require_admin && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <label className="block text-xs text-white/40 mb-2">Allowed Role IDs (comma-separated)</label>
                              <input
                                type="text"
                                value={perm.allowed_role_ids.join(', ')}
                                onChange={e => {
                                  const updated = [...permissions];
                                  updated[idx] = { 
                                    ...perm, 
                                    allowed_role_ids: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                  };
                                  setPermissions(updated);
                                }}
                                placeholder="e.g., 123456789, 987654321"
                                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-green-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <Button 
                      onClick={() => setShowPermissions(false)}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSavePermissions}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Save className="w-4 h-4 mr-1" /> Save Permissions
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Product Detail Modal */}
            {showProductDetail && selectedProduct && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl bg-[#1a1a1a] border border-white/10">
                  <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-green-400" /> {selectedProduct.name}
                      </h3>
                      <p className="text-white/50 text-sm mt-1">
                        {whitelistedUsers.length} whitelisted user{whitelistedUsers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowProductDetail(false);
                        setSelectedProduct(null);
                        setWhitelistedUsers([]);
                      }} 
                      className="p-2 rounded-lg hover:bg-white/10"
                    >
                      <X className="w-5 h-5 text-white/60" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingWhitelist ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <RefreshCw className="w-8 h-8 text-green-400 animate-spin mx-auto mb-3" />
                          <p className="text-white/60">Loading whitelisted users...</p>
                        </div>
                      </div>
                    ) : whitelistedUsers.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                          <p className="text-white/60 mb-2">No whitelisted users yet</p>
                          <p className="text-white/40 text-sm">Users will appear here after redeeming their license keys.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="text-left py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Roblox User</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Discord User</th>
                              <th className="text-left py-3 px-4 text-xs font-medium text-white/50 uppercase tracking-wider">Redeemed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {whitelistedUsers.map(user => (
                              <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 px-4">
                                  <div>
                                    <p className="text-white font-medium">{user.roblox_username || 'Unknown'}</p>
                                    <p className="text-white/40 text-xs font-mono">{user.roblox_id || 'N/A'}</p>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div>
                                    <p className="text-white">{user.discord_username || 'Unknown'}</p>
                                    <p className="text-white/40 text-xs font-mono">{user.discord_id}</p>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <p className="text-white/70 text-sm">
                                    {new Date(user.redeemed_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white/40">
                        <span className="text-white/60">Group ID:</span> {selectedProduct.roblox_group_id}
                        {selectedProduct.role_id && (
                          <span className="ml-4"><span className="text-white/60">Role:</span> {selectedProduct.role_id}</span>
                        )}
                      </div>
                      <Button 
                        onClick={() => {
                          setShowProductDetail(false);
                          setSelectedProduct(null);
                          setWhitelistedUsers([]);
                        }}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperBotDashboard;
