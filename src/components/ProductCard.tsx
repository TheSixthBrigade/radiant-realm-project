import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Download, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

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
}: ProductCardProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Please sign in to make a purchase");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { productId: id }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 group">
      <Link to={`/product/${id}`}>
        <div className="relative">
          {/* Product Image */}
          <div className="aspect-video bg-muted relative overflow-hidden">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop";
              }}
            />
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {isNew && (
                <Badge className="bg-green-500 text-white text-xs">
                  NEW
                </Badge>
              )}
              {isTopRated && (
                <Badge className="bg-orange-500 text-white text-xs">
                  TOP RATED
                </Badge>
              )}
              {isFeatured && (
                <Badge className="bg-primary text-primary-foreground text-xs">
                  FEATURED
                </Badge>
              )}
            </div>

            {/* Rating */}
            <div className="absolute top-3 right-3 flex items-center space-x-1 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs text-white">{rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
                <Download className="w-3 h-3 mr-1" />
                {downloads.toLocaleString()}
              </div>
            </div>

            <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>

            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-primary">
                ${price.toFixed(2)}
              </div>
              <Button 
                size="sm" 
                onClick={handlePurchase}
                disabled={loading}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Buy Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
};

export default ProductCard;