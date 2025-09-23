import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Grid3X3, List } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import Navigation from "@/components/Navigation";

const Shop = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Mock product data
  const products = [
    {
      id: "1",
      title: "Sword Combat System",
      price: 24.99,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
      rating: 4.8,
      downloads: 2340,
      category: "Scripts",
      isTopRated: true,
    },
    {
      id: "2",
      title: "Military Barrier Pack",
      price: 15.99,
      image: "https://images.unsplash.com/photo-1586953983027-d7508698d048?w=400&h=300&fit=crop",
      rating: 4.6,
      downloads: 1890,
      category: "3D Models",
      isTopRated: true,
    },
    {
      id: "3",
      title: "Village of Cobasna",
      price: 45.00,
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
      rating: 4.9,
      downloads: 567,
      category: "Maps",
      isTopRated: true,
    },
    {
      id: "4",
      title: "Five Seven Weapon",
      price: 8.99,
      image: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400&h=300&fit=crop",
      rating: 4.5,
      downloads: 3200,
      category: "3D Models",
    },
    {
      id: "5",
      title: "Advanced GUI System",
      price: 32.99,
      image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop",
      rating: 4.7,
      downloads: 1456,
      category: "Scripts",
      isNew: true,
    },
    {
      id: "6",
      title: "Character Animation Pack",
      price: 19.99,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
      rating: 4.4,
      downloads: 892,
      category: "Animations",
      isNew: true,
    },
  ];

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "scripts", label: "Scripts" },
    { value: "models", label: "3D Models" },
    { value: "maps", label: "Maps" },
    { value: "animations", label: "Animations" },
    { value: "sounds", label: "Sound Effects" },
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "rating", label: "Highest Rated" },
    { value: "downloads", label: "Most Downloaded" },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-4">Marketplace</h1>
          <p className="text-muted-foreground text-lg">
            Discover premium assets to elevate your Roblox game development
          </p>
        </div>

        {/* Filters */}
        <Card className="glass p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search for assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex gap-4 items-center">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 bg-card/50">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 bg-card/50">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex border border-border/30 rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {categories.find(c => c.value === selectedCategory)?.label}
                <button onClick={() => setSelectedCategory("all")} className="ml-1 hover:text-destructive">
                  ×
                </button>
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-destructive">
                  ×
                </button>
              </Badge>
            )}
          </div>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Showing {products.length} results
          </p>
        </div>

        {/* Products Grid */}
        <div className={`grid gap-6 ${
          viewMode === "grid" 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
            : "grid-cols-1"
        }`}>
          {products.map((product, index) => (
            <div 
              key={product.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ProductCard {...product} />
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button size="lg" variant="outline" className="bg-card/30 border-primary/30 hover:border-primary">
            Load More Products
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Shop;