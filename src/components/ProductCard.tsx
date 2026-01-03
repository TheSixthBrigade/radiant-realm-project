import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Download, ShoppingCart, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useThemeStyle } from "@/contexts/ThemeContext";
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
  cardStyle?: 'standard' | 'hover-reveal' | 'minimal' | 'gaming' | 'compact';
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
  isFeatured = false,
  creatorId,
  cardStyle = 'standard',
}: ProductCardProps) => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { isCyberpunk } = useThemeStyle();
  const [loading, setLoading] = useState(false);
  const [creator, setCreator] = useState<{ display_name: string; avatar_url?: string } | null>(null);

  // Fetch creator info
  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', creatorId)
          .single();
        
        if (data) {
          setCreator(data);
        }
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
      console.log('Starting purchase process for product:', id);
      
      // First, get the product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (productError) {
        console.error('Product fetch error:', productError);
        throw new Error("Product not found");
      }

      console.log('Product found:', productData);

      // Then get the creator's profile with payment info
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('bio, display_name, paypal_email, paypal_onboarding_status, stripe_account_id, stripe_onboarding_status')
        .eq('user_id', productData.creator_id)
        .single();

      if (creatorError) {
        console.error('Creator fetch error:', creatorError);
        // Don't fail here, just assume no PayPal
      }

      console.log('Creator data:', creatorData);

      // Check if creator has at least one payment method
      const hasPayPal = creatorData?.paypal_email && creatorData?.paypal_onboarding_status === 'completed';
      const hasStripe = creatorData?.stripe_account_id && (creatorData?.stripe_onboarding_status === 'connected' || creatorData?.stripe_onboarding_status === 'complete');
      
      console.log('Payment methods:', { 
        hasPayPal, 
        hasStripe, 
        paypal_email: creatorData?.paypal_email,
        paypal_status: creatorData?.paypal_onboarding_status,
        stripe_account: creatorData?.stripe_account_id,
        stripe_status: creatorData?.stripe_onboarding_status
      });
      
      if (!hasPayPal && !hasStripe) {
        toast.error("Seller does not have a connected payment method. This product is currently unavailable for purchase.");
        return;
      }

      // Redirect to simple checkout
      console.log('Redirecting to checkout...');
      window.location.href = `/checkout?product_id=${id}`;
      
    } catch (error) {
      console.error('Purchase error:', error);
      if (error.message === "Product not found") {
        toast.error("Product not found. It may have been removed.");
      } else {
        toast.error("Unable to process purchase. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Card style variations
  const getCardStyleClasses = () => {
    const baseClasses = "overflow-hidden transition-all duration-500 relative";
    
    switch (cardStyle) {
      case 'hover-reveal':
        // Payhip style - image fills card, content reveals on hover
        return `${baseClasses} rounded-xl aspect-[4/3] cursor-pointer`;
      case 'minimal':
        return `${baseClasses} rounded-lg hover:shadow-lg ${
          isCyberpunk ? 'bg-transparent border-[rgba(33,150,243,0.1)]' : 'bg-white border-gray-200'
        }`;
      case 'gaming':
        return `${baseClasses} rounded-none border-2 hover:border-green-500 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] ${
          isCyberpunk ? 'bg-[#0d1117] border-green-500/30' : 'bg-slate-900 border-green-500/50'
        }`;
      case 'compact':
        return `${baseClasses} rounded-lg hover:shadow-md ${
          isCyberpunk ? 'bg-[#0d1117] border-[rgba(33,150,243,0.1)]' : 'bg-white border-gray-200'
        }`;
      default: // standard
        return `${baseClasses} rounded-2xl hover:-translate-y-2 ${
          isCyberpunk 
            ? 'bg-[#0d1117] border-[rgba(33,150,243,0.15)] hover:border-[rgba(33,150,243,0.7)] hover:shadow-2xl hover:shadow-[rgba(33,150,243,0.4)]'
            : 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 hover:shadow-2xl hover:shadow-black/20'
        }`;
    }
  };

  // Payhip-style hover reveal card
  if (cardStyle === 'hover-reveal') {
    return (
      <div className="group relative">
        <Link to={`/product/${id}`}>
          <Card className={getCardStyleClasses()}>
            {/* Full-size product image */}
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop";
              }}
            />
            
            {/* Dark overlay that appears on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            
            {/* Content that slides up from bottom on hover */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
              <div className="text-white text-center">
                <h3 className="text-2xl font-bold mb-3">{title}</h3>
                <div className="text-3xl font-bold mb-4 text-white">
                  {formatPrice(price)}
                </div>
                <Button 
                  onClick={handlePurchase}
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-gray-100 font-bold py-3 rounded-xl transition-all duration-300"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Purchase
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Title overlay (always visible at bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent group-hover:opacity-0 transition-opacity duration-500">
              <h3 className="text-white text-xl font-bold text-center">{title}</h3>
            </div>

            {/* Badges - top left (always visible) */}
            {(isNew || isTopRated) && (
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {isNew && (
                  <Badge className="bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    NEW
                  </Badge>
                )}
                {isTopRated && (
                  <Badge className="bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    TOP RATED
                  </Badge>
                )}
              </div>
            )}
          </Card>
        </Link>
      </div>
    );
  }

  // Standard and other card styles
  return (
    <div className="group relative">
      <Link to={`/product/${id}`}>
        <Card className={getCardStyleClasses()}>
          <div className="relative">
            {/* Product Image */}
            <div className={`aspect-[4/3.0] relative overflow-hidden ${
              isCyberpunk ? 'bg-[#161b22]' : 'bg-slate-700'
            }`}>
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop";
                }}
              />
              
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-300 ${
                isCyberpunk 
                  ? 'from-[#0d1117]/80 via-transparent to-transparent'
                  : 'from-slate-900/80 via-transparent to-transparent'
              }`} />
              
              {/* Badges - top left */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {isNew && (
                  <Badge className={`text-xs font-medium px-3 py-1 rounded-full ${
                    isCyberpunk 
                      ? 'bg-[rgba(16,185,129,0.2)] border border-[rgba(16,185,129,0.4)] text-emerald-400 font-mono'
                      : 'bg-green-600 text-white'
                  }`}>
                    NEW
                  </Badge>
                )}
                {isTopRated && (
                  <Badge className={`text-xs font-medium px-3 py-1 rounded-full ${
                    isCyberpunk 
                      ? 'bg-[rgba(245,158,11,0.2)] border border-[rgba(245,158,11,0.4)] text-amber-400 font-mono'
                      : 'bg-green-600 text-white'
                  }`}>
                    TOP RATED
                  </Badge>
                )}
              </div>

              {/* Rating - top right */}
              <div className={`absolute top-4 right-4 flex items-center gap-1 backdrop-blur-sm rounded-full px-3 py-1 ${
                isCyberpunk 
                  ? 'bg-[rgba(13,17,23,0.9)] border border-[rgba(33,150,243,0.2)]'
                  : 'bg-slate-800/90 border border-slate-600'
              }`}>
                <Star className={`w-3 h-3 fill-current ${
                  isCyberpunk ? 'text-[hsl(210,100%,50%)]' : 'text-yellow-400'
                }`} />
                <span className={`text-xs font-bold ${
                  isCyberpunk ? 'text-[hsl(210,40%,98%)] font-mono' : 'text-white'
                }`}>{rating.toFixed(1)}</span>
              </div>

              {/* Buy button overlay - appears on hover */}
              <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm ${
                isCyberpunk ? 'bg-[rgba(13,17,23,0.85)]' : 'bg-slate-900/85'
              }`}>
                <Button 
                  onClick={handlePurchase}
                  disabled={loading}
                  className={`font-bold px-6 py-3 rounded-xl text-sm shadow-lg transition-all duration-200 ${
                    isCyberpunk 
                      ? 'bg-[hsl(210,100%,50%)] hover:bg-[hsl(210,100%,45%)] text-white shadow-[rgba(33,150,243,0.4)] border border-[rgba(33,150,243,0.5)] font-mono'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/40'
                  }`}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {formatPrice(price)}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Product info section */}
            <div className={`p-6 ${
              isCyberpunk ? 'bg-[#0d1117]' : 'bg-slate-800/50'
            }`}>
              {/* Category and downloads */}
              <div className="flex items-center justify-between mb-3">
                <Badge className={`text-xs px-3 py-1 rounded-full ${
                  isCyberpunk 
                    ? 'bg-[rgba(33,150,243,0.1)] text-[hsl(210,100%,50%)] border border-[rgba(33,150,243,0.2)] font-mono'
                    : 'bg-green-600/20 text-green-400 border border-green-500/30'
                }`}>
                  {category}
                </Badge>
                <div className={`flex items-center text-xs ${
                  isCyberpunk ? 'text-[rgba(33,150,243,0.6)] font-mono' : 'text-slate-400'
                }`}>
                  <Download className="w-3 h-3 mr-1" />
                  <span>{downloads.toLocaleString()}</span>
                </div>
              </div>

              {/* Title */}
              <h3 className={`font-bold text-lg mb-3 line-clamp-2 leading-tight ${
                isCyberpunk ? 'text-[hsl(210,40%,98%)] font-mono' : 'text-white'
              }`}>
                {title}
              </h3>

              {/* Creator info */}
              {creator && (
                <div className={`flex items-center gap-2 mb-4 pb-3 border-b ${
                  isCyberpunk ? 'border-[rgba(33,150,243,0.1)]' : 'border-slate-700'
                }`}>
                  {creator.avatar_url ? (
                    <img 
                      src={creator.avatar_url} 
                      alt={creator.display_name}
                      className={`w-5 h-5 rounded-full object-cover border ${
                        isCyberpunk ? 'border-[rgba(33,150,243,0.3)]' : 'border-slate-600'
                      }`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isCyberpunk 
                        ? 'bg-[rgba(33,150,243,0.1)] border-[rgba(33,150,243,0.2)]'
                        : 'bg-slate-700 border-slate-600'
                    }`}>
                      <User className={`w-3 h-3 ${
                        isCyberpunk ? 'text-[hsl(210,100%,50%)]' : 'text-slate-400'
                      }`} />
                    </div>
                  )}
                  <span className={`text-sm ${
                    isCyberpunk ? 'text-[rgba(33,150,243,0.6)] font-mono' : 'text-slate-400'
                  }`}>
                    by {creator.display_name}
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold transition-all duration-300 hover:scale-105 ${
                  isCyberpunk ? 'text-[hsl(210,100%,50%)] font-mono' : 'text-green-400'
                }`}>
                  {formatPrice(price)}
                </div>
                <div className={`text-xs uppercase tracking-wider ${
                  isCyberpunk ? 'text-[rgba(33,150,243,0.4)] font-mono' : 'text-slate-500'
                }`}>
                  DIGITAL
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
};

export default ProductCard;