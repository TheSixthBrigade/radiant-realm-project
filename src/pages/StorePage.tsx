import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Star, Download, Calendar, ExternalLink } from "lucide-react";
import Navigation from "@/components/Navigation";
import ProductCard from "@/components/ProductCard";
import { useStores } from "@/hooks/useStores";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";

const StorePage = () => {
  const { storeSlug } = useParams();
  const { stores } = useStores();
  const { products } = useProducts();
  const [store, setStore] = useState<any>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      if (!storeSlug) return;

      try {
        setLoading(true);
        const { data: storeData, error } = await supabase
          .from('stores')
          .select('*')
          .eq('store_slug', storeSlug)
          .single();

        if (error) throw error;
        setStore(storeData);

        // Fetch products for this store
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeData.id)
          .order('created_at', { ascending: false });

        if (productError) throw productError;
        setStoreProducts(productData || []);
      } catch (error) {
        console.error('Error fetching store:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [storeSlug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="text-center">Loading store...</div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <Card className="glass p-8 text-center max-w-md mx-auto">
            <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-4">Store Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The store you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/shop">
              <Button className="btn-gaming">Browse Marketplace</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Products",
      value: storeProducts.length,
      icon: Store,
    },
    {
      label: "Total Sales",
      value: store.total_sales || 0,
      icon: Download,
    },
    {
      label: "Store Rating",
      value: "4.8",
      icon: Star,
    },
    {
      label: "Joined",
      value: new Date(store.created_at).getFullYear(),
      icon: Calendar,
    },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        {/* Store Header */}
        <div className="relative mb-12">
          {/* Banner */}
          {store.banner_url && (
            <div
              className="h-48 md:h-64 rounded-xl bg-cover bg-center mb-6"
              style={{ backgroundImage: `url(${store.banner_url})` }}
            />
          )}
          
          {/* Store Info */}
          <Card className="glass p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Logo */}
              <div className="flex-shrink-0">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.store_name}
                    className="w-24 h-24 rounded-xl object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <Store className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>

              {/* Store Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold gradient-text">{store.store_name}</h1>
                  <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
                    Verified
                  </Badge>
                </div>
                
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {store.description || "Welcome to our store! We create amazing digital assets for game developers."}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{stat.value}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0">
                <Button size="lg" className="btn-gaming">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Follow Store
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Store Content */}
        <Tabs defaultValue="products" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Products ({storeProducts.length})</h2>
            </div>

            {storeProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {storeProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <ProductCard
                      id={product.id}
                      title={product.title}
                      price={product.price}
                      image={product.image_url}
                      rating={product.rating}
                      downloads={product.downloads}
                      category={product.category}
                      isTopRated={product.is_top_rated}
                      isNew={product.is_new}
                      isFeatured={product.is_featured}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="glass p-12 text-center">
                <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Products Yet</h3>
                <p className="text-muted-foreground">
                  This store hasn't uploaded any products yet. Check back soon!
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="about" className="space-y-6">
            <Card className="glass p-8">
              <h2 className="text-2xl font-bold mb-4">About {store.store_name}</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {store.description || "This store owner hasn't added a detailed description yet."}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border/30">
                  <div>
                    <h3 className="font-semibold mb-2">Store Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Joined:</span>
                        <span>{new Date(store.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Sales:</span>
                        <span>{store.total_sales || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="secondary" className="bg-success/20 text-success">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Scripts</Badge>
                      <Badge variant="outline">3D Models</Badge>
                      <Badge variant="outline">Animations</Badge>
                      <Badge variant="outline">Game Assets</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <Card className="glass p-12 text-center">
              <Star className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Reviews Coming Soon</h3>
              <p className="text-muted-foreground">
                Store reviews and ratings will be available soon!
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StorePage;