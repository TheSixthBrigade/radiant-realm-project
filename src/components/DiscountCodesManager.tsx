import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Ticket, Plus, Edit2, Trash2, Loader2, Copy, 
  Percent, DollarSign, Calendar, Package, Users,
  ToggleLeft, ToggleRight, X
} from 'lucide-react';
import { toast } from 'sonner';

interface DiscountCode {
  id: string;
  creator_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  product_ids?: string[];
  usage_limit?: number;
  usage_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
}

export const DiscountCodesManager = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCodes();
      fetchProducts();
    }
  }, [user]);

  const fetchCodes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('discount_codes')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCodes(data || []);
    } catch (e) {
      console.error('Error fetching discount codes:', e);
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, title')
        .eq('creator_id', user?.id);
      setProducts(data || []);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinPurchase('');
    setMaxDiscount('');
    setUsageLimit('');
    setExpiresAt('');
    setSelectedProducts([]);
    setIsActive(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!code.trim() || !discountValue) {
      toast.error('Code and discount value are required');
      return;
    }
    
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      toast.error('Invalid discount value');
      return;
    }
    
    if (discountType === 'percentage' && value > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        creator_id: user?.id,
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: value,
        min_purchase: minPurchase ? parseFloat(minPurchase) : null,
        max_discount: maxDiscount ? parseFloat(maxDiscount) : null,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        expires_at: expiresAt || null,
        product_ids: selectedProducts.length > 0 ? selectedProducts : null,
        is_active: isActive
      };
      
      if (editingId) {
        await (supabase as any)
          .from('discount_codes')
          .update(payload)
          .eq('id', editingId);
        toast.success('Discount code updated!');
      } else {
        await (supabase as any)
          .from('discount_codes')
          .insert(payload);
        toast.success('Discount code created!');
      }
      resetForm();
      fetchCodes();
    } catch (e: any) {
      if (e.code === '23505') {
        toast.error('This code already exists');
      } else {
        toast.error('Failed to save discount code');
      }
    }
    setSubmitting(false);
  };

  const handleEdit = (dc: DiscountCode) => {
    setEditingId(dc.id);
    setCode(dc.code);
    setDiscountType(dc.discount_type);
    setDiscountValue(dc.discount_value.toString());
    setMinPurchase(dc.min_purchase?.toString() || '');
    setMaxDiscount(dc.max_discount?.toString() || '');
    setUsageLimit(dc.usage_limit?.toString() || '');
    setExpiresAt(dc.expires_at ? dc.expires_at.split('T')[0] : '');
    setSelectedProducts(dc.product_ids || []);
    setIsActive(dc.is_active);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this discount code?')) return;
    try {
      await (supabase as any).from('discount_codes').delete().eq('id', id);
      toast.success('Discount code deleted');
      fetchCodes();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      await (supabase as any)
        .from('discount_codes')
        .update({ is_active: !currentState })
        .eq('id', id);
      toast.success(currentState ? 'Code deactivated' : 'Code activated');
      fetchCodes();
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const copyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    toast.success('Code copied!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

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
          <Ticket className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-bold text-white">Discount Codes</h2>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-full bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Code
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="p-6 rounded-2xl border bg-slate-800/60 border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {editingId ? 'Edit Discount Code' : 'Create Discount Code'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Code *</label>
              <div className="flex gap-2">
                <Input
                  placeholder="SUMMER20"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="bg-black/30 border-gray-700 text-white uppercase"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={generateCode}
                  className="border-gray-700 text-gray-300"
                >
                  Generate
                </Button>
              </div>
            </div>
            
            {/* Discount Type & Value */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Discount *</label>
              <div className="flex gap-2">
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="bg-black/30 border border-gray-700 text-white rounded-md px-3"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder={discountType === 'percentage' ? '20' : '10.00'}
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    className="bg-black/30 border-gray-700 text-white pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {discountType === 'percentage' ? '%' : '$'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Min Purchase */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Minimum Purchase</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={minPurchase}
                  onChange={e => setMinPurchase(e.target.value)}
                  className="bg-black/30 border-gray-700 text-white pl-8"
                />
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            
            {/* Max Discount (for percentage) */}
            {discountType === 'percentage' && (
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Max Discount Cap</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={maxDiscount}
                    onChange={e => setMaxDiscount(e.target.value)}
                    className="bg-black/30 border-gray-700 text-white pl-8"
                  />
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            )}
            
            {/* Usage Limit */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Usage Limit</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={usageLimit}
                  onChange={e => setUsageLimit(e.target.value)}
                  className="bg-black/30 border-gray-700 text-white pl-8"
                />
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            
            {/* Expiry Date */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Expires On</label>
              <div className="relative">
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="bg-black/30 border-gray-700 text-white pl-8"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            
            {/* Product Selection */}
            <div className="md:col-span-2">
              <label className="text-sm text-gray-400 mb-1 block">
                <Package className="w-4 h-4 inline mr-1" />
                Apply to Products (leave empty for all)
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {products.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProducts(prev => 
                        prev.includes(p.id) 
                          ? prev.filter(id => id !== p.id)
                          : [...prev, p.id]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      selectedProducts.includes(p.id)
                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                        : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-300">Active</span>
            </label>
            
            <div className="flex gap-2">
              <Button variant="ghost" onClick={resetForm} className="text-gray-400">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !code.trim() || !discountValue}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Codes List */}
      {codes.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border bg-slate-800/30 border-white/10">
          <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">No discount codes yet</p>
          <p className="text-sm text-gray-500 mt-2">Create your first promo code above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map(dc => {
            const expired = isExpired(dc.expires_at);
            const limitReached = dc.usage_limit && dc.usage_count >= dc.usage_limit;
            const inactive = !dc.is_active || expired || limitReached;
            
            return (
              <div
                key={dc.id}
                className={`p-4 rounded-xl border transition-all ${
                  inactive 
                    ? 'bg-slate-800/30 border-gray-700 opacity-60' 
                    : 'bg-slate-800/50 border-purple-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Code */}
                    <div className="flex items-center gap-2">
                      <code className="text-lg font-mono font-bold text-white bg-black/30 px-3 py-1 rounded">
                        {dc.code}
                      </code>
                      <button
                        onClick={() => copyCode(dc.code)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    
                    {/* Discount */}
                    <div className="flex items-center gap-1 text-green-400">
                      {dc.discount_type === 'percentage' ? (
                        <>
                          <Percent className="w-4 h-4" />
                          <span className="font-semibold">{dc.discount_value}% off</span>
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold">${dc.discount_value} off</span>
                        </>
                      )}
                    </div>
                    
                    {/* Status badges */}
                    <div className="flex gap-2">
                      {expired && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                          Expired
                        </span>
                      )}
                      {limitReached && (
                        <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          Limit Reached
                        </span>
                      )}
                      {!dc.is_active && (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      {dc.usage_count}{dc.usage_limit ? `/${dc.usage_limit}` : ''} uses
                    </span>
                    <button
                      onClick={() => toggleActive(dc.id, dc.is_active)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {dc.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(dc)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(dc.id)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                
                {/* Details row */}
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  {dc.min_purchase && (
                    <span>Min: ${dc.min_purchase}</span>
                  )}
                  {dc.max_discount && (
                    <span>Max: ${dc.max_discount}</span>
                  )}
                  {dc.expires_at && (
                    <span>Expires: {formatDate(dc.expires_at)}</span>
                  )}
                  {dc.product_ids && dc.product_ids.length > 0 && (
                    <span>{dc.product_ids.length} product(s)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiscountCodesManager;
