import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  slug: string;
  productIds: string[];
  isVisible: boolean;
}

interface Product {
  id: string;
  title: string;
  image_url: string | null;
}

interface CollectionManagerProps {
  collections: Collection[];
  products: Product[];
  onChange: (collections: Collection[]) => void;
}

export const CollectionManager = ({
  collections,
  products,
  onChange,
}: CollectionManagerProps) => {
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);

  const addCollection = () => {
    const newCollection: Collection = {
      id: `collection-${Date.now()}`,
      name: "New Collection",
      slug: `new-collection-${Date.now()}`,
      productIds: [],
      isVisible: true,
    };
    onChange([...collections, newCollection]);
    setExpandedCollection(newCollection.id);
  };

  const updateCollection = (id: string, updates: Partial<Collection>) => {
    onChange(
      collections.map((col) =>
        col.id === id
          ? {
              ...col,
              ...updates,
              slug: updates.name
                ? updates.name.toLowerCase().replace(/\s+/g, "-")
                : col.slug,
            }
          : col
      )
    );
  };

  const deleteCollection = (id: string) => {
    onChange(collections.filter((col) => col.id !== id));
    if (expandedCollection === id) {
      setExpandedCollection(null);
    }
  };

  const toggleProduct = (collectionId: string, productId: string) => {
    const collection = collections.find((col) => col.id === collectionId);
    if (!collection) return;

    const productIds = collection.productIds.includes(productId)
      ? collection.productIds.filter((id) => id !== productId)
      : [...collection.productIds, productId];

    updateCollection(collectionId, { productIds });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-300">Collections</Label>
        <Button
          onClick={addCollection}
          size="sm"
          variant="outline"
          className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800 h-7 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Collection
        </Button>
      </div>

      {collections.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          No collections yet. Click "Add Collection" to create one.
        </p>
      ) : (
        <div className="space-y-2">
          {collections.map((collection) => {
            const isExpanded = expandedCollection === collection.id;
            return (
              <div
                key={collection.id}
                className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800"
              >
                {/* Collection Header */}
                <button
                  onClick={() =>
                    setExpandedCollection(isExpanded ? null : collection.id)
                  }
                  className="w-full p-2.5 flex items-center justify-between hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {collection.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({collection.productIds.length} products)
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Collection Settings */}
                {isExpanded && (
                  <div className="p-3 border-t border-gray-700 space-y-3">
                    {/* Collection Name */}
                    <div>
                      <Label className="text-xs text-gray-300 mb-1">
                        Collection Name
                      </Label>
                      <Input
                        value={collection.name}
                        onChange={(e) =>
                          updateCollection(collection.id, { name: e.target.value })
                        }
                        className="bg-gray-900 border-gray-700 text-white text-sm h-8"
                        placeholder="e.g., Firearms, Assets, Gear"
                      />
                    </div>

                    {/* Visibility Toggle */}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-300">Visible</Label>
                      <Switch
                        checked={collection.isVisible}
                        onCheckedChange={(checked) =>
                          updateCollection(collection.id, { isVisible: checked })
                        }
                      />
                    </div>

                    {/* Product Assignment */}
                    <div>
                      <Label className="text-xs text-gray-300 mb-2 block">
                        Assign Products
                      </Label>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 bg-gray-900 rounded p-2">
                        {products.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-2">
                            No products available
                          </p>
                        ) : (
                          products.map((product) => {
                            const isSelected = collection.productIds.includes(
                              product.id
                            );
                            return (
                              <button
                                key={product.id}
                                onClick={() =>
                                  toggleProduct(collection.id, product.id)
                                }
                                className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                                  isSelected
                                    ? "bg-cyan-500/20 border border-cyan-500"
                                    : "bg-gray-800 border border-gray-700 hover:border-gray-600"
                                }`}
                              >
                                {/* Checkbox */}
                                <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0">
                                  {isSelected && (
                                    <div className="w-2 h-2 bg-cyan-500 rounded-sm"></div>
                                  )}
                                </div>

                                {/* Product Image */}
                                <div className="w-8 h-8 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                                  {product.image_url ? (
                                    <img
                                      src={product.image_url}
                                      alt={product.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                      ?
                                    </div>
                                  )}
                                </div>

                                {/* Product Title */}
                                <span className="text-xs text-white truncate flex-1">
                                  {product.title}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      onClick={() => deleteCollection(collection.id)}
                      variant="destructive"
                      size="sm"
                      className="w-full h-7 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete Collection
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
