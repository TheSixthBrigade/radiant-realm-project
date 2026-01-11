import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Wallet, Loader2, DollarSign, Clock, CheckCircle, 
  XCircle, AlertCircle, Send
} from 'lucide-react';
import { toast } from 'sonner';

interface PayoutRequest {
  id: string;
  affiliate_link_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  payment_method: string;
  payment_details: string;
  created_at: string;
  processed_at?: string;
}

interface AffiliateLink {
  id: string;
  earnings: number;
  creator_id: string;
}

interface AffiliateSettings {
  min_payout: number;
}

interface AffiliatePayoutsProps {
  mode: 'affiliate' | 'owner';
  storeId?: string;
}


export const AffiliatePayouts = ({ mode, storeId }: AffiliatePayoutsProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [myLink, setMyLink] = useState<AffiliateLink | null>(null);
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  
  // Request form
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      if (mode === 'owner') fetchOwnerPayouts();
      else fetchAffiliateData();
    }
  }, [user, mode, storeId]);

  const fetchOwnerPayouts = async () => {
    try {
      // Get all affiliate links for this owner
      const { data: links } = await (supabase as any)
        .from('affiliate_links')
        .select('id')
        .eq('creator_id', user?.id);
      
      if (links && links.length > 0) {
        const linkIds = links.map((l: any) => l.id);
        const { data } = await (supabase as any)
          .from('affiliate_payout_requests')
          .select('*')
          .in('affiliate_link_id', linkIds)
          .order('created_at', { ascending: false });
        setPayouts(data || []);
      }
    } catch (e) {
      console.error('Error fetching payouts:', e);
    }
    setLoading(false);
  };

  const fetchAffiliateData = async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const { data: linkData } = await (supabase as any)
        .from('affiliate_links')
        .select('*')
        .eq('user_id', user?.id)
        .eq('creator_id', storeId)
        .single();
      setMyLink(linkData);

      const { data: settingsData } = await (supabase as any)
        .from('affiliate_settings')
        .select('min_payout')
        .eq('creator_id', storeId)
        .single();
      setSettings(settingsData);

      if (linkData) {
        const { data } = await (supabase as any)
          .from('affiliate_payout_requests')
          .select('*')
          .eq('affiliate_link_id', linkData.id)
          .order('created_at', { ascending: false });
        setPayouts(data || []);
      }
    } catch (e) {
      console.error('Error:', e);
    }
    setLoading(false);
  };


  const requestPayout = async () => {
    if (!myLink || !settings) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amt > myLink.earnings) {
      toast.error('Amount exceeds available earnings');
      return;
    }
    if (amt < settings.min_payout) {
      toast.error(`Minimum payout is $${settings.min_payout}`);
      return;
    }
    if (!paymentDetails.trim()) {
      toast.error('Enter payment details');
      return;
    }

    setSubmitting(true);
    try {
      await (supabase as any)
        .from('affiliate_payout_requests')
        .insert({
          affiliate_link_id: myLink.id,
          amount: amt,
          payment_method: paymentMethod,
          payment_details: paymentDetails.trim()
        });
      toast.success('Payout request submitted!');
      setShowForm(false);
      setAmount('');
      setPaymentDetails('');
      fetchAffiliateData();
    } catch (e) {
      toast.error('Failed to submit request');
    }
    setSubmitting(false);
  };

  const updatePayoutStatus = async (id: string, status: 'approved' | 'paid' | 'rejected') => {
    try {
      await (supabase as any)
        .from('affiliate_payout_requests')
        .update({ status, processed_at: new Date().toISOString() })
        .eq('id', id);
      toast.success(`Payout ${status}`);
      fetchOwnerPayouts();
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'approved': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }


  // Owner view - manage payout requests
  if (mode === 'owner') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-bold text-white">Payout Requests</h2>
        </div>

        {payouts.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border bg-slate-800/30 border-white/10">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">No payout requests yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map(p => (
              <div key={p.id} className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(p.status)}
                    <div>
                      <p className="text-white font-semibold">${p.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{p.payment_method}: {p.payment_details}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{formatDate(p.created_at)}</span>
                    {p.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => updatePayoutStatus(p.id, 'approved')}
                          className="bg-blue-600 hover:bg-blue-700 text-xs">Approve</Button>
                        <Button size="sm" onClick={() => updatePayoutStatus(p.id, 'rejected')}
                          variant="destructive" className="text-xs">Reject</Button>
                      </>
                    )}
                    {p.status === 'approved' && (
                      <Button size="sm" onClick={() => updatePayoutStatus(p.id, 'paid')}
                        className="bg-green-600 hover:bg-green-700 text-xs">Mark Paid</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }


  // Affiliate view - request payouts
  const canRequestPayout = myLink && settings && myLink.earnings >= settings.min_payout;
  const pendingPayout = payouts.find(p => p.status === 'pending' || p.status === 'approved');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold text-white">Payouts</h2>
        </div>
        {canRequestPayout && !pendingPayout && (
          <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
            <Send className="w-4 h-4 mr-2" />Request Payout
          </Button>
        )}
      </div>

      {/* Balance Card */}
      {myLink && settings && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Available Balance</p>
              <p className="text-3xl font-bold text-white">${myLink.earnings.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Min Payout</p>
              <p className="text-lg text-white">${settings.min_payout}</p>
            </div>
          </div>
          {!canRequestPayout && (
            <p className="text-sm text-yellow-400 mt-2">
              Earn ${(settings.min_payout - myLink.earnings).toFixed(2)} more to request payout
            </p>
          )}
          {pendingPayout && (
            <p className="text-sm text-blue-400 mt-2">
              You have a {pendingPayout.status} payout request for ${pendingPayout.amount.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* Request Form */}
      {showForm && (
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30 space-y-4">
          <h3 className="text-white font-semibold">Request Payout</h3>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Amount</label>
            <div className="relative">
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                className="bg-black/30 border-gray-700 text-white pl-8" max={myLink?.earnings} />
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              className="w-full bg-black/30 border border-gray-700 text-white rounded-md px-3 py-2">
              <option value="paypal">PayPal</option>
              <option value="bank">Bank Transfer</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Payment Details</label>
            <Input value={paymentDetails} onChange={e => setPaymentDetails(e.target.value)}
              placeholder={paymentMethod === 'paypal' ? 'PayPal email' : 'Account details'}
              className="bg-black/30 border-gray-700 text-white" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={requestPayout} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Submit Request
            </Button>
          </div>
        </div>
      )}

      {/* Payout History */}
      {payouts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white font-semibold">History</h3>
          {payouts.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20">
              <div className="flex items-center gap-2">
                {getStatusIcon(p.status)}
                <span className="text-white">${p.amount.toFixed(2)}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  p.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                  p.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                  p.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{p.status}</span>
              </div>
              <span className="text-xs text-gray-500">{formatDate(p.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AffiliatePayouts;
