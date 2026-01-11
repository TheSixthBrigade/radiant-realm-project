import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, 
  ShoppingCart, Users, Package, Loader2, Calendar,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Sale {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  currency: string;
  created_at: string;
  product?: {
    title: string;
    image_url?: string;
  };
}

interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

interface ProductStats {
  product_id: string;
  title: string;
  image_url?: string;
  revenue: number;
  units: number;
}

type DateRange = '7d' | '30d' | '90d' | '365d' | 'all';

export const SalesAnalytics = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  useEffect(() => {
    if (user) {
      fetchSales();
    }
  }, [user, dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case '30d':
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case '90d':
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      case '365d':
        return new Date(now.setDate(now.getDate() - 365)).toISOString();
      default:
        return null;
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('sales')
        .select(`
          *,
          product:products(title, image_url)
        `)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });
      
      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setSales(data || []);
    } catch (e) {
      console.error('Error fetching sales:', e);
    }
    setLoading(false);
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalOrders = sales.length;
    const uniqueCustomers = new Set(sales.map(s => s.buyer_id)).size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    return { totalRevenue, totalOrders, uniqueCustomers, avgOrderValue };
  }, [sales]);

  // Calculate daily sales for chart
  const dailySales = useMemo(() => {
    const byDate: Record<string, DailySales> = {};
    
    sales.forEach(sale => {
      const date = new Date(sale.created_at).toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { date, revenue: 0, orders: 0 };
      }
      byDate[date].revenue += sale.amount || 0;
      byDate[date].orders += 1;
    });
    
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  // Calculate top products
  const topProducts = useMemo(() => {
    const byProduct: Record<string, ProductStats> = {};
    
    sales.forEach(sale => {
      const pid = sale.product_id;
      if (!byProduct[pid]) {
        byProduct[pid] = {
          product_id: pid,
          title: sale.product?.title || 'Unknown Product',
          image_url: sale.product?.image_url,
          revenue: 0,
          units: 0
        };
      }
      byProduct[pid].revenue += sale.amount || 0;
      byProduct[pid].units += 1;
    });
    
    return Object.values(byProduct)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  // Calculate period comparison
  const comparison = useMemo(() => {
    if (dateRange === 'all') return null;
    
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);
    
    const currentPeriod = sales.filter(s => new Date(s.created_at) >= periodStart);
    const prevPeriod = sales.filter(s => {
      const d = new Date(s.created_at);
      return d >= prevPeriodStart && d < periodStart;
    });
    
    const currentRevenue = currentPeriod.reduce((sum, s) => sum + (s.amount || 0), 0);
    const prevRevenue = prevPeriod.reduce((sum, s) => sum + (s.amount || 0), 0);
    
    const change = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 
      : currentRevenue > 0 ? 100 : 0;
    
    return { currentRevenue, prevRevenue, change };
  }, [sales, dateRange]);

  // Simple bar chart renderer
  const maxRevenue = Math.max(...dailySales.map(d => d.revenue), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-bold text-white">Sales Analytics</h2>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex gap-1 p-1 rounded-lg bg-slate-800/50">
          {(['7d', '30d', '90d', '365d', 'all'] as DateRange[]).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded text-sm transition-all ${
                dateRange === range
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            {comparison && (
              <span className={`text-xs flex items-center gap-0.5 ${
                comparison.change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {comparison.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {Math.abs(comparison.change).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white">${metrics.totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-gray-400">Total Revenue</p>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
          <ShoppingCart className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{metrics.totalOrders}</p>
          <p className="text-sm text-gray-400">Total Orders</p>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
          <Users className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">{metrics.uniqueCustomers}</p>
          <p className="text-sm text-gray-400">Unique Customers</p>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
          <TrendingUp className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-white">${metrics.avgOrderValue.toFixed(2)}</p>
          <p className="text-sm text-gray-400">Avg Order Value</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="p-6 rounded-2xl border bg-slate-800/50 border-purple-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">Revenue Over Time</h3>
        
        {dailySales.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No sales data for this period</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Simple horizontal bar chart */}
            <div className="flex items-end gap-1 h-40">
              {dailySales.slice(-14).map((day, i) => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-purple-500/80 rounded-t transition-all hover:bg-purple-400"
                    style={{ height: `${(day.revenue / maxRevenue) * 100}%`, minHeight: day.revenue > 0 ? '4px' : '0' }}
                    title={`${day.date}: $${day.revenue.toFixed(2)}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{dailySales.slice(-14)[0]?.date.slice(5)}</span>
              <span>{dailySales.slice(-1)[0]?.date.slice(5)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Products */}
      <div className="p-6 rounded-2xl border bg-slate-800/50 border-purple-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">Top Products</h3>
        
        {topProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No product sales yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, i) => (
              <div
                key={product.product_id}
                className="flex items-center gap-4 p-3 rounded-lg bg-black/20"
              >
                <span className="text-lg font-bold text-gray-500 w-6">#{i + 1}</span>
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt="" 
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-purple-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{product.title}</p>
                  <p className="text-sm text-gray-400">{product.units} units sold</p>
                </div>
                <span className="text-green-400 font-semibold">
                  ${product.revenue.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Sales */}
      <div className="p-6 rounded-2xl border bg-slate-800/50 border-purple-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Sales</h3>
        
        {sales.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No sales yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sales.slice(0, 10).map(sale => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-3 rounded-lg bg-black/20"
              >
                <div className="flex items-center gap-3">
                  {sale.product?.image_url ? (
                    <img 
                      src={sale.product.image_url} 
                      alt="" 
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-white">{sale.product?.title || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(sale.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <span className="text-green-400 font-medium">
                  +${sale.amount?.toFixed(2) || '0.00'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesAnalytics;
