import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Package, Loader2, ShoppingCart, Percent, ChevronRight } from 'lucide-react';

interface ProductBundle {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  product_ids: string[];
  bundle_price: number;
  original_price: number;
}

interface Product {
  id: string;
  title: string;
  price: number;
  image_url?: string;
}

interface StoreBundlesProps {
  creatorId: string;
  onPurchase?: (bundleId: string, productIds: string[], price: number) => void;
}

export const StoreBundles = ({ creatorId, onPurchase }: StoreBundlesProps) => {
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);

  useEffect(() => {
    if (creatorId) fetchBundles();
  }, [creatorId]);

  const fetchBundles = async () => {
    try {
      const { data: bundlesData } = await (supabase as any)
        .from('product_bundles')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setBundles(bundlesData || []);

      // Fetch all products for this creator to show bundle contents
      const { data: productsData } = await (supabase as any)
        .from('products')
        .select('id, title, price, image_url')
        .eq('creator_id', creatorId);

      setProducts(productsData || []);
    } catch (e) {
      console.error('Error fetching bundles:', e);
    }
    setLoading(false);
  };

  const getProductsInBundle = (productIds: string[]) => {
    return productIds
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as Product[];
  };

  const handlePurchase = (bundle: ProductBundle) => {
    if (onPurchase) {
      onPurchase(bundle.id, bundle.product_ids, bundle.bundle_price);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (bundles.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold text-white">Bundles</h3>
        <span className="text-sm text-gray-400">Save more with bundles</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bundles.map(bundle => {
          const savings = bundle.original_price - bundle.bundle_price;
          const savingsPercent = Math.round((savings / bundle.original_price) * 100);
          const bundleProducts = getProductsInBundle(bundle.product_ids);
          const isExpanded = expandedBundle === bundle.id;

          return (
            <div
              key={bundle.id}
              className="rounded-2xl border bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-purple-500/30 overflow-hidden hover:border-purple-500/50 transition-all"
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex gap-4">
                  {bundle.image_url ? (
                    <img
                      src={bundle.image_url}
                      alt={bundle.name}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                      <Package className="w-8 h-8 text-purple-400" />
                    </div>
                  )}

                  <div className="flex-1">
                    <h4 className="font-bold text-white text-lg">{bundle.name}</h4>
                    {bundle.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {bundle.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {bundle.product_ids.length} products included
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">
                      ${bundle.bundle_price.toFixed(2)}
                    </span>
                    <span className="text-lg text-gray-500 line-through">
                      ${bundle.original_price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                    <Percent className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">
                      Save {savingsPercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Expandable Products List */}
              <button
                onClick={() => setExpandedBundle(isExpanded ? null : bundle.id)}
                className="w-full px-4 py-2 flex items-center justify-between bg-black/20 hover:bg-black/30 transition-colors border-t border-white/5"
              >
                <span className="text-sm text-gray-400">
                  {isExpanded ? 'Hide' : 'Show'} included products
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-black/10 border-t border-white/5">
                  <div className="space-y-2">
                    {bundleProducts.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-700" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{product.title}</p>
                          <p className="text-xs text-gray-500">${product.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase Button */}
              <div className="p-4 pt-0">
                <Button
                  onClick={() => handlePurchase(bundle)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Get Bundle - Save ${savings.toFixed(2)}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StoreBundles;
