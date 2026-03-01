import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Download, ArrowLeft, Sparkles } from "lucide-react";
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
        if (productId) {
          const { data: product } = await supabase
            .from('products').select('*').eq('id', productId).single();
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
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/40 text-sm">Verifying your payment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Violet glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />

      <Navigation />

      <div className="relative z-10 flex items-center justify-center min-h-[80vh] px-6 pt-20">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="relative inline-flex mb-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)' }}>
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-violet-400 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          <p className="text-violet-400 text-xs uppercase tracking-widest mb-3 font-medium">Order confirmed</p>
          <h1 className="text-5xl font-black mb-4 leading-tight" style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
            Payment<br />successful.
          </h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Your digital assets are ready. Thank you for your purchase.
          </p>

          {productData && (
            <div className="border border-white/[0.07] rounded-2xl p-5 mb-8 bg-[#0a0a0a] text-left">
              <p className="text-white/30 text-xs uppercase tracking-wider mb-3">Purchase details</p>
              <p className="text-white font-semibold text-sm mb-1">{productData.title}</p>
              <p className="text-violet-400 font-bold">${Number(productData.price).toFixed(2)}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/downloads"
              className="magnet-btn magnet-btn-primary px-6 h-12 rounded-xl text-sm font-semibold">
              <span className="magnet-btn-content flex items-center gap-2">
                <Download className="w-4 h-4" /> View Downloads
              </span>
            </Link>
            <Link to="/shop"
              className="magnet-btn magnet-btn-outline px-6 h-12 rounded-xl text-sm font-semibold">
              <span className="magnet-btn-content flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Continue Shopping
              </span>
            </Link>
          </div>

          <p className="text-white/20 text-xs mt-8">
            Need help?{" "}
            <Link to="/contact" className="text-violet-400/60 hover:text-violet-400 transition-colors">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
