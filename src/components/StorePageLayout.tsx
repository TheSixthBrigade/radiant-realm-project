import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Users, Star, ExternalLink } from "lucide-react";
import Navigation from "@/components/Navigation";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Store {
  id: string;
  store_name: string;
  store_description: string;
  store_logo: string;
  store_banner: string;
  theme_colors: any;
  is_public: boolean;
  owner_id: string;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  image_url: string;
  rating: number;
  downloads: number;
  category: string;
}

const StorePageLayout = () => {
  const { storeSlug } = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!storeSlug) return;

      try {
        setLoading(true);
        
        // Fetch store info
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('store_slug', storeSlug)
          .single();

        if (storeError) {
          throw new Error('Store not found');
        }

        setStore(storeData);

        // Fetch store products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeData.id)
          .eq('is_active', true);

        if (productsError) {
          console.error('Error fetching products:', productsError);
        } else {
          setProducts(productsData || []);
        }

      } catch (err) {
        console.error('Error fetching store:', err);
        setError(err instanceof Error ? err.message : 'Failed to load store');
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [storeSlug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading store...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">Store Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The store you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <a href="/shop">Browse Marketplace</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const themeColors = store.theme_colors || { primary: "#3b82f6", secondary: "#1e40af" };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Store Header */}
      <div 
        className="relative pt-24 pb-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
        style={{
          background: `linear-gradient(135deg, ${themeColors.primary}15, ${themeColors.secondary}15)`
        }}
      >
        {store.store_banner && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${store.store_banner})` }}
          />
        )}
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Store Logo */}
            {store.store_logo && (
              <div className="mb-6">
                <img
                  src={store.store_logo}
                  alt={store.store_name}
                  className="w-24 h-24 rounded-full mx-auto border-4 border-white dark:border-slate-700 shadow-lg"
                />
              </div>
            )}

            {/* Store Name */}
            <h1 className="text-5xl md:text-6xl font-black mb-4" style={{ color: themeColors.primary }}>
              {store.store_name}
            </h1>

            {/* Store Description */}
            {store.store_description && (
              <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
                {store.store_description}
              </p>
            )}

            {/* Store Stats */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Users className="w-5 h-5" />
                <span>{products.length} Products</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Star className="w-5 h-5" />
                <span>4.8 Rating</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Globe className="w-5 h-5" />
                <span>Public Store</span>
              </div>
            </div>

            {/* Store Actions */}
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                className="rounded-2xl"
                style={{ 
                  backgroundColor: themeColors.primary,
                  borderColor: themeColors.primary 
                }}
              >
                Follow Store
              </Button>
              <Button variant="outline" size="lg" className="rounded-2xl">
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Website
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Store Products */}
      <div className="container mx-auto px-6 py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4">Products from {store.store_name}</h2>
          <p className="text-muted-foreground">
            Discover amazing digital assets from this creator
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image_url || "/placeholder.svg"}
                rating={product.rating || 4.5}
                downloads={product.downloads || 0}
                category={product.category}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4">No Products Yet</h3>
            <p className="text-muted-foreground mb-8">
              This store hasn't uploaded any products yet. Check back later!
            </p>
            <Button asChild>
              <a href="/shop">Browse Other Stores</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorePageLayout;