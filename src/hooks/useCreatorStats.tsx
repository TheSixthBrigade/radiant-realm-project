import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CreatorStats {
  totalEarnings: number;
  totalDownloads: number;
  activeProducts: number;
  monthlyRevenue: number;
  previousMonthRevenue: number;
  totalSales: number;
}

interface CreatorProduct {
  id: string;
  title: string;
  price: number;
  downloads: number;
  revenue: number;
  status: string;
  rating: number;
  lastUpdated: string;
  created_at: string;
}

interface RecentActivity {
  type: 'sale' | 'download' | 'review';
  product: string;
  amount: number;
  time: string;
}

export const useCreatorStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CreatorStats>({
    totalEarnings: 0,
    totalDownloads: 0,
    activeProducts: 0,
    monthlyRevenue: 0,
    previousMonthRevenue: 0,
    totalSales: 0,
  });
  const [products, setProducts] = useState<CreatorProduct[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasToastedError = useRef(false);

  const fetchCreatorData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
      try {
        setLoading(true);
        setError(null);

        // Get creator's products with only needed fields for better performance
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, title, price, downloads, rating, created_at, updated_at, creator_id')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        // Get product IDs for sales query
        const productIds = productsData?.map(p => p.id) || [];

        // Get creator's sales directly by seller_id
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('id, product_id, amount, created_at')
          .eq('seller_id', user.id);

        if (salesError) throw salesError;

        // Calculate stats
        const totalEarnings = salesData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
        const totalSales = salesData?.length || 0;
        const totalDownloads = productsData?.reduce((sum, product) => sum + product.downloads, 0) || 0;
        const activeProducts = productsData?.length || 0;

        // Calculate monthly revenue (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthlyRevenue = salesData?.filter(sale => 
          new Date(sale.created_at) >= thirtyDaysAgo
        ).reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;

        // Calculate previous month revenue (60–30 days ago)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const previousMonthRevenue = salesData?.filter(sale => {
          const saleDate = new Date(sale.created_at);
          return saleDate >= sixtyDaysAgo && saleDate < thirtyDaysAgo;
        }).reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;

        setStats({
          totalEarnings,
          totalDownloads,
          activeProducts,
          monthlyRevenue,
          previousMonthRevenue,
          totalSales,
        });

        // Format products data
        const formattedProducts: CreatorProduct[] = productsData?.map(product => {
          const productSales = salesData?.filter(sale => sale.product_id === product.id) || [];
          const productRevenue = productSales.reduce((sum, sale) => sum + Number(sale.amount), 0);
          
          return {
            id: product.id,
            title: product.title,
            price: product.price,
            downloads: product.downloads,
            revenue: productRevenue,
            status: 'active', // You can add a status field to products table if needed
            rating: product.rating,
            lastUpdated: new Date(product.updated_at).toLocaleDateString(),
            created_at: product.created_at,
          };
        }) || [];

        setProducts(formattedProducts);

        // Create recent activity from sales data
        const recentSales: RecentActivity[] = salesData?.slice(0, 5).map(sale => {
          const product = productsData?.find(p => p.id === sale.product_id);
          return {
            type: 'sale' as const,
            product: product?.title || 'Unknown Product',
            amount: Number(sale.amount),
            time: formatTimeAgo(new Date(sale.created_at)),
          };
        }) || [];

        setRecentActivity(recentSales);

      } catch (err) {
        console.error('Error fetching creator data:', err);
        if (!hasToastedError.current) {
          hasToastedError.current = true;
          toast.error('Failed to load your stats. Please try again.');
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch creator data');
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchCreatorData();

    // Set up realtime subscriptions for live updates
    if (!user) return;

    // Subscribe to sales changes
    const salesChannel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
          filter: `seller_id=eq.${user.id}`
        },
        () => {
          if (!hasToastedError.current) fetchCreatorData();
        }
      )
      .subscribe();

    // Subscribe to products changes (for download count updates)
    const productsChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `creator_id=eq.${user.id}`
        },
        () => {
          if (!hasToastedError.current) fetchCreatorData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [user]);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  const refetch = () => {
    hasToastedError.current = false;
    fetchCreatorData();
  };

  return {
    stats,
    products,
    recentActivity,
    loading,
    error,
    refetch,
    previousMonthRevenue: stats.previousMonthRevenue,
  };
};