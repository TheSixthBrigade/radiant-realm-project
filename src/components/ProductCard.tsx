import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Download, ShoppingCart, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  image: string;
  rating: number;
  downloads: number;
  category: string;
  isTopRated?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  creatorId?: string;
}

const ProductCard = ({
  id,
  title,
  price,
  image,
  rating,
  downloads,
  category,
  isTopRated = false,
  isNew = false,
  creatorId,
}: ProductCardProps) => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [creator, setCreator] = useState<{ display_name: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', creatorId)
          .single();
        if (data) setCreator(data);
      } catch (error) {
        console.error('Error fetching creator:', error);
      }
    };
    fetchCreator();
  }, [creatorId]);

  const handlePurchase = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Please sign in to make a purchase");
      return;
    }

    setLoading(true);
    
    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (productError) throw new Error("Product not found");

      const { data: creatorData } = await supabase
        .from('profiles')
        .select('paypal_email, paypal_onboarding_status, stripe_account_id, stripe_onboarding_status')
        .eq('user_id', productData.creator_id)
        .single();

      const hasPayPal = creatorData?.paypal_email && creatorData?.paypal_onboarding_status === 'completed';
      const hasStripe = creatorData?.stripe_account_id && (creatorData?.stripe_onboarding_status === 'connected' || creatorData?.stripe_onboarding_status === 'complete');
      
      if (!hasPayPal && !hasStripe) {
        toast.error("Seller does not have a connected payment method.");
        return;
      }

      window.location.href = `/checkout?product_id=${id}`;
    } catch (error) {
      toast.error("Unable to process purchase. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/product/${id}`}>
        <Card className="overflow-hidden transition-all duration-300 rounded-xl bg-slate-900/80 border border-slate-800/60 hover:border-slate-700 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1">
          {/* Product Image */}
          <div className="aspect-[16/10] relative overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
            {/* Solid background layer - always visible, prevents any gap */}
            <div className="absolute inset-0" style={{ backgroundColor: '#1e293b' }} />
            
            {/* Image layer - fades out on hover */}
            <div 
              className="absolute inset-0 transition-opacity duration-300 ease-in-out"
              style={{ opacity: isHovered ? 0 : 1 }}
            >
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent pointer-events-none" />
            </div>
            
            {/* Button layer - fades in on hover */}
            <div 
              className="absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-300 ease-in-out"
              style={{ 
                opacity: isHovered ? 1 : 0,
                pointerEvents: isHovered ? 'auto' : 'none'
              }}
            >
              <Button 
                onClick={handlePurchase}
                disabled={loading}
                size="sm"
                className={`bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all duration-300 ease-out ${isHovered ? 'scale-100 translate-y-0' : 'scale-75 translate-y-4'}`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-1.5" />
                    {formatPrice(price)}
                  </>
                )}
              </Button>
            </div>
            
            {/* Badges - always visible */}
            {(isNew || isTopRated) && (
              <div className="absolute top-2 left-2 flex flex-col gap-1 z-30">
                {isNew && (
                  <Badge className="bg-green-600/90 text-white text-[10px] font-medium px-2 py-0.5 rounded">
                    NEW
                  </Badge>
                )}
                {isTopRated && (
                  <Badge className="bg-amber-500/90 text-white text-[10px] font-medium px-2 py-0.5 rounded">
                    TOP
                  </Badge>
                )}
              </div>
            )}

            {/* Rating - always visible */}
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm rounded px-2 py-0.5 z-30">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[11px] font-medium text-white">{rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Info Section */}
          <div className="p-3 bg-slate-900/80">
            {/* Category & Downloads */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">{category}</span>
              <div className="flex items-center text-[10px] text-slate-500">
                <Download className="w-3 h-3 mr-0.5" />
                {downloads.toLocaleString()}
              </div>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-sm text-white mb-1.5 line-clamp-1 leading-tight">
              {title}
            </h3>

            {/* Creator */}
            {creator && (
              <div className="flex items-center gap-1.5 mb-2">
                {creator.avatar_url ? (
                  <img 
                    src={creator.avatar_url} 
                    alt={creator.display_name}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center">
                    <User className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                )}
                <span className="text-[11px] text-slate-400 truncate">
                  {creator.display_name}
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-base font-bold text-green-400">
                {formatPrice(price)}
              </span>
              <span className="text-[9px] text-slate-600 uppercase tracking-wider">
                Digital
              </span>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
};

export default ProductCard;
