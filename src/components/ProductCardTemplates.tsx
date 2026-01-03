import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Download, ShoppingCart, Eye, Heart } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface ProductData {
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

interface ProductCardTemplateProps {
  product: ProductData;
  template: string;
  onPurchase?: (productId: string) => void;
  style?: any;
}

export const ProductCardTemplate: React.FC<ProductCardTemplateProps> = ({ 
  product, 
  template, 
  onPurchase,
  style = {}
}) => {
  const { formatPrice } = useCurrency();

  const handlePurchase = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPurchase?.(product.id);
  };

  // Template 1: Standard Card (like current)
  if (template === 'standard') {
    return (
      <div className="group relative">
        <div className="overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/20">
          <div className="aspect-[4/3.0] relative overflow-hidden bg-slate-700">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.isNew && (
                <Badge className="bg-green-600 text-white text-xs px-3 py-1">NEW</Badge>
              )}
              {product.isTopRated && (
                <Badge className="bg-green-600 text-white text-xs px-3 py-1">TOP RATED</Badge>
              )}
            </div>

            {/* Rating */}
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-800/90 backdrop-blur-sm rounded-full px-3 py-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold text-white">{product.rating.toFixed(1)}</span>
            </div>

            {/* Buy Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-900/85 backdrop-blur-sm">
              <Button onClick={handlePurchase} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl">
                <ShoppingCart className="w-4 h-4 mr-2" />
                {formatPrice(product.price)}
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 text-xs px-3 py-1">
                {product.category}
              </Badge>
              <div className="flex items-center text-xs text-slate-400">
                <Download className="w-3 h-3 mr-1" />
                <span>{product.downloads.toLocaleString()}</span>
              </div>
            </div>

            <h3 className="font-bold text-lg mb-3 line-clamp-2 leading-tight text-white">
              {product.title}
            </h3>

            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-400 transition-all duration-300 hover:scale-105">
                {formatPrice(product.price)}
              </div>
              <div className="text-xs uppercase tracking-wider text-slate-500">
                DIGITAL
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Template 2: Hover Reveal (like Payhip's second image)
  if (template === 'hover-reveal') {
    return (
      <div className="group relative overflow-hidden rounded-2xl aspect-[4/3.0] cursor-pointer">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Dark overlay that appears on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500" />
        
        {/* Content that slides up on hover */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
          <div className="text-white">
            <h3 className="text-2xl font-bold mb-2 text-center">{product.title}</h3>
            <div className="text-3xl font-bold text-center mb-4 text-blue-400">
              {formatPrice(product.price)}
            </div>
            <Button 
              onClick={handlePurchase}
              className="w-full bg-white text-black hover:bg-gray-100 font-bold py-3 rounded-xl transition-all duration-300"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Purchase
            </Button>
          </div>
        </div>

        {/* Title overlay (always visible) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent group-hover:opacity-0 transition-opacity duration-500">
          <h3 className="text-white text-xl font-bold text-center">{product.title}</h3>
        </div>

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product.isNew && (
            <Badge className="bg-green-600 text-white text-xs px-3 py-1">NEW</Badge>
          )}
          {product.isTopRated && (
            <Badge className="bg-blue-600 text-white text-xs px-3 py-1">TOP RATED</Badge>
          )}
        </div>
      </div>
    );
  }

  // Template 3: Minimal Clean
  if (template === 'minimal') {
    return (
      <div className="group relative">
        <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
          <div className="aspect-[4/3.0] relative overflow-hidden">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            
            {/* Heart icon */}
            <div className="absolute top-4 right-4 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Heart className="w-4 h-4 text-gray-600" />
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">{product.category}</span>
              <div className="flex items-center text-xs text-gray-400">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                {product.rating.toFixed(1)}
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.title}</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-900">{formatPrice(product.price)}</span>
              <Button 
                onClick={handlePurchase}
                size="sm" 
                className="bg-black text-white hover:bg-gray-800 rounded-lg px-4"
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Template 4: Gaming/Dark Theme
  if (template === 'gaming') {
    return (
      <div className="group relative">
        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg overflow-hidden hover:border-cyan-400 transition-all duration-500 hover:shadow-lg hover:shadow-cyan-500/20">
          <div className="aspect-[4/3.0] relative overflow-hidden">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            {/* Cyber grid overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
            
            {/* Glitch effect on hover */}
            <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          <div className="p-4 bg-gray-900">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono">
                {product.category.toUpperCase()}
              </Badge>
              <div className="flex items-center text-xs text-cyan-400 font-mono">
                <Download className="w-3 h-3 mr-1" />
                {product.downloads}
              </div>
            </div>

            <h3 className="font-bold text-white mb-3 line-clamp-2 font-mono">{product.title}</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-cyan-400 font-mono">{formatPrice(product.price)}</span>
              <Button 
                onClick={handlePurchase}
                className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold font-mono text-sm px-4 py-2"
              >
                ACQUIRE
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Template 5: Compact List
  if (template === 'compact-list') {
    return (
      <div className="group">
        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:bg-slate-800/70">
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1 truncate">{product.title}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>{product.category}</span>
              <span>•</span>
              <div className="flex items-center">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                {product.rating.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-blue-400">{formatPrice(product.price)}</span>
            <Button 
              onClick={handlePurchase}
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Buy
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Template 6: Magazine Style
  if (template === 'magazine') {
    return (
      <div className="group relative">
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500">
          <div className="aspect-[3/4] relative overflow-hidden">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 mb-3">
                {product.category}
              </Badge>
              <h3 className="text-xl font-bold mb-2">{product.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
                <Button 
                  onClick={handlePurchase}
                  className="bg-white text-black hover:bg-gray-100 font-semibold px-6"
                >
                  Buy Now
                </Button>
              </div>
            </div>

            {/* Rating badge */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-white text-sm font-semibold">{product.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default to standard if template not found
  return <div>Template not found</div>;
};

// Template selector component
export const ProductCardTemplateSelector: React.FC<{
  selectedTemplate: string;
  onTemplateChange: (template: string) => void;
}> = ({ selectedTemplate, onTemplateChange }) => {
  const templates = [
    { id: 'standard', name: 'Standard Card', description: 'Clean modern card with hover effects' },
    { id: 'hover-reveal', name: 'Hover Reveal', description: 'Price reveals on hover (like Payhip)' },
    { id: 'minimal', name: 'Minimal Clean', description: 'Simple white card design' },
    { id: 'gaming', name: 'Gaming/Cyber', description: 'Dark theme with neon accents' },
    { id: 'compact-list', name: 'Compact List', description: 'Horizontal layout for lists' },
    { id: 'magazine', name: 'Magazine Style', description: 'Tall card with overlay content' }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Product Card Templates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
              selectedTemplate === template.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <h4 className="font-semibold text-white mb-1">{template.name}</h4>
            <p className="text-sm text-slate-400">{template.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};