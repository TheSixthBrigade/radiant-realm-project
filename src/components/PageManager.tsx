import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, Trash2, GripVertical, Home, FileText, 
  ScrollText, Map, ChevronRight, X, Users
} from 'lucide-react';
import { toast } from 'sonner';

export interface StorePage {
  id: string;
  type: 'home' | 'about' | 'tos' | 'roadmap' | 'community';
  title: string;
  slug: string;
  sections: any[];
  isEnabled: boolean;
  order: number;
}

interface PageManagerProps {
  pages: StorePage[];
  currentPageId: string;
  onPageChange: (pageId: string) => void;
  onAddPage: (type: StorePage['type']) => void;
  onDeletePage: (pageId: string) => void;
  onUpdatePage: (page: StorePage) => void;
  onReorderPages: (pages: StorePage[]) => void;
  isOwner: boolean;
  subscriptionTier?: string;
}

const PAGE_TYPES = {
  home: { icon: Home, label: 'Marketplace', slug: '' },
  about: { icon: FileText, label: 'About', slug: 'about' },
  tos: { icon: ScrollText, label: 'Terms of Service', slug: 'tos' },
  roadmap: { icon: Map, label: 'Roadmap', slug: 'roadmap' },
  community: { icon: Users, label: 'Community Forums', slug: 'community' },
};

const MAX_PAGES = 5;

export const PageManager = ({
  pages,
  currentPageId,
  onPageChange,
  onAddPage,
  onDeletePage,
  onUpdatePage,
  onReorderPages,
  isOwner,
  subscriptionTier = 'free',
}: PageManagerProps) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [draggedPage, setDraggedPage] = useState<string | null>(null);

  // Check if user has Pro tier or higher for roadmap access
  const hasProAccess = ['pro', 'pro_plus', 'enterprise'].includes(subscriptionTier);

  const existingTypes = pages.map(p => p.type);
  const availableTypes = (Object.keys(PAGE_TYPES) as StorePage['type'][])
    .filter(type => !existingTypes.includes(type))
    .filter(type => (type !== 'roadmap' && type !== 'community') || hasProAccess); // Filter roadmap & community for non-Pro users

  const handleAddPage = (type: StorePage['type']) => {
    if (pages.length >= MAX_PAGES) {
      toast.error(`Maximum ${MAX_PAGES} pages allowed`);
      return;
    }
    onAddPage(type);
    setShowAddMenu(false);
    toast.success(`${PAGE_TYPES[type].label} page added!`);
  };

  const handleDeletePage = (pageId: string, pageType: StorePage['type']) => {
    if (pageType === 'home') {
      toast.error("Can't delete the main store page");
      return;
    }
    if (confirm(`Delete ${PAGE_TYPES[pageType].label} page?`)) {
      onDeletePage(pageId);
      toast.success('Page deleted');
    }
  };

  const startEditTitle = (page: StorePage) => {
    setEditingPageId(page.id);
    setEditTitle(page.title);
  };

  const saveTitle = (page: StorePage) => {
    if (editTitle.trim()) {
      onUpdatePage({ ...page, title: editTitle.trim() });
    }
    setEditingPageId(null);
  };

  const handleDragStart = (pageId: string) => {
    setDraggedPage(pageId);
  };

  const handleDragOver = (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    if (!draggedPage || draggedPage === targetPageId) return;

    const draggedIndex = pages.findIndex(p => p.id === draggedPage);
    const targetIndex = pages.findIndex(p => p.id === targetPageId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newPages = [...pages];
    const [removed] = newPages.splice(draggedIndex, 1);
    newPages.splice(targetIndex, 0, removed);

    // Update order values
    newPages.forEach((page, index) => {
      page.order = index;
    });

    onReorderPages(newPages);
  };

  const handleDragEnd = () => {
    setDraggedPage(null);
  };

  if (!isOwner) return null;

  return (
    <div className="mb-6 border-b border-gray-700 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Pages</h3>
        <span className="text-xs text-gray-400">{pages.length}/{MAX_PAGES}</span>
      </div>

      {/* Page List */}
      <div className="space-y-1">
        {pages.sort((a, b) => a.order - b.order).map((page) => {
          const PageIcon = PAGE_TYPES[page.type].icon;
          const isActive = page.id === currentPageId;
          const isEditing = editingPageId === page.id;

          return (
            <div
              key={page.id}
              draggable
              onDragStart={() => handleDragStart(page.id)}
              onDragOver={(e) => handleDragOver(e, page.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                isActive 
                  ? 'bg-purple-600/30 border border-purple-500/50' 
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border border-transparent'
              } ${draggedPage === page.id ? 'opacity-50' : ''}`}
              onClick={() => !isEditing && onPageChange(page.id)}
            >
              <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
              <PageIcon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-gray-400'}`} />
              
              {isEditing ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => saveTitle(page)}
                  onKeyDown={(e) => e.key === 'Enter' && saveTitle(page)}
                  className="h-6 text-xs bg-gray-900 border-gray-600"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span 
                  className={`flex-1 text-sm truncate ${isActive ? 'text-white' : 'text-gray-300'}`}
                  onDoubleClick={() => startEditTitle(page)}
                >
                  {page.title}
                </span>
              )}

              {page.type !== 'home' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePage(page.id, page.type);
                  }}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Page Button */}
      {pages.length < MAX_PAGES && availableTypes.length > 0 && (
        <div className="relative mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-purple-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Page
          </Button>

          {showAddMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
              {availableTypes.map((type) => {
                const TypeIcon = PAGE_TYPES[type].icon;
                return (
                  <button
                    key={type}
                    onClick={() => handleAddPage(type)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors text-left"
                  >
                    <TypeIcon className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-sm text-white">{PAGE_TYPES[type].label}</div>
                      <div className="text-xs text-gray-500">/{PAGE_TYPES[type].slug || 'home'}</div>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => setShowAddMenu(false)}
                className="w-full p-2 text-xs text-gray-500 hover:text-gray-300 border-t border-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PageManager;
