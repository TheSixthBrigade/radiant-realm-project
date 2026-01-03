import { useState } from "react";

interface Collection {
  id: string;
  name: string;
  slug: string;
  productIds: string[];
  isVisible: boolean;
}

interface CollectionTabsProps {
  collections: Collection[];
  onSelectCollection: (collectionId: string | null) => void;
}

export const CollectionTabs = ({
  collections,
  onSelectCollection,
}: CollectionTabsProps) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const visibleCollections = collections.filter((col) => col.isVisible);

  const handleTabClick = (collectionId: string | null) => {
    setActiveTab(collectionId);
    onSelectCollection(collectionId);
  };

  if (visibleCollections.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {/* All Products Tab */}
          <button
            onClick={() => handleTabClick(null)}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === null
                ? "border-b-2 border-cyan-500 text-cyan-500 dark:text-cyan-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            All Products
          </button>

          {/* Collection Tabs */}
          {visibleCollections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => handleTabClick(collection.id)}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === collection.id
                  ? "border-b-2 border-cyan-500 text-cyan-500 dark:text-cyan-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {collection.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
