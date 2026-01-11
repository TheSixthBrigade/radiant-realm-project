import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Key, Copy, RefreshCw, Ban, Check, Loader2,
  Shield, Monitor, Calendar, Search, X, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

interface LicenseKey {
  id: string;
  product_id: string;
  sale_id: string;
  user_id: string;
  key: string;
  status: 'active' | 'revoked' | 'expired';
  activations: number;
  max_activations?: number;
  expires_at?: string;
  created_at: string;
  product?: {
    title: string;
  };
  user?: {
    username?: string;
    email?: string;
  };
}

interface LicenseActivation {
  id: string;
  license_id: string;
  machine_id: string;
  ip_address?: string;
  activated_at: string;
  deactivated_at?: string;
}

interface LicenseKeyManagerProps {
  productId?: string; // If provided, show licenses for this product only
  mode: 'owner' | 'buyer';
}

export const LicenseKeyManager = ({ productId, mode }: LicenseKeyManagerProps) => {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLicense, setSelectedLicense] = useState<LicenseKey | null>(null);
  const [activations, setActivations] = useState<LicenseActivation[]>([]);
  const [loadingActivations, setLoadingActivations] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchLicenses();
    }
  }, [user, productId, mode]);

  const fetchLicenses = async () => {
    try {
      let query = (supabase as any)
        .from('license_keys')
        .select(`
          *,
          product:products(title),
          user:profiles!user_id(username, email)
        `)
        .order('created_at', { ascending: false });
      
      if (mode === 'owner') {
        // Get licenses for products owned by this user
        if (productId) {
          query = query.eq('product_id', productId);
        } else {
          // Get all products owned by user first
          const { data: products } = await (supabase as any)
            .from('products')
            .select('id')
            .eq('creator_id', user?.id);
          
          const productIds = products?.map((p: any) => p.id) || [];
          if (productIds.length > 0) {
            query = query.in('product_id', productIds);
          } else {
            setLicenses([]);
            setLoading(false);
            return;
          }
        }
      } else {
        // Buyer mode - get licenses owned by this user
        query = query.eq('user_id', user?.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setLicenses(data || []);
    } catch (e) {
      console.error('Error fetching licenses:', e);
    }
    setLoading(false);
  };

  const fetchActivations = async (licenseId: string) => {
    setLoadingActivations(true);
    try {
      const { data, error } = await (supabase as any)
        .from('license_activations')
        .select('*')
        .eq('license_id', licenseId)
        .order('activated_at', { ascending: false });
      
      if (error) throw error;
      setActivations(data || []);
    } catch (e) {
      console.error('Error fetching activations:', e);
    }
    setLoadingActivations(false);
  };

  const generateLicenseKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segments = [];
    for (let i = 0; i < 4; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    return segments.join('-');
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('License key copied!');
  };

  const toggleKeyVisibility = (licenseId: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(licenseId)) {
        next.delete(licenseId);
      } else {
        next.add(licenseId);
      }
      return next;
    });
  };

  const revokeLicense = async (licenseId: string) => {
    if (!confirm('Revoke this license? The user will no longer be able to use it.')) return;
    
    try {
      await (supabase as any)
        .from('license_keys')
        .update({ status: 'revoked' })
        .eq('id', licenseId);
      
      toast.success('License revoked');
      fetchLicenses();
    } catch (e) {
      toast.error('Failed to revoke license');
    }
  };

  const reactivateLicense = async (licenseId: string) => {
    try {
      await (supabase as any)
        .from('license_keys')
        .update({ status: 'active' })
        .eq('id', licenseId);
      
      toast.success('License reactivated');
      fetchLicenses();
    } catch (e) {
      toast.error('Failed to reactivate license');
    }
  };

  const regenerateLicense = async (licenseId: string) => {
    if (!confirm('Generate a new key? The old key will stop working.')) return;
    
    try {
      const newKey = generateLicenseKey();
      await (supabase as any)
        .from('license_keys')
        .update({ key: newKey, activations: 0 })
        .eq('id', licenseId);
      
      // Clear activations
      await (supabase as any)
        .from('license_activations')
        .delete()
        .eq('license_id', licenseId);
      
      toast.success('New license key generated');
      fetchLicenses();
    } catch (e) {
      toast.error('Failed to regenerate license');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const maskKey = (key: string) => {
    const parts = key.split('-');
    return parts.map((p, i) => i === 0 ? p : '****').join('-');
  };

  // Filter licenses
  const filteredLicenses = licenses.filter(license => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      license.key.toLowerCase().includes(query) ||
      license.product?.title?.toLowerCase().includes(query) ||
      license.user?.username?.toLowerCase().includes(query) ||
      license.user?.email?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-bold text-white">
            {mode === 'owner' ? 'License Keys' : 'My Licenses'}
          </h2>
        </div>
      </div>

      {/* Search */}
      {licenses.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by key, product, or user..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-black/30 border-gray-700 text-white pl-10"
          />
        </div>
      )}

      {/* Licenses List */}
      {filteredLicenses.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border bg-slate-800/30 border-white/10">
          <Key className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">
            {searchQuery ? 'No licenses match your search' : 'No license keys yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLicenses.map(license => {
            const isExpired = license.expires_at && new Date(license.expires_at) < new Date();
            const isVisible = visibleKeys.has(license.id);
            
            return (
              <div
                key={license.id}
                className={`p-4 rounded-xl border transition-all ${
                  license.status === 'revoked' || isExpired
                    ? 'bg-slate-800/30 border-red-500/30 opacity-70'
                    : 'bg-slate-800/50 border-purple-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Product & User */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-medium">
                        {license.product?.title || 'Unknown Product'}
                      </span>
                      {mode === 'owner' && license.user && (
                        <span className="text-sm text-gray-400">
                          • {license.user.username || license.user.email || 'Unknown User'}
                        </span>
                      )}
                    </div>
                    
                    {/* License Key */}
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-lg font-mono text-purple-300 bg-black/30 px-3 py-1 rounded">
                        {isVisible ? license.key : maskKey(license.key)}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(license.id)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      >
                        {isVisible ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => copyKey(license.key)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    
                    {/* Status & Info */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded border ${
                        license.status === 'active' && !isExpired
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : license.status === 'revoked'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {isExpired ? 'Expired' : license.status}
                      </span>
                      
                      <span className="flex items-center gap-1 text-gray-400">
                        <Monitor className="w-3 h-3" />
                        {license.activations}/{license.max_activations || '∞'} activations
                      </span>
                      
                      <span className="flex items-center gap-1 text-gray-400">
                        <Calendar className="w-3 h-3" />
                        Created {formatDate(license.created_at)}
                      </span>
                      
                      {license.expires_at && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <Shield className="w-3 h-3" />
                          Expires {formatDate(license.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions (Owner only) */}
                  {mode === 'owner' && (
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => {
                          setSelectedLicense(license);
                          fetchActivations(license.id);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="View activations"
                      >
                        <Monitor className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => regenerateLicense(license.id)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Regenerate key"
                      >
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                      </button>
                      {license.status === 'active' ? (
                        <button
                          onClick={() => revokeLicense(license.id)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          title="Revoke license"
                        >
                          <Ban className="w-4 h-4 text-red-400" />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateLicense(license.id)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          title="Reactivate license"
                        >
                          <Check className="w-4 h-4 text-green-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activations Modal */}
      {selectedLicense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-purple-500/30 max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">License Activations</h3>
              <button
                onClick={() => setSelectedLicense(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-96">
              {loadingActivations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : activations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Monitor className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No activations yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activations.map(activation => (
                    <div
                      key={activation.id}
                      className={`p-3 rounded-lg bg-black/20 ${
                        activation.deactivated_at ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white font-mono">
                            {activation.machine_id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activation.ip_address || 'Unknown IP'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            {formatDate(activation.activated_at)}
                          </p>
                          {activation.deactivated_at && (
                            <span className="text-xs text-red-400">Deactivated</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseKeyManager;
