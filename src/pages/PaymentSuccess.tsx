import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Download, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const productId = searchParams.get('product_id');
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId && !productId) {
        toast.error("No order information found");
        setLoading(false);
        return;
      }

      try {
        // Fetch product details
        if (productId) {
          const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
          
          setProductData(product);
        }

        setLoading(false);
        toast.success("Payment successful!");
      } catch (error) {
        console.error("Error verifying payment:", error);
        toast.error("Error verifying payment");
        setLoading(false);
      }
    };

    verifyPayment();
  }, [orderId, productId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Verifying your payment...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <Card className="glass p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold gradient-text mb-2">Payment Successful!</h1>
              <p className="text-muted-foreground text-lg">
                Thank you for your purchase. Your payment has been processed successfully.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  Your digital assets are now available for download
                </p>
              </div>

              {productData && (
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Purchase Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Product: {productData.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Amount: ${productData.price}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="flex-1 sm:flex-none">
                <Link to="/downloads">
                  <Download className="w-4 h-4 mr-2" />
                  View Downloads
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link to="/shop">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Link>
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Need help? <Link to="/contact" className="text-primary hover:underline">Contact Support</Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;