import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Download, Eye } from "lucide-react";
import { Link } from "react-router-dom";

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
}: ProductCardProps) => {
  return (
    <Card className="glass overflow-hidden hover-lift group cursor-pointer">
      <Link to={`/product/${id}`}>
        <div className="relative">
          {/* Product Image */}
          <div className="aspect-video bg-gradient-hero relative overflow-hidden">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop";
              }}
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Button variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                <Eye className="w-4 h-4 mr-2" />
                Quick View
              </Button>
            </div>

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {isNew && (
                <Badge className="bg-success text-success-foreground">
                  NEW
                </Badge>
              )}
              {isTopRated && (
                <Badge className="bg-warning text-warning-foreground">
                  TOP RATED
                </Badge>
              )}
            </div>

            {/* Rating */}
            <div className="absolute top-3 right-3 flex items-center space-x-1 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs text-white">{rating}</span>
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

            <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h3>

            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold gradient-text">
                ${price.toFixed(2)}
              </div>
              <Button 
                size="sm" 
                className="btn-gaming opacity-0 group-hover:opacity-100 transition-all duration-300"
                onClick={(e) => {
                  e.preventDefault();
                  // Add to cart functionality
                }}
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
};

export default ProductCard;