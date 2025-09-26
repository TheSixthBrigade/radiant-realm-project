import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalCreators: number;
}

export const useStats = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCreators: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Get total products
        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });

        // Get total sales
        const { count: salesCount } = await supabase
          .from('sales')
          .select('*', { count: 'exact', head: true });

        // Get total revenue
        const { data: revenueData } = await supabase
          .from('sales')
          .select('amount');

        const totalRevenue = revenueData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;

        // Get total creators (profiles with is_creator = true)
        const { count: creatorCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_creator', true);

        setStats({
          totalProducts: productCount || 0,
          totalSales: salesCount || 0,
          totalRevenue: totalRevenue,
          totalCreators: creatorCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
};