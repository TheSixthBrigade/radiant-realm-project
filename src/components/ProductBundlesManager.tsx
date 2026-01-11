import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Package, Plus, Edit2, Trash2, Loader2, 
  DollarSign, Percent, X, Image as ImageIcon,
  ToggleLeft, ToggleRight, Check
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductBundle {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  image_url?: string;
  product_ids: string[];
  bundle_price: number;
  original_price: number;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  image_url?: string;
}

export const ProductBundlesManager = () => {
  const { user } = useAuth();
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [bundlePrice, setBundlePrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBundles();
      fetchProducts();
    }
  }, [user]);

  const fetchBundles = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('product_bundles')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBundles(data || []);
    } catch (e) {
      console.error('Error fetching bundles:', e);
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, title, price, image_url')
        .eq('creator_id', user?.id);
      setProducts(data || []);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  };

  // Calculate original price from selected products
  const calculateOriginalPrice = () => {
    return selectedProducts.reduce((sum, pid) => {
      const product = products.find(p => p.id === pid);
      return sum + (product?.price || 0);
    }, 0);
  };

  const originalPrice = calculateOriginalPrice();
  const savings = originalPrice - (parseFloat(bundlePrice) || 0);
  const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  const resetForm = () => {
    setName('');
    setDescription('');
    setImageUrl('');
    setSelectedProducts([]);
    setBundlePrice('');
    setIsActive(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Bundle name is required');
      return;
    }
    
    if (selectedProducts.length < 2) {
      toast.error('Select at least 2 products for a bundle');
      return;
    }
    
    const price = parseFloat(bundlePrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Invalid bundle price');
      return;
    }
    
    if (price >= originalPrice) {
      toast.error('Bundle price should be less than the combined price');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        creator_id: user?.id,
        name: name.trim(),
        description: description.trim(),
        image_url: imageUrl.trim() || null,
        product_ids: selectedProducts,
        bundle_price: price,
        original_price: originalPrice,
        is_active: isActive
      };
      
      if (editingId) {
        await (supabase as any)
          .from('product_bundles')
          .update(payload)
          .eq('id', editingId);
        toast.success('Bundle updated!');
      } else {
        await (supabase as any)
          .from('product_bundles')
          .insert(payload);
        toast.success('Bundle created!');
      }
      resetForm();
      fetchBundles();
    } catch (e) {
      toast.error('Failed to save bundle');
      console.error(e);
    }
    setSubmitting(false);
  };

  const handleEdit = (bundle: ProductBundle) => {
    setEditingId(bundle.id);
    setName(bundle.name);
    setDescription(bundle.description || '');
    setImageUrl(bundle.image_url || '');
    setSelectedProducts(bundle.product_ids || []);
    setBundlePrice(bundle.bundle_price.toString());
    setIsActive(bundle.is_active);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bundle?')) return;
    try {
      await (supabase as any).from('product_bundles').delete().eq('id', id);
      toast.success('Bundle deleted');
      fetchBundles();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      await (supabase as any)
        .from('product_bundles')
        .update({ is_active: !currentState })
        .eq('id', id);
      toast.success(currentState ? 'Bundle deactivated' : 'Bundle activated');
      fetchBundles();
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const getProductNames = (productIds: string[]) => {
    return productIds
      .map(id => products.find(p => p.id === id)?.title || 'Unknown')
      .join(', ');
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
          <Package className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-bold text-white">Product Bundles</h2>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-full bg-purple-600 hover:bg-purple-700"
          disabled={products.length < 2}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Bundle
        </Button>
      </div>

      {products.length < 2 && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm">
          You need at least 2 products to create a bundle.
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="p-6 rounded-2xl border bg-slate-800/60 border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {editingId ? 'Edit Bundle' : 'Create Bundle'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Bundle Name *</label>
              <Input
                placeholder="Ultimate Starter Pack"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-black/30 border-gray-700 text-white"
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <textarea
                placeholder="Get everything you need to get started..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-black/30 border border-gray-700 text-white rounded-md px-3 py-2 resize-none"
              />
            </div>
            
            {/* Image URL */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                <ImageIcon className="w-4 h-4 inline mr-1" />
                Bundle Image URL
              </label>
              <Input
                placeholder="https://..."
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="bg-black/30 border-gray-700 text-white"
              />
            </div>
            
            {/* Product Selection */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Select Products * (min 2)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-black/20 rounded-lg">
                {products.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      selectedProducts.includes(p.id)
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      selectedProducts.includes(p.id) 
                        ? 'bg-purple-500' 
                        : 'bg-gray-700'
                    }`}>
                      {selectedProducts.includes(p.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    {p.image_url && (
                      <img 
                        src={p.image_url} 
                        alt="" 
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{p.title}</p>
                      <p className="text-xs text-gray-400">${p.price}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Pricing */}
            {selectedProducts.length >= 2 && (
              <div className="p-4 rounded-xl bg-black/30 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">Original Price:</span>
                  <span className="text-white font-semibold">${originalPrice.toFixed(2)}</span>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Bundle Price *</label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={bundlePrice}
                      onChange={e => setBundlePrice(e.target.value)}
                      className="bg-black/30 border-gray-700 text-white pl-8"
                    />
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                
                {bundlePrice && parseFloat(bundlePrice) < originalPrice && (
                  <div className="flex items-center gap-2 mt-3 text-green-400">
                    <Percent className="w-4 h-4" />
                    <span className="font-semibold">
                      Save ${savings.toFixed(2)} ({savingsPercent}% off)
                    </span>
                  </div>
                )}
              </div>
            )}
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
                disabled={submitting || !name.trim() || selectedProducts.length < 2 || !bundlePrice}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bundles List */}
      {bundles.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border bg-slate-800/30 border-white/10">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">No bundles yet</p>
          <p className="text-sm text-gray-500 mt-2">Create product bundles to offer discounts</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bundles.map(bundle => {
            const bundleSavings = bundle.original_price - bundle.bundle_price;
            const bundleSavingsPercent = Math.round((bundleSavings / bundle.original_price) * 100);
            
            return (
              <div
                key={bundle.id}
                className={`p-4 rounded-xl border transition-all ${
                  bundle.is_active 
                    ? 'bg-slate-800/50 border-purple-500/30' 
                    : 'bg-slate-800/30 border-gray-700 opacity-60'
                }`}
              >
                <div className="flex gap-4">
                  {/* Image */}
                  {bundle.image_url ? (
                    <img 
                      src={bundle.image_url} 
                      alt={bundle.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Package className="w-8 h-8 text-purple-400" />
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-white">{bundle.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {bundle.product_ids.length} products
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleActive(bundle.id, bundle.is_active)}
                          className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        >
                          {bundle.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(bundle)}
                          className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(bundle.id)}
                          className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Pricing */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-lg font-bold text-white">
                        ${bundle.bundle_price}
                      </span>
                      <span className="text-sm text-gray-500 line-through">
                        ${bundle.original_price}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                        Save {bundleSavingsPercent}%
                      </span>
                    </div>
                    
                    {/* Products */}
                    <p className="text-xs text-gray-500 mt-2 truncate">
                      {getProductNames(bundle.product_ids)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductBundlesManager;
