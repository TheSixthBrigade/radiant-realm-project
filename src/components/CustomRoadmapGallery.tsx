import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Map, Plus, ArrowRight, 
  CheckCircle2, Clock, Layers, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { RoadmapSettings, DEFAULT_ROADMAP_SETTINGS } from '@/lib/roadmapThemes';

export interface ProductRoadmap {
  product_id: string;
  product_name: string;
  product_image: string;
  product_description: string;
  current_version: string;
  total_versions: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  roadmap_settings: RoadmapSettings;
}

interface CustomRoadmapGalleryProps {
  creatorId: string;
  isOwner: boolean;
  storeName?: string;
  storeLogo?: string;
  storeSlug?: string;
  onSelectRoadmap: (productId: string) => void;
  customStyles: {
    cardBackgroundColor: string;
    cardBorderColor: string;
    cardBorderRadius: string;
    gridClasses: string;
    cardGlow: boolean;
  };
}

export const CustomRoadmapGallery = ({ 
  creatorId, 
  isOwner, 
  storeName, 
  storeLogo,
  storeSlug,
  onSelectRoadmap,
  customStyles
}: CustomRoadmapGalleryProps) => {
  const navigate = useNavigate();
  const [productRoadmaps, setProductRoadmaps] = useState<ProductRoadmap[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductPicker, setShowProductPicker] = useState(false);

  useEffect(() => {
    fetchRoadmaps();
  }, [creatorId]);

  const fetchRoadmaps = async () => {
    try {
      // Fetch products with roadmap enabled
      const { data: products, error: productsError } = await (supabase as any)
        .from('products')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('roadmap_enabled', true);

      // If roadmap_enabled column doesn't exist, fetch all products
      if (productsError && productsError.message?.includes('roadmap_enabled')) {
        console.log('roadmap_enabled column not found, fetching all products');
        const { data: allProducts } = await (supabase as any)
          .from('products')
          .select('*')
          .eq('creator_id', creatorId);
        setAvailableProducts(allProducts || []);
        setProductRoadmaps([]);
        setLoading(false);
        return;
      }

      if (!products || products.length === 0) {
        setProductRoadmaps([]);
        // Fetch available products for owner (those without roadmap enabled)
        if (isOwner) {
          const { data: allProducts } = await (supabase as any)
            .from('products')
            .select('*')
            .eq('creator_id', creatorId);
          
          // Filter out products that already have roadmap enabled
          const enabledIds = new Set((products || []).map((p: any) => p.id));
          const available = (allProducts || []).filter((p: any) => !enabledIds.has(p.id) && !p.roadmap_enabled);
          setAvailableProducts(available);
        }
        setLoading(false);
        return;
      }

      // For each product, get roadmap stats
      const roadmapsWithStats = await Promise.all(
        products.map(async (product: any) => {
          // Get versions for this product
          const { data: versions } = await (supabase as any)
            .from('roadmap_versions')
            .select('*')
            .eq('product_id', product.id)
            .order('sort_order');

          // Get all items for these versions
          const versionIds = (versions || []).map((v: any) => v.id);
          let items: any[] = [];
          if (versionIds.length > 0) {
            const { data: itemsData } = await (supabase as any)
              .from('roadmap_items')
              .select('*')
              .in('version_id', versionIds);
            items = itemsData || [];
          }

          const completedTasks = items.filter((i: any) => i.status === 'completed').length;
          const inProgressTasks = items.filter((i: any) => i.status === 'in_progress').length;
          const currentVersion = versions?.[0]?.version_name || 'No versions';

          return {
            product_id: product.id,
            product_name: product.title,
            product_image: product.image_url || '/placeholder.svg',
            product_description: product.description || '',
            current_version: currentVersion,
            total_versions: versions?.length || 0,
            total_tasks: items.length,
            completed_tasks: completedTasks,
            in_progress_tasks: inProgressTasks,
            roadmap_settings: product.roadmap_settings || DEFAULT_ROADMAP_SETTINGS
          };
        })
      );

      setProductRoadmaps(roadmapsWithStats);

      // Fetch available products for owner (those without roadmap enabled)
      if (isOwner) {
        const { data: allProducts } = await (supabase as any)
          .from('products')
          .select('*')
          .eq('creator_id', creatorId);
        
        // Filter out products that already have roadmap enabled
        const enabledIds = new Set((products || []).map((p: any) => p.id));
        const available = (allProducts || []).filter((p: any) => !enabledIds.has(p.id) && !p.roadmap_enabled);
        setAvailableProducts(available);
      }
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
      toast.error('Failed to load roadmaps');
    }
    setLoading(false);
  };

  const enableRoadmap = async (productId: string) => {
    try {
      await (supabase as any)
        .from('products')
        .update({ roadmap_enabled: true })
        .eq('id', productId);
      
      toast.success('Roadmap enabled!');
      setShowProductPicker(false);
      fetchRoadmaps();
    } catch (error) {
      toast.error('Failed to enable roadmap');
    }
  };

  const disableRoadmap = async (productId: string) => {
    if (!confirm('Disable roadmap for this product? The roadmap data will be preserved.')) return;
    
    try {
      await (supabase as any)
        .from('products')
        .update({ roadmap_enabled: false })
        .eq('id', productId);
      
      toast.success('Roadmap disabled');
      fetchRoadmaps();
    } catch (error) {
      toast.error('Failed to disable roadmap');
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Roadmap Cards Grid */}
      {productRoadmaps.length > 0 ? (
        <div className={`grid ${customStyles.gridClasses} gap-6 mb-8`}>
          {productRoadmaps.map((roadmap) => (
            <CustomRoadmapPreviewCard
              key={roadmap.product_id}
              roadmap={roadmap}
              onClick={() => onSelectRoadmap(roadmap.product_id)}
              isOwner={isOwner}
              onDisable={() => disableRoadmap(roadmap.product_id)}
              customStyles={customStyles}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className={`text-center py-20 ${customStyles.cardBorderRadius} backdrop-blur-xl border shadow-2xl`} style={{ backgroundColor: customStyles.cardBackgroundColor, borderColor: customStyles.cardBorderColor }}>
          <Map className="w-16 h-16 mx-auto mb-6 text-purple-500" />
          <h3 className="text-2xl font-bold mb-2 text-white">No Roadmaps Yet</h3>
          <p className="text-gray-400 mb-6">
            {isOwner 
              ? "Enable roadmaps for your products to share development progress with your community."
              : "This store hasn't set up any product roadmaps yet. Check back later!"
            }
          </p>
        </div>
      )}

      {/* Owner: Enable Roadmap for Products */}
      {isOwner && (
        <div className="mt-8">
          {showProductPicker ? (
            <div className={`${customStyles.cardBorderRadius} backdrop-blur-xl border p-6`} style={{ backgroundColor: customStyles.cardBackgroundColor, borderColor: customStyles.cardBorderColor }}>
              <h3 className="text-lg font-semibold text-white mb-4">Select a product to enable roadmap</h3>
              {availableProducts.length > 0 ? (
                <div className={`grid ${customStyles.gridClasses} gap-4`}>
                  {availableProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => enableRoadmap(product.id)}
                      className={`flex items-center gap-3 p-4 ${customStyles.cardBorderRadius} border transition-all hover:scale-[1.02] hover:border-purple-500`}
                      style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(107, 114, 128, 0.3)' }}
                    >
                      <img 
                        src={product.image_url || '/placeholder.svg'} 
                        alt={product.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="text-left">
                        <div className="text-white font-medium">{product.title}</div>
                        <div className="text-xs text-gray-400">Click to enable roadmap</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No products available. Create a product first to enable its roadmap.</p>
                  <p className="text-xs text-gray-500">Go to your dashboard to add products, then come back here.</p>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={() => setShowProductPicker(false)}
                className="mt-4 text-gray-400"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowProductPicker(true)}
              className={`w-full p-4 border-2 border-dashed ${customStyles.cardBorderRadius} flex items-center justify-center gap-3 transition-all hover:border-purple-500 hover:bg-purple-500/10`}
              style={{ borderColor: 'rgba(139, 92, 246, 0.3)', color: 'rgba(139, 92, 246, 0.8)' }}
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Enable Roadmap for a Product</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Custom Preview Card Component
interface CustomRoadmapPreviewCardProps {
  roadmap: ProductRoadmap;
  onClick: () => void;
  isOwner: boolean;
  onDisable?: () => void;
  customStyles: {
    cardBackgroundColor: string;
    cardBorderColor: string;
    cardBorderRadius: string;
    gridClasses: string;
    cardGlow: boolean;
  };
}

const CustomRoadmapPreviewCard = ({ roadmap, onClick, isOwner, onDisable, customStyles }: CustomRoadmapPreviewCardProps) => {
  const completionPercent = roadmap.total_tasks > 0 
    ? Math.round((roadmap.completed_tasks / roadmap.total_tasks) * 100) 
    : 0;

  // Debug: Log custom styles to see if colors are being passed correctly
  console.log('CustomRoadmapPreviewCard customStyles:', customStyles);

  return (
    <div
      className={`group relative ${customStyles.cardBorderRadius} border overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer backdrop-blur-xl`}
      style={{
        backgroundColor: customStyles.cardBackgroundColor,
        borderColor: customStyles.cardBorderColor,
        boxShadow: customStyles.cardGlow 
          ? `0 0 20px ${customStyles.cardBorderColor}40, 0 4px 20px rgba(0,0,0,0.3)` 
          : '0 4px 20px rgba(0,0,0,0.1)',
      }}
      onClick={onClick}
    >
      {/* Hover glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"
        style={{
          background: customStyles.cardGlow 
            ? `radial-gradient(circle at 50% 30%, ${customStyles.cardBorderColor}60, transparent 60%)`
            : `radial-gradient(circle at 50% 30%, ${customStyles.cardBorderColor}40, transparent 60%)`,
        }}
      />

      {/* Product Image Container */}
      <div className="relative h-40">
        <img
          src={roadmap.product_image}
          alt={roadmap.product_name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div 
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{ 
            height: 'calc(100% + 8px)',
            background: `linear-gradient(to bottom, transparent 0%, transparent 40%, ${customStyles.cardBackgroundColor} 90%, ${customStyles.cardBackgroundColor} 100%)`
          }} 
        />
        {/* Solid color bar at bottom */}
        <div 
          className="absolute inset-x-0 -bottom-1 h-3 pointer-events-none"
          style={{ backgroundColor: customStyles.cardBackgroundColor }}
        />
        
        {/* Version Badge */}
        <div className="absolute top-3 right-3 z-20">
          <span 
            className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md text-white"
            style={{ 
              backgroundColor: `${customStyles.cardBorderColor}66`, 
              border: `1px solid ${customStyles.cardBorderColor}80`
            }}
          >
            {roadmap.current_version}
          </span>
        </div>

        {/* Owner: Disable button */}
        {isOwner && onDisable && (
          <button
            onClick={(e) => { e.stopPropagation(); onDisable(); }}
            className="absolute top-3 left-3 p-2 rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
          >
            <span className="text-xs">Disable</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="relative p-5 z-10">
        <h3 className="text-lg font-bold text-white mb-2 truncate">{roadmap.product_name}</h3>
        
        {roadmap.product_description && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">{roadmap.product_description}</p>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Layers className="w-4 h-4" />
            <span>{roadmap.total_versions} versions</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>{roadmap.completed_tasks}/{roadmap.total_tasks} tasks</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Progress</span>
            <span className="font-medium" style={{ color: customStyles.cardBorderColor }}>{completionPercent}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${completionPercent}%`,
                background: `linear-gradient(90deg, ${customStyles.cardBorderColor}, #8b5cf6)`
              }}
            />
          </div>
        </div>

        {/* In Progress indicator */}
        {roadmap.in_progress_tasks > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-4">
            <Clock className="w-3.5 h-3.5" />
            <span>{roadmap.in_progress_tasks} task{roadmap.in_progress_tasks > 1 ? 's' : ''} in progress</span>
          </div>
        )}

        {/* View Button */}
        <button 
          className="w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all group-hover:gap-3 text-white"
          style={{ 
            background: `linear-gradient(135deg, ${customStyles.cardBorderColor}33, rgba(139, 92, 246, 0.2))`,
            border: `1px solid ${customStyles.cardBorderColor}50`
          }}
        >
          View Roadmap
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export default CustomRoadmapGallery;