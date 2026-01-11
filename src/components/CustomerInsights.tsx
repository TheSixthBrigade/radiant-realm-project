import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, UserPlus, UserCheck, Globe, Crown,
  Loader2, TrendingUp, Calendar
} from 'lucide-react';

interface Sale {
  id: string;
  buyer_id: string;
  amount: number;
  created_at: string;
  buyer?: {
    id: string;
    username?: string;
    avatar_url?: string;
    country?: string;
  };
}

interface CustomerData {
  id: string;
  username?: string;
  avatar_url?: string;
  totalSpent: number;
  orderCount: number;
  firstPurchase: string;
  lastPurchase: string;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

export const CustomerInsights = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  useEffect(() => {
    if (user) {
      fetchSales();
    }
  }, [user]);

  const fetchSales = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('sales')
        .select(`
          id,
          buyer_id,
          amount,
          created_at,
          buyer:profiles!buyer_id(id, username, avatar_url, country)
        `)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSales(data || []);
    } catch (e) {
      console.error('Error fetching sales:', e);
    }
    setLoading(false);
  };

  // Filter sales by date range
  const filteredSales = useMemo(() => {
    if (dateRange === 'all') return sales;
    
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return sales.filter(s => new Date(s.created_at) >= cutoff);
  }, [sales, dateRange]);

  // Calculate customer metrics
  const metrics = useMemo(() => {
    const customerMap = new Map<string, CustomerData>();
    
    filteredSales.forEach(sale => {
      if (!sale.buyer_id) return;
      
      const existing = customerMap.get(sale.buyer_id);
      if (existing) {
        existing.totalSpent += sale.amount || 0;
        existing.orderCount += 1;
        if (sale.created_at < existing.firstPurchase) {
          existing.firstPurchase = sale.created_at;
        }
        if (sale.created_at > existing.lastPurchase) {
          existing.lastPurchase = sale.created_at;
        }
      } else {
        customerMap.set(sale.buyer_id, {
          id: sale.buyer_id,
          username: sale.buyer?.username,
          avatar_url: sale.buyer?.avatar_url,
          totalSpent: sale.amount || 0,
          orderCount: 1,
          firstPurchase: sale.created_at,
          lastPurchase: sale.created_at
        });
      }
    });
    
    const customers = Array.from(customerMap.values());
    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter(c => c.orderCount > 1).length;
    
    // New customers in period
    const periodStart = dateRange === 'all' ? null : new Date();
    if (periodStart) {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      periodStart.setDate(periodStart.getDate() - days);
    }
    
    const newCustomers = periodStart 
      ? customers.filter(c => new Date(c.firstPurchase) >= periodStart).length
      : totalCustomers;
    
    // Top customers by spend
    const topCustomers = [...customers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
    
    // Geographic distribution (if country data available)
    const countryMap = new Map<string, number>();
    filteredSales.forEach(sale => {
      const country = sale.buyer?.country || 'Unknown';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });
    const topCountries = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));
    
    // Repeat rate
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    
    // Average customer value
    const avgCustomerValue = totalCustomers > 0 
      ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / totalCustomers 
      : 0;
    
    return {
      totalCustomers,
      repeatCustomers,
      newCustomers,
      repeatRate,
      avgCustomerValue,
      topCustomers,
      topCountries
    };
  }, [filteredSales, dateRange]);

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
          <Users className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-bold text-white">Customer Insights</h2>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex gap-1 p-1 rounded-lg bg-slate-800/50">
          {(['7d', '30d', '90d', 'all'] as DateRange[]).map(range => (
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
          <Users className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{metrics.totalCustomers}</p>
          <p className="text-sm text-gray-400">Total Customers</p>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
          <UserPlus className="w-5 h-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-white">{metrics.newCustomers}</p>
          <p className="text-sm text-gray-400">New Customers</p>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
          <UserCheck className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">{metrics.repeatRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-400">Repeat Rate</p>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
          <TrendingUp className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-white">${metrics.avgCustomerValue.toFixed(2)}</p>
          <p className="text-sm text-gray-400">Avg Customer Value</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="p-6 rounded-2xl border bg-slate-800/50 border-purple-500/30">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Top Customers</h3>
          </div>
          
          {metrics.topCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No customer data yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.topCustomers.map((customer, i) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-black/20"
                >
                  <span className={`text-sm font-bold w-6 ${
                    i === 0 ? 'text-yellow-400' : 
                    i === 1 ? 'text-gray-300' : 
                    i === 2 ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    #{i + 1}
                  </span>
                  {customer.avatar_url ? (
                    <img 
                      src={customer.avatar_url} 
                      alt="" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {customer.username || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {customer.orderCount} order{customer.orderCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-green-400 font-semibold">
                    ${customer.totalSpent.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Geographic Distribution */}
        <div className="p-6 rounded-2xl border bg-slate-800/50 border-purple-500/30">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Top Regions</h3>
          </div>
          
          {metrics.topCountries.length === 0 || (metrics.topCountries.length === 1 && metrics.topCountries[0].country === 'Unknown') ? (
            <div className="text-center py-8 text-gray-400">
              <Globe className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No geographic data available</p>
              <p className="text-sm text-gray-500 mt-1">Customer locations will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.topCountries.map((item, i) => {
                const maxCount = metrics.topCountries[0]?.count || 1;
                const percentage = (item.count / maxCount) * 100;
                
                return (
                  <div key={item.country} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">{item.country}</span>
                      <span className="text-gray-400">{item.count} orders</span>
                    </div>
                    <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Customer Breakdown */}
      <div className="p-6 rounded-2xl border bg-slate-800/50 border-purple-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">Customer Breakdown</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-black/20 text-center">
            <p className="text-3xl font-bold text-blue-400">{metrics.totalCustomers}</p>
            <p className="text-sm text-gray-400 mt-1">Total Customers</p>
          </div>
          <div className="p-4 rounded-lg bg-black/20 text-center">
            <p className="text-3xl font-bold text-green-400">{metrics.repeatCustomers}</p>
            <p className="text-sm text-gray-400 mt-1">Repeat Customers</p>
          </div>
          <div className="p-4 rounded-lg bg-black/20 text-center">
            <p className="text-3xl font-bold text-purple-400">
              {metrics.totalCustomers - metrics.repeatCustomers}
            </p>
            <p className="text-sm text-gray-400 mt-1">One-time Buyers</p>
          </div>
        </div>
        
        {/* Visual breakdown bar */}
        {metrics.totalCustomers > 0 && (
          <div className="mt-4">
            <div className="h-4 bg-black/30 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-500"
                style={{ width: `${metrics.repeatRate}%` }}
                title={`Repeat: ${metrics.repeatCustomers}`}
              />
              <div 
                className="h-full bg-purple-500"
                style={{ width: `${100 - metrics.repeatRate}%` }}
                title={`One-time: ${metrics.totalCustomers - metrics.repeatCustomers}`}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Repeat ({metrics.repeatRate.toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                One-time ({(100 - metrics.repeatRate).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerInsights;
