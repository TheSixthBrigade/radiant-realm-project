import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalCreators: number;
  hasRealData: boolean;
}

export const useStats = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCreators: 0,
    hasRealData: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get total products
        const { count: productCount, error: productError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });

        if (productError) throw productError;

        // Get total sales
        const { count: salesCount, error: salesError } = await supabase
          .from('sales')
          .select('*', { count: 'exact', head: true });

        if (salesError) throw salesError;

        // Get total revenue
        const { data: revenueData, error: revenueError } = await supabase
          .from('sales')
          .select('amount');

        if (revenueError) throw revenueError;

        const totalRevenue = revenueData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;

        // Get total creators (profiles with is_creator = true)
        const { count: creatorCount, error: creatorError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_creator', true);

        if (creatorError) throw creatorError;

        // Determine if we have real data (not just an empty database)
        const hasRealData = (productCount || 0) > 0 || (salesCount || 0) > 0 || (creatorCount || 0) > 0;

        setStats({
          totalProducts: productCount || 0,
          totalSales: salesCount || 0,
          totalRevenue: totalRevenue,
          totalCreators: creatorCount || 0,
          hasRealData,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch statistics');
        
        // Set fallback stats for error state
        setStats({
          totalProducts: 0,
          totalSales: 0,
          totalRevenue: 0,
          totalCreators: 0,
          hasRealData: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Helper function to format numbers with K/M notation
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return { 
    stats, 
    loading, 
    error,
    formatNumber,
  };
};