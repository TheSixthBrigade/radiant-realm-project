import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, Settings, Link as LinkIcon, DollarSign, 
  Loader2, Copy, TrendingUp, MousePointer, ShoppingCart,
  ToggleLeft, ToggleRight, Percent, Wallet
} from 'lucide-react';
import { toast } from 'sonner';

interface AffiliateSettings {
  creator_id: string;
  is_enabled: boolean;
  commission_rate: number;
  min_payout: number;
  cookie_days: number;
}

interface AffiliateLink {
  id: string;
  user_id: string;
  creator_id: string;
  code: string;
  clicks: number;
  conversions: number;
  earnings: number;
  created_at: string;
}

interface AffiliateReferral {
  id: string;
  link_id: string;
  sale_id: string;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  created_at: string;
}

interface AffiliateManagerProps {
  mode: 'owner' | 'affiliate';
  storeId?: string;
  storeUsername?: string;
}

export const AffiliateManager = ({ mode, storeId, storeUsername }: AffiliateManagerProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  const [myLink, setMyLink] = useState<AffiliateLink | null>(null);
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [allLinks, setAllLinks] = useState<AffiliateLink[]>([]);
  
  // Settings form
  const [isEnabled, setIsEnabled] = useState(false);
  const [commissionRate, setCommissionRate] = useState('10');
  const [minPayout, setMinPayout] = useState('50');
  const [cookieDays, setCookieDays] = useState('30');
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Affiliate joining
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (mode === 'owner') {
      if (user) {
        fetchOwnerData();
      }
    } else {
      // Affiliate mode - fetch data even if not logged in (to show program info)
      fetchAffiliateData();
    }
  }, [user, mode, storeId]);

  const fetchOwnerData = async () => {
    try {
      // Fetch settings
      const { data: settingsData } = await (supabase as any)
        .from('affiliate_settings')
        .select('*')
        .eq('creator_id', user?.id)
        .single();
      
      if (settingsData) {
        setSettings(settingsData);
        setIsEnabled(settingsData.is_enabled);
        setCommissionRate((settingsData.commission_rate * 100).toString());
        setMinPayout(settingsData.min_payout.toString());
        setCookieDays(settingsData.cookie_days.toString());
      }
      
      // Fetch all affiliate links for this store
      const { data: linksData } = await (supabase as any)
        .from('affiliate_links')
        .select('*')
        .eq('creator_id', user?.id)
        .order('earnings', { ascending: false });
      
      setAllLinks(linksData || []);
    } catch (e) {
      console.error('Error fetching owner data:', e);
    }
    setLoading(false);
  };

  const fetchAffiliateData = async () => {
    if (!storeId) {
      console.log('No storeId provided');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Fetching affiliate settings for storeId:', storeId);
      
      // Fetch store's affiliate settings
      const { data: settingsData, error: settingsError } = await (supabase as any)
        .from('affiliate_settings')
        .select('*')
        .eq('creator_id', storeId)
        .maybeSingle();
      
      console.log('Settings data:', settingsData, 'Error:', settingsError);
      
      if (settingsData) {
        setSettings(settingsData);
      } else {
        // No settings found - program not configured
        setSettings(null);
      }
      
      // Fetch my link for this store
      if (user) {
        const { data: linkData } = await (supabase as any)
          .from('affiliate_links')
          .select('*')
          .eq('user_id', user.id)
          .eq('creator_id', storeId)
          .maybeSingle();
        
        setMyLink(linkData);
        
        // Fetch my referrals
        if (linkData) {
          const { data: referralsData } = await (supabase as any)
            .from('affiliate_referrals')
            .select('*')
            .eq('link_id', linkData.id)
            .order('created_at', { ascending: false });
          
          setReferrals(referralsData || []);
        }
      }
    } catch (e) {
      console.error('Error fetching affiliate data:', e);
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const rate = parseFloat(commissionRate) / 100;
      const payout = parseFloat(minPayout);
      const days = parseInt(cookieDays);
      
      if (rate < 0 || rate > 1) {
        toast.error('Commission rate must be between 0-100%');
        setSavingSettings(false);
        return;
      }
      
      const payload = {
        creator_id: user?.id,
        is_enabled: isEnabled,
        commission_rate: rate,
        min_payout: payout,
        cookie_days: days
      };
      
      console.log('Saving affiliate settings:', payload);
      
      let result;
      if (settings) {
        result = await (supabase as any)
          .from('affiliate_settings')
          .update(payload)
          .eq('creator_id', user?.id);
      } else {
        result = await (supabase as any)
          .from('affiliate_settings')
          .insert(payload);
      }
      
      console.log('Save result:', result);
      
      if (result.error) {
        toast.error('Failed to save: ' + result.error.message);
        console.error('Save error:', result.error);
      } else {
        toast.success('Affiliate settings saved!');
        fetchOwnerData();
      }
    } catch (e) {
      toast.error('Failed to save settings');
      console.error(e);
    }
    setSavingSettings(false);
  };

  const generateAffiliateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const joinProgram = async () => {
    if (!storeId || !user) {
      toast.error('You must be logged in to join');
      return;
    }
    
    setJoining(true);
    try {
      const code = generateAffiliateCode();
      
      console.log('Creating affiliate link:', { user_id: user.id, creator_id: storeId, code });
      
      const { data, error } = await (supabase as any)
        .from('affiliate_links')
        .insert({
          user_id: user.id,
          creator_id: storeId,
          code,
          clicks: 0,
          conversions: 0,
          earnings: 0
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating affiliate link:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        if (error.code === '23505') {
          toast.error('You already have an affiliate link for this store');
        } else if (error.code === '42501') {
          toast.error('Permission denied - RLS policy issue');
        } else {
          toast.error('Failed to join: ' + error.message);
        }
        setJoining(false);
        return;
      }
      
      if (!data) {
        console.error('No data returned from insert');
        toast.error('Failed to create affiliate link - no data returned');
        setJoining(false);
        return;
      }
      
      console.log('Affiliate link created:', data);
      toast.success('You joined the affiliate program!');
      setMyLink(data);
      fetchAffiliateData();
    } catch (e: any) {
      console.error('Exception joining program:', e);
      toast.error('Failed to join program: ' + (e.message || 'Unknown error'));
    }
    setJoining(false);
  };

  const copyLink = () => {
    if (!myLink || !storeUsername) return;
    const url = `${window.location.origin}/site/${storeUsername}?ref=${myLink.code}`;
    navigator.clipboard.writeText(url);
    toast.success('Affiliate link copied!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  // Owner View - Settings & Analytics
  if (mode === 'owner') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-violet-400" />
          <h2 className="text-2xl font-bold text-white">Affiliate Program</h2>
        </div>

        {/* Settings Card */}
        <div className="p-6 rounded-2xl border bg-[#0a0a0a] border-violet-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-white/40" />
            <h3 className="text-lg font-semibold text-white">Program Settings</h3>
          </div>
          
          <div className="space-y-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
              <div>
                <p className="text-white font-medium">Enable Affiliate Program</p>
                <p className="text-sm text-white/40">Allow users to earn commissions by referring customers</p>
              </div>
              <button
                onClick={() => setIsEnabled(!isEnabled)}
                className="p-1"
              >
                {isEnabled ? (
                  <ToggleRight className="w-10 h-10 text-violet-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-white/30" />
                )}
              </button>
            </div>
            
            {isEnabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Commission Rate */}
                  <div>
                    <label className="text-sm text-white/40 mb-1 block">Commission Rate</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={commissionRate}
                        onChange={e => setCommissionRate(e.target.value)}
                        className="bg-white/[0.03] border-white/[0.07] text-white pr-8"
                        min="1"
                        max="100"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    </div>
                  </div>
                  
                  {/* Min Payout */}
                  <div>
                    <label className="text-sm text-white/40 mb-1 block">Minimum Payout</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={minPayout}
                        onChange={e => setMinPayout(e.target.value)}
                        className="bg-white/[0.03] border-white/[0.07] text-white pl-8"
                      />
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    </div>
                  </div>
                  
                  {/* Cookie Days */}
                  <div>
                    <label className="text-sm text-white/40 mb-1 block">Cookie Duration (days)</label>
                    <Input
                      type="number"
                      value={cookieDays}
                      onChange={e => setCookieDays(e.target.value)}
                      className="bg-white/[0.03] border-white/[0.07] text-white"
                      min="1"
                      max="365"
                    />
                  </div>
                </div>
                
                <Button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="bg-violet-600 hover:bg-violet-500"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Settings
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Affiliates List */}
        {isEnabled && (
          <div className="p-6 rounded-2xl border bg-[#0a0a0a] border-violet-500/20">
            <h3 className="text-lg font-semibold text-white mb-4">Your Affiliates</h3>
            
            {allLinks.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No affiliates yet</p>
                <p className="text-sm text-white/30">Share your store to attract affiliates</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allLinks.map(link => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-4">
                      <code className="text-sm font-mono text-violet-400 bg-violet-500/10 px-2 py-1 rounded">
                        {link.code}
                      </code>
                      <div className="flex items-center gap-4 text-sm text-white/40">
                        <span className="flex items-center gap-1">
                          <MousePointer className="w-4 h-4" />
                          {link.clicks} clicks
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-4 h-4" />
                          {link.conversions} sales
                        </span>
                      </div>
                    </div>
                    <span className="text-green-400 font-semibold">
                      ${link.earnings.toFixed(2)} earned
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Affiliate View - Join & Dashboard
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-violet-400" />
        <h2 className="text-2xl font-bold text-white">Affiliate Program</h2>
      </div>

      {/* Program not enabled */}
      {!settings?.is_enabled && (
        <div className="text-center py-12 rounded-2xl border bg-white/[0.02] border-white/[0.07]">
          <Users className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/40">Affiliate program is not available for this store</p>
        </div>
      )}

      {/* Program enabled but not joined */}
      {settings?.is_enabled && !myLink && (
        <div className="p-6 rounded-2xl border bg-[#0a0a0a] border-violet-500/20 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-violet-400" />
          <h3 className="text-xl font-semibold text-white mb-2">Join the Affiliate Program</h3>
          <p className="text-white/40 mb-4">
            Earn {(settings.commission_rate * 100).toFixed(0)}% commission on every sale you refer!
          </p>
          <div className="flex justify-center gap-4 text-sm text-white/40 mb-6">
            <span>Min payout: ${settings.min_payout}</span>
            <span>•</span>
            <span>{settings.cookie_days} day cookie</span>
          </div>
          <Button
            onClick={joinProgram}
            disabled={joining}
            className="bg-violet-600 hover:bg-violet-500"
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Join Program
          </Button>
        </div>
      )}

      {/* Affiliate Dashboard */}
      {settings?.is_enabled && myLink && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-violet-500/20">
              <MousePointer className="w-5 h-5 text-violet-400 mb-2" />
              <p className="text-2xl font-bold text-white">{myLink.clicks}</p>
              <p className="text-sm text-white/40">Clicks</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-violet-500/20">
              <ShoppingCart className="w-5 h-5 text-violet-400 mb-2" />
              <p className="text-2xl font-bold text-white">{myLink.conversions}</p>
              <p className="text-sm text-white/40">Conversions</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-violet-500/20">
              <DollarSign className="w-5 h-5 text-violet-400 mb-2" />
              <p className="text-2xl font-bold text-white">${myLink.earnings.toFixed(2)}</p>
              <p className="text-sm text-white/40">Earnings</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-violet-500/20">
              <Percent className="w-5 h-5 text-violet-400 mb-2" />
              <p className="text-2xl font-bold text-white">
                {myLink.clicks > 0 ? ((myLink.conversions / myLink.clicks) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-white/40">Conv. Rate</p>
            </div>
          </div>

          {/* Affiliate Link */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-violet-500/20">
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="w-5 h-5 text-white/40" />
              <span className="text-white font-medium">Your Affiliate Link</span>
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/site/${storeUsername}?ref=${myLink.code}`}
                className="bg-white/[0.03] border-white/[0.07] text-white/60 font-mono text-sm"
              />
              <Button onClick={copyLink} variant="outline" className="border-white/[0.07]">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Payout Info */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-violet-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-white/40" />
                <span className="text-white font-medium">Payout Status</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/40">
                  Min payout: ${settings.min_payout}
                </p>
                {myLink.earnings >= settings.min_payout ? (
                  <span className="text-green-400 text-sm">Eligible for payout</span>
                ) : (
                  <span className="text-white/30 text-sm">
                    ${(settings.min_payout - myLink.earnings).toFixed(2)} more to reach minimum
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Recent Referrals */}
          {referrals.length > 0 && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-violet-500/20">
              <h3 className="text-white font-medium mb-3">Recent Referrals</h3>
              <div className="space-y-2">
                {referrals.slice(0, 5).map(ref => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between p-2 rounded bg-white/[0.03]"
                  >
                    <span className="text-sm text-white/40">{formatDate(ref.created_at)}</span>
                    <span className={`text-sm px-2 py-0.5 rounded ${
                      ref.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      ref.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                      ref.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {ref.status}
                    </span>
                    <span className="text-green-400 font-medium">
                      +${ref.commission_amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AffiliateManager;
