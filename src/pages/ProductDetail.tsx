import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Download, Heart, Share2, ShoppingCart, Shield, Zap, Clock } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO, ProductSchema, BreadcrumbSchema } from "@/components/SEO";
import type { Product } from "@/hooks/useProducts";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError("Product ID not provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First get the product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (productError) {
          if (productError.code === 'PGRST116') {
            setError("Product not found");
          } else {
            console.error('Product query error:', productError);
            throw productError;
          }
          return;
        }

        if (!productData) {
          setError("Product not found");
          return;
        }

        // Try to get creator info
        let creator: {
          display_name: string;
          avatar_url?: string;
          is_creator: boolean;
          stripe_account_id?: string;
          stripe_onboarding_status?: string;
        } | null = null;
        if (productData.creator_id) {
          try {
            const { data: creatorData } = await supabase
              .from('profiles')
              .select('display_name, avatar_url, is_creator, stripe_account_id, stripe_onboarding_status')
              .eq('user_id', productData.creator_id)
              .single();
            creator = creatorData;
          } catch (err) {
            console.log('Creator not found for product:', productData.id);
          }
        }

        // Try to get store info
        let store = null;
        if (productData.store_id) {
          try {
            const { data: storeData } = await supabase
              .from('stores')
              .select('store_name, store_slug')
              .eq('id', productData.store_id)
              .single();
            store = storeData;
          } catch (err) {
            console.log('Store not found for product:', productData.id);
          }
        }

        setProduct({
          ...productData,
          creator,
          store,
        });
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Check if user is following the creator
  useEffect(() => {
    const checkFollowing = async () => {
      if (!user || !product?.creator_id) return;

      try {
        let isFollowingResult = false;
        
        try {
          const { data } = await supabase
            .rpc('is_following', {
              follower_id_param: user.id,
              following_id_param: product.creator_id
            });
          isFollowingResult = !!data;
        } catch (rpcError) {
          // Fallback to direct query if RPC doesn't exist
          try {
            const { data } = await supabase
              .from('follows')
              .select('id')
              .eq('follower_id', user.id)
              .eq('following_id', product.creator_id)
              .single();
            isFollowingResult = !!data;
          } catch (fallbackError) {
            // Table doesn't exist yet
            isFollowingResult = false;
          }
        }

        setIsFollowing(isFollowingResult);
      } catch (error) {
        // Not following or table doesn't exist yet
        setIsFollowing(false);
      }
    };

    checkFollowing();
  }, [user, product]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading product...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
              <p className="text-muted-foreground mb-6">{error || "The product you're looking for doesn't exist."}</p>
              <Button onClick={() => navigate('/shop')}>
                Browse Products
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create images array with fallback
  const images = product.image_url ? [product.image_url] : [
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop"
  ];

  const handleAddToCart = () => {
    toast({
      title: "Added to Cart",
      description: `${product.title} has been added to your cart.`,
    });
  };

  const handleFollow = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to follow creators.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!product?.creator_id) return;

    setFollowLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        let unfollowError = null;
        
        try {
          const { error } = await supabase
            .rpc('unfollow_creator', {
              follower_id_param: user.id,
              following_id_param: product.creator_id
            });
          unfollowError = error;
        } catch (rpcError) {
          // Fallback to direct delete if RPC doesn't exist
          const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', product.creator_id);
          unfollowError = error;
        }

        if (unfollowError) throw unfollowError;

        setIsFollowing(false);
        toast({
          title: "Unfollowed",
          description: `You unfollowed ${product.creator?.display_name || 'this creator'}.`,
        });
      } else {
        // Follow
        let followError = null;
        
        try {
          const { error } = await supabase
            .rpc('follow_creator', {
              follower_id_param: user.id,
              following_id_param: product.creator_id
            });
          followError = error;
        } catch (rpcError) {
          // Fallback to direct insert if RPC doesn't exist
          const { error } = await supabase
            .from('follows')
            .insert({
              follower_id: user.id,
              following_id: product.creator_id,
            });
          followError = error;
        }

        if (followError) {
          // Check if it's a duplicate error
          if (followError.code === '23505') {
            setIsFollowing(true);
            toast({
              title: "Already Following",
              description: `You're already following ${product.creator?.display_name || 'this creator'}!`,
            });
            return;
          }
          throw followError;
        }

        setIsFollowing(true);
        toast({
          title: "Following",
          description: `You're now following ${product.creator?.display_name || 'this creator'}!`,
        });
      }
    } catch (error: any) {
      console.error('Follow error:', error);
      toast({
        title: "Error",
        description: error.message || "The follow system is being set up. Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to make a purchase.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    // Check if seller has Stripe connected
    const hasStripe = product?.creator?.stripe_account_id && (product?.creator?.stripe_onboarding_status === 'connected' || product?.creator?.stripe_onboarding_status === 'complete');
    
    if (!hasStripe) {
      toast({
        title: "Purchase Unavailable",
        description: "This seller hasn't connected Stripe yet. Purchases are not available.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to checkout page with product ID
    navigate(`/checkout?product_id=${product.id}`);
  };

  return (
    <div className="min-h-screen bg-[#EDEDED] dark:bg-[#0a0e14] transition-colors duration-500 relative">
      {product && (
        <>
          <SEO 
            title={product.title}
            description={product.description || `${product.title} - Premium digital asset available on Vectabase. ${product.category} for game developers.`}
            url={`/product/${product.id}`}
            image={product.image_url || undefined}
            type="product"
            price={product.price}
            currency="USD"
            availability="in stock"
            category={product.category}
            rating={product.rating}
            reviewCount={product.downloads}
          />
          <ProductSchema 
            name={product.title}
            description={product.description || `${product.title} - Premium digital asset`}
            image={product.image_url || '/placeholder.svg'}
            price={product.price}
            category={product.category}
            rating={product.rating}
            reviewCount={product.downloads}
            seller={product.creator?.display_name}
            url={`/product/${product.id}`}
          />
          <BreadcrumbSchema items={[
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/shop' },
            { name: product.category, url: `/shop?category=${product.category}` },
            { name: product.title, url: `/product/${product.id}` }
          ]} />
        </>
      )}
      
      {/* Dotted Grid Pattern - Dark Mode Only */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(0, 168, 232, 0.4) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          backgroundPosition: '0 0, 15px 15px'
        }} />
      </div>

      {/* Animated Grid Lines - Dark Mode Only */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none opacity-15">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0, 168, 232, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 168, 232, 0.2) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          animation: 'gridMove 20s linear infinite'
        }} />
      </div>
      
      {/* Glowing Orbs - Dark Mode Only */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <Card className="glass overflow-hidden">
              <img
                src={images[selectedImage]}
                alt={product.title}
                className="w-full aspect-video object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop";
                }}
              />
            </Card>
            
            <div className="grid grid-cols-3 gap-4">
              {images.map((image, index) => (
                <Card
                  key={index}
                  className={`glass overflow-hidden cursor-pointer transition-all ${
                    selectedImage === index ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"
                  }`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img
                    src={image}
                    alt={`${product.title} ${index + 1}`}
                    className="w-full aspect-video object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop";
                    }}
                  />
                </Card>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{product.category}</Badge>
                {product.is_top_rated && (
                  <Badge className="bg-orange-500 text-white">TOP RATED</Badge>
                )}
                {product.is_new && (
                  <Badge className="bg-green-500 text-white">NEW</Badge>
                )}
              </div>
              
              <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating)
                          ? "text-yellow-400 fill-current"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {product.rating.toFixed(1)} ({product.downloads} downloads)
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <Download className="w-4 h-4 mr-1" />
                  {product.downloads.toLocaleString()} downloads
                </div>
              </div>
            </div>

            {/* Price */}
            <Card className="glass p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold gradient-text">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full text-lg py-3"
                  onClick={handleBuyNow}
                  disabled={!product?.creator?.stripe_account_id || (product?.creator?.stripe_onboarding_status !== 'connected' && product?.creator?.stripe_onboarding_status !== 'complete')}
                  title={(!product?.creator?.stripe_account_id || (product?.creator?.stripe_onboarding_status !== 'connected' && product?.creator?.stripe_onboarding_status !== 'complete')) ? "Seller hasn't connected Stripe yet" : ""}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {(product?.creator?.stripe_account_id && (product?.creator?.stripe_onboarding_status === 'connected' || product?.creator?.stripe_onboarding_status === 'complete')) ? 'Buy Now' : 'Unavailable'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full bg-card/30 border-primary/30 hover:border-primary"
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </Button>
              </div>

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-success" />
                  Secure payment & instant download
                </div>
                <div className="flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-primary" />
                  Free updates for life
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-secondary" />
                  24/7 support included
                </div>
              </div>
            </Card>

            {/* Author */}
            {product.creator && (
              <Card className="glass p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={product.creator.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"}
                    alt={product.creator.display_name}
                    className="w-12 h-12 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{product.creator.display_name}</h3>
                      {product.creator.is_creator && (
                        <Badge variant="outline" className="text-xs">
                          ✓ Verified Creator
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {product.store?.store_name || "Independent Creator"}
                    </p>
                  </div>
                  <Button 
                    variant={isFollowing ? "secondary" : "outline"} 
                    size="sm"
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={isFollowing ? "dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-400/30" : ""}
                  >
                    {followLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      isFollowing ? "Following" : "Follow"
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Product Details Tabs */}
        <Card className="glass mt-12">
          <Tabs defaultValue="description" className="p-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="mt-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-lg mb-4">{product.description || "No description available for this product."}</p>
              </div>
            </TabsContent>
            
            <TabsContent value="features" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>High Quality Asset</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Easy Integration</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Documentation Included</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Regular Updates</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="requirements" className="mt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span>Roblox Studio</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span>Basic scripting knowledge (for scripts)</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6">
              <p className="text-muted-foreground">Reviews coming soon...</p>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default ProductDetail;