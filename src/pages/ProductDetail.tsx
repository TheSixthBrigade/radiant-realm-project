import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Download, Heart, Share2, ShoppingCart, Shield, Zap, Clock } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";

const ProductDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Mock product data
  const product = {
    id: id,
    title: "Advanced Sword Combat System",
    price: 24.99,
    originalPrice: 34.99,
    description: "A comprehensive combat system featuring advanced sword mechanics, combos, and visual effects. Perfect for RPG and action games.",
    longDescription: `This advanced sword combat system provides everything you need to create engaging melee combat in your Roblox game. 

Features include:
• Advanced combo system with 15+ unique attacks
• Realistic physics-based combat
• Customizable damage and effects
• Smooth animations and transitions
• Easy integration with existing systems
• Comprehensive documentation
• Regular updates and support`,
    images: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop",
    ],
    rating: 4.8,
    reviewCount: 127,
    downloads: 2340,
    category: "Scripts",
    tags: ["Combat", "Sword", "RPG", "Advanced"],
    author: {
      name: "GameDevPro",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      verified: true,
      sales: 850,
    },
    features: [
      "15+ Unique Combat Moves",
      "Physics-Based System",
      "Customizable Effects",
      "Easy Integration",
      "Documentation Included",
      "Free Updates",
    ],
    requirements: [
      "Roblox Studio",
      "Basic scripting knowledge",
      "R15 Character Support",
    ],
    isTopRated: true,
    isNew: false,
  };

  const handleAddToCart = () => {
    toast({
      title: "Added to Cart",
      description: `${product.title} has been added to your cart.`,
    });
  };

  const handleBuyNow = () => {
    toast({
      title: "Redirecting to Checkout",
      description: "Taking you to secure payment...",
    });
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <Card className="glass overflow-hidden">
              <img
                src={product.images[selectedImage]}
                alt={product.title}
                className="w-full aspect-video object-cover"
              />
            </Card>
            
            <div className="grid grid-cols-3 gap-4">
              {product.images.map((image, index) => (
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
                {product.isTopRated && (
                  <Badge className="bg-warning text-warning-foreground">TOP RATED</Badge>
                )}
                {product.isNew && (
                  <Badge className="bg-success text-success-foreground">NEW</Badge>
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
                    {product.rating} ({product.reviewCount} reviews)
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
                      ${product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">
                        ${product.originalPrice}
                      </span>
                    )}
                  </div>
                  {product.originalPrice && (
                    <p className="text-sm text-success font-medium">
                      Save ${(product.originalPrice - product.price).toFixed(2)} 
                      ({Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% off)
                    </p>
                  )}
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
                  className="w-full btn-gaming text-lg py-3"
                  onClick={handleBuyNow}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Buy Now
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
            <Card className="glass p-4">
              <div className="flex items-center gap-3">
                <img
                  src={product.author.avatar}
                  alt={product.author.name}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{product.author.name}</h3>
                    {product.author.verified && (
                      <Badge variant="outline" className="text-xs">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.author.sales} total sales
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Follow
                </Button>
              </div>
            </Card>
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
                <p className="text-lg mb-4">{product.description}</p>
                <div className="whitespace-pre-line">{product.longDescription}</div>
              </div>
            </TabsContent>
            
            <TabsContent value="features" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="requirements" className="mt-6">
              <div className="space-y-3">
                {product.requirements.map((requirement, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <span>{requirement}</span>
                  </div>
                ))}
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