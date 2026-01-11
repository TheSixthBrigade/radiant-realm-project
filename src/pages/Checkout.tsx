import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Lock, ArrowLeft, CreditCard } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAffiliateRef } from "@/lib/affiliateTracking";

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product_id');
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;

      try {
        console.log('Fetching product for checkout:', productId);
        
        // Get the product with creator info
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*, store:stores(id, store_name)')
          .eq('id', productId)
          .single();

        if (productError) {
          console.error('Product error:', productError);
          throw productError;
        }

        console.log('Product data:', productData);

        // Get the creator's profile with payment info
        const { data: creatorData, error: creatorError } = await supabase
          .from('profiles')
          .select('bio, display_name, stripe_connect_account_id, stripe_connect_status')
          .eq('user_id', productData.creator_id)
          .single();

        if (creatorError) {
          console.error('Creator error:', creatorError);
        }

        console.log('Creator data:', creatorData);
        
        // Check if creator has Stripe connected
        const hasStripe = creatorData?.stripe_connect_account_id && (creatorData?.stripe_connect_status === 'connected' || creatorData?.stripe_connect_status === 'complete');
        
        if (!hasStripe) {
          toast.error('Seller has not connected Stripe. This product is currently unavailable for purchase.');
          return;
        }
        
        // Combine the data
        const enrichedProduct = {
          ...productData,
          creator_stripe_account: creatorData?.stripe_connect_account_id,
          creator_display_name: creatorData?.display_name,
          has_stripe: hasStripe
        };
        
        console.log('Setting product data:', {
          title: enrichedProduct.title,
          has_stripe: hasStripe,
          creator_stripe_account: creatorData?.stripe_connect_account_id
        });
        
        setProduct(enrichedProduct);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Product not found');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleStripeCheckout = async () => {
    try {
      setProcessing(true);
      toast.loading("Creating checkout session...", { id: "stripe" });

      // Get affiliate ref code from URL params first, then robust storage utility
      const urlParams = new URLSearchParams(window.location.search);
      const urlRef = urlParams.get('ref');
      
      // Prefer URL ref (just passed), fallback to stored ref
      const validAffiliateRef = urlRef || getAffiliateRef();
      
      console.log('Affiliate ref - URL:', urlRef, 'stored:', getAffiliateRef(), 'using:', validAffiliateRef);

      console.log('Calling stripe-create-checkout with:', {
        productId: product.id,
        buyerId: user?.id,
        affiliateRef: validAffiliateRef
      });

      // Call edge function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: {
          productId: product.id,
          buyerId: user?.id,
          affiliateRef: validAffiliateRef
        }
      });

      console.log('Stripe checkout response:', data, 'error:', error);

      if (error) {
        console.error('Stripe checkout error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      // Check if the edge function returned an error
      if (data?.success === false) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned from server');
      }

      console.log('Redirecting to Stripe checkout...');
      toast.success("Redirecting to Stripe...", { id: "stripe" });
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
      
    } catch (error: any) {
      console.error('Error creating Stripe checkout:', error);
      toast.error(error.message || 'Failed to create checkout session', { id: "stripe" });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">Product Not Found</h1>
            <Button asChild>
              <Link to="/shop">Browse Marketplace</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDEDED] dark:bg-[#0a0e14] transition-colors duration-500 relative">
      {/* Background Effects */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(0, 168, 232, 0.4) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          backgroundPosition: '0 0, 15px 15px'
        }} />
      </div>

      <div className="hidden dark:block fixed inset-0 pointer-events-none opacity-15">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0, 168, 232, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 168, 232, 0.2) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          animation: 'gridMove 20s linear infinite'
        }} />
      </div>
      
      <div className="hidden dark:block fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button asChild variant="ghost" className="mb-4">
              <Link to="/shop">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to marketplace
              </Link>
            </Button>
            <h1 className="text-3xl font-bold dark:text-cyan-400">Checkout</h1>
            <p className="text-muted-foreground dark:text-cyan-300/70">Complete your purchase securely - payment goes directly to creator</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Form */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Lock className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-success">Secure Checkout</span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
                  
                  {/* Payment Method Info */}
                  <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
                    <h4 className="font-medium mb-2">Direct Payment to Creator</h4>
                    <p className="text-sm text-muted-foreground">
                      Payment goes directly to the creator. They receive 95%, platform takes 5% commission.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="account_email">Account Email</Label>
                      <Input
                        id="account_email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Your account email for order confirmation</p>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <div className="p-3 bg-muted rounded-lg border">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span className="font-medium">Credit/Debit Card</span>
                          <span className="text-sm text-muted-foreground">via Stripe</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment Button */}
                <div className="space-y-4">
                  <Button
                    onClick={handleStripeCheckout}
                    disabled={processing}
                    className="w-full h-12"
                  >
                    {processing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay with Card
                      </>
                    )}
                  </Button>
                  
                  {processing && (
                    <div className="text-center py-2">
                      <p className="text-sm text-primary">Processing payment...</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    Secure payment powered by Stripe - funds go directly to creator
                  </p>
                </div>
              </div>
            </Card>

            {/* Order Summary */}
            <Card className="p-6 h-fit">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{product.title}</h4>
                    <p className="text-sm text-muted-foreground">Digital Download</p>
                    <p className="text-sm text-muted-foreground">by {product.creator_display_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${product.price.toFixed(2)}</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Product Price</span>
                    <span>${product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>• To Creator (95%)</span>
                    <span>${(product.price * 0.95).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>• Platform Fee (5%)</span>
                    <span>${(product.price * 0.05).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${product.price.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg border border-border">
                  <h4 className="font-medium mb-2">What you'll get:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Instant download access</li>
                    <li>• Lifetime access to files</li>
                    <li>• Commercial usage rights</li>
                    <li>• Email support from creator</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
