import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  category: string | null;
}

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductIds: string[];
  onSelectProducts: (productIds: string[]) => void;
}

export const ProductPickerModal = ({
  isOpen,
  onClose,
  selectedProductIds,
  onSelectProducts,
}: ProductPickerModalProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedProductIds);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setSelectedIds(selectedProductIds);
    }
  }, [isOpen, selectedProductIds]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to select products",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, image_url, category")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    const filteredProductIds = filteredProducts.map((p) => p.id);
    setSelectedIds(filteredProductIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleSave = () => {
    onSelectProducts(selectedIds);
    onClose();
  };

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Select Products</h3>
            <p className="text-sm text-gray-400 mt-1">
              {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search and Actions */}
        <div className="p-4 border-b border-gray-700 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Select All
            </Button>
            <Button
              onClick={handleDeselectAll}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Deselect All
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {searchQuery ? "No products found matching your search" : "No products available"}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center bg-gray-900">
                      {isSelected && (
                        <div className="w-3 h-3 bg-cyan-500 rounded-sm"></div>
                      )}
                    </div>

                    {/* Product Image */}
                    <div className="w-full aspect-square bg-gray-700 rounded mb-2 overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <h4 className="text-sm font-semibold text-white truncate mb-1">
                      {product.title}
                    </h4>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-cyan-400 font-semibold">
                        ${product.price.toFixed(2)}
                      </p>
                      {product.category && (
                        <p className="text-xs text-gray-400 truncate">
                          {product.category}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            Save Selection
          </Button>
        </div>
      </div>
    </div>
  );
};
