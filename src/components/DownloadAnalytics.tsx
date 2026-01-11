import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Download, Users, TrendingUp, Package, Loader2,
  Calendar, BarChart3, RefreshCw
} from 'lucide-react';

interface DownloadEvent {
  id: string;
  product_id: string;
  version_id?: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  downloaded_at: string;
  product?: {
    title: string;
    image_url?: string;
  };
  version?: {
    version_number: string;
  };
}

interface DownloadAnalyticsProps {
  productId?: string; // If provided, show stats for this product only
}

type DateRange = '7d' | '30d' | '90d' | 'all';

export const DownloadAnalytics = ({ productId }: DownloadAnalyticsProps) => {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState<DownloadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  useEffect(() => {
    if (user) {
      fetchDownloads();
    }
  }, [user, productId, dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case '30d':
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case '90d':
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      default:
        return null;
    }
  };

  const fetchDownloads = async () => {
    setLoading(true);
    try {
      // First get products owned by user
      let productIds: string[] = [];
      
      if (productId) {
        productIds = [productId];
      } else {
        const { data: products } = await (supabase as any)
          .from('products')
          .select('id')
          .eq('creator_id', user?.id);
        
        productIds = products?.map((p: any) => p.id) || [];
      }
      
      if (productIds.length === 0) {
        setDownloads([]);
        setLoading(false);
        return;
      }
      
      let query = (supabase as any)
        .from('download_events')
        .select(`
          *,
          product:products(title, image_url),
          version:product_versions(version_number)
        `)
        .in('product_id', productIds)
        .order('downloaded_at', { ascending: false });
      
      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('downloaded_at', dateFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setDownloads(data || []);
    } catch (e) {
      console.error('Error fetching downloads:', e);
    }
    setLoading(false);
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalDownloads = downloads.length;
    const uniqueDownloaders = new Set(downloads.map(d => d.user_id)).size;
    
    // Downloads by product
    const byProduct: Record<string, { title: string; image_url?: string; count: number }> = {};
    downloads.forEach(d => {
      if (!byProduct[d.product_id]) {
        byProduct[d.product_id] = {
          title: d.product?.title || 'Unknown',
          image_url: d.product?.image_url,
          count: 0
        };
      }
      byProduct[d.product_id].count++;
    });
    const topProducts = Object.entries(byProduct)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, data]) => ({ id, ...data }));
    
    // Downloads by version
    const byVersion: Record<string, number> = {};
    downloads.forEach(d => {
      const version = d.version?.version_number || 'Unknown';
      byVersion[version] = (byVersion[version] || 0) + 1;
    });
    const versionStats = Object.entries(byVersion)
      .sort((a, b) => b[1] - a[1])
      .map(([version, count]) => ({ version, count }));
    
    // Downloads over time (daily)
    const byDate: Record<string, number> = {};
    downloads.forEach(d => {
      const date = new Date(d.downloaded_at).toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });
    const dailyDownloads = Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
    
    // First downloads vs re-downloads
    const userFirstDownload: Record<string, string> = {};
    const sortedDownloads = [...downloads].sort((a, b) => 
      new Date(a.downloaded_at).getTime() - new Date(b.downloaded_at).getTime()
    );
    
    let firstDownloads = 0;
    let reDownloads = 0;
    
    sortedDownloads.forEach(d => {
      const key = `${d.user_id}-${d.product_id}`;
      if (!userFirstDownload[key]) {
        userFirstDownload[key] = d.downloaded_at;
        firstDownloads++;
      } else {
        reDownloads++;
      }
    });
    
    return {
      totalDownloads,
      uniqueDownloaders,
      topProducts,
      versionStats,
      dailyDownloads,
      firstDownloads,
      reDownloads
    };
  }, [downloads]);

  const maxDaily = Math.max(...metrics.dailyDownloads.map(d => d.count), 1);

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
          <Download className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-bold text-white">Download Analytics</h2>
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
          <Download className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{metrics.totalDownloads}</p>
          <p className="text-sm text-gray-400">Total Downloads</p>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
          <Users className="w-5 h-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-white">{metrics.uniqueDownloaders}</p>
          <p className="text-sm text-gray-400">Unique Downloaders</p>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
          <TrendingUp className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">{metrics.firstDownloads}</p>
          <p className="text-sm text-gray-400">First Downloads</p>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-800/50 border border-purple-500/30">
          <RefreshCw className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-white">{metrics.reDownloads}</p>
          <p className="text-sm text-gray-400">Re-downloads</p>
        </div>
      </div>

      {/* Downloads Over Time */}
      <div className="p-6 rounded-2xl border bg-slate-800/50 border-purple-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">Downloads Over Time</h3>
        
        {metrics.dailyDownloads.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No download data for this period</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Simple bar chart */}
            <div className="flex items-end gap-1 h-32">
              {metrics.dailyDownloads.slice(-14).map((day) => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-blue-500/80 rounded-t transition-all hover:bg-blue-400"
                    style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                    title={`${day.date}: ${day.count} downloads`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{metrics.dailyDownloads.slice(-14)[0]?.date.slice(5)}</span>
              <span>{metrics.dailyDownloads.slice(-1)[0]?.date.slice(5)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        {!productId && (
          <div className="p-6 rounded-2xl border bg-slate-800/50 border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-4">Top Products</h3>
            
            {metrics.topProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No product downloads yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.topProducts.map((product, i) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-black/20"
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
                    </div>
                    <span className="text-blue-400 font-semibold">
                      {product.count} downloads
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Downloads by Version */}
        <div className={`p-6 rounded-2xl border bg-slate-800/50 border-purple-500/30 ${!productId ? '' : 'lg:col-span-2'}`}>
          <h3 className="text-lg font-semibold text-white mb-4">Downloads by Version</h3>
          
          {metrics.versionStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Download className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No version data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.versionStats.slice(0, 5).map((item) => {
                const maxCount = metrics.versionStats[0]?.count || 1;
                const percentage = (item.count / maxCount) * 100;
                
                return (
                  <div key={item.version} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white font-mono">v{item.version}</span>
                      <span className="text-gray-400">{item.count} downloads</span>
                    </div>
                    <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
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

      {/* Recent Downloads */}
      <div className="p-6 rounded-2xl border bg-slate-800/50 border-purple-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Downloads</h3>
        
        {downloads.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Download className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No downloads yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {downloads.slice(0, 10).map(download => (
              <div
                key={download.id}
                className="flex items-center justify-between p-3 rounded-lg bg-black/20"
              >
                <div className="flex items-center gap-3">
                  {download.product?.image_url ? (
                    <img 
                      src={download.product.image_url} 
                      alt="" 
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-white">{download.product?.title || 'Unknown'}</p>
                    {download.version && (
                      <p className="text-xs text-gray-500">v{download.version.version_number}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(download.downloaded_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadAnalytics;
