import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Eye,
  ArrowUpRight, ArrowDownRight, Download, Star, Clock, Zap, Activity, BarChart3,
  Package, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Animated Wave Chart Component - Stripe Style
const AnimatedWaveChart = ({ 
  data, 
  color = "#22c55e", 
  height = 200,
  showGradient = true,
  animate = true 
}: { 
  data: number[], 
  color?: string, 
  height?: number,
  showGradient?: boolean,
  animate?: boolean 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const padding = 40;

    const draw = () => {
      const width = canvas.width / 2;
      const h = canvas.height / 2;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(2, 2);

      // Calculate points
      const maxVal = Math.max(...data, 1);
      const minVal = Math.min(...data, 0);
      const range = maxVal - minVal || 1;
      
      const points: { x: number, y: number }[] = data.map((val, i) => ({
        x: padding + (i / (data.length - 1)) * (width - padding * 2),
        y: h - padding - ((val - minVal) / range) * (h - padding * 2)
      }));

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding + (i / 4) * (h - padding * 2);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // Create smooth curve with animation
      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          const waveOffset = animate ? Math.sin(time * 2 + i * 0.5) * 2 : 0;
          ctx.quadraticCurveTo(points[i].x, points[i].y + waveOffset, xc, yc + waveOffset);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

        // Gradient fill
        if (showGradient) {
          const gradient = ctx.createLinearGradient(0, 0, 0, h);
          gradient.addColorStop(0, color + '40');
          gradient.addColorStop(0.5, color + '20');
          gradient.addColorStop(1, color + '00');
          
          ctx.lineTo(points[points.length - 1].x, h - padding);
          ctx.lineTo(points[0].x, h - padding);
          ctx.closePath();
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Draw the line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          const waveOffset = animate ? Math.sin(time * 2 + i * 0.5) * 2 : 0;
          ctx.quadraticCurveTo(points[i].x, points[i].y + waveOffset, xc, yc + waveOffset);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw points
        points.forEach((point, i) => {
          const waveOffset = animate ? Math.sin(time * 2 + i * 0.5) * 2 : 0;
          ctx.beginPath();
          ctx.arc(point.x, point.y + waveOffset, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }

      ctx.restore();
      time += 0.02;
      if (animate) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = height * 2;
      draw();
    };

    resize();
    window.addEventListener('resize', resize);

    if (animate) {
      draw();
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [data, color, height, showGradient, animate]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <p className="text-slate-500">No data available</p>
      </div>
    );
  }

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full cursor-crosshair"
      style={{ height: `${height}px` }}
    />
  );
};

// Live Activity Pulse
const LivePulse = () => (
  <span className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
  </span>
);

// Sparkline Mini Chart
const Sparkline = ({ data, color = "#22c55e" }: { data: number[], color?: string }) => {
  if (data.length < 2) return <div className="w-20 h-8" />;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox="0 0 100 100" className="w-20 h-8" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(diffInMinutes / 1440);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};


interface Sale {
  id: string;
  product_id: string;
  amount: number;
  created_at: string;
  product?: { title: string };
}

interface Product {
  id: string;
  title: string;
  price: number;
  downloads: number;
  rating: number;
  created_at: string;
}

interface DailyRevenue {
  date: string;
  revenue: number;
}

const StoreAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real data state
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [previousPeriodRevenue, setPreviousPeriodRevenue] = useState(0);

  // Fetch real data from Supabase
  const fetchAnalytics = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      
      // Get time range dates
      const now = new Date();
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysBack);
      
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - daysBack);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, title, price, downloads, rating, created_at')
        .eq('creator_id', user.id)
        .order('downloads', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      const productIds = productsData?.map(p => p.id) || [];
      
      if (productIds.length > 0) {
        // Fetch sales for current period
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('id, product_id, amount, created_at')
          .in('product_id', productIds)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        if (salesError) throw salesError;
        
        // Add product titles to sales
        const salesWithProducts = (salesData || []).map(sale => ({
          ...sale,
          product: productsData?.find(p => p.id === sale.product_id)
        }));
        setSales(salesWithProducts);

        // Calculate totals
        const revenue = salesData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
        setTotalRevenue(revenue);
        setTotalOrders(salesData?.length || 0);

        // Fetch previous period sales for comparison
        const { data: prevSalesData } = await supabase
          .from('sales')
          .select('amount')
          .in('product_id', productIds)
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString());

        const prevRevenue = prevSalesData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
        setPreviousPeriodRevenue(prevRevenue);

        // Calculate daily revenue for chart
        const dailyMap = new Map<string, number>();
        
        // Initialize all days with 0
        for (let i = 0; i < daysBack; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          dailyMap.set(dateStr, 0);
        }
        
        // Fill in actual revenue
        salesData?.forEach(sale => {
          const dateStr = new Date(sale.created_at).toISOString().split('T')[0];
          const current = dailyMap.get(dateStr) || 0;
          dailyMap.set(dateStr, current + Number(sale.amount));
        });

        // Convert to array sorted by date
        const dailyArray = Array.from(dailyMap.entries())
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        setDailyRevenue(dailyArray);
      } else {
        setSales([]);
        setTotalRevenue(0);
        setTotalOrders(0);
        setPreviousPeriodRevenue(0);
        setDailyRevenue([]);
      }

      // Calculate total downloads
      const downloads = productsData?.reduce((sum, p) => sum + p.downloads, 0) || 0;
      setTotalDownloads(downloads);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user, timeRange]);

  // Set up real-time subscription for new sales
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('analytics-sales')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales'
        },
        () => {
          // Refresh data when new sale comes in
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Calculate metrics
  const revenueChange = previousPeriodRevenue > 0 
    ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
    : totalRevenue > 0 ? 100 : 0;

  const conversionRate = totalDownloads > 0 ? (totalOrders / totalDownloads) * 100 : 0;
  
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const bestSeller = products.length > 0 ? products[0] : null;
  
  const avgRating = products.length > 0 
    ? products.reduce((sum, p) => sum + p.rating, 0) / products.length 
    : 0;

  // Get product revenue
  const getProductRevenue = (productId: string) => {
    return sales
      .filter(s => s.product_id === productId)
      .reduce((sum, s) => sum + Number(s.amount), 0);
  };

  const getProductSales = (productId: string) => {
    return sales.filter(s => s.product_id === productId).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="text-slate-400 mt-4">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navigation />
      
      <div className="container mx-auto px-4 sm:px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Analytics</h1>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <LivePulse />
                <span className="text-sm text-green-400 font-medium">Live</span>
              </div>
            </div>
            <p className="text-slate-400">Real-time insights for your store</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex rounded-lg bg-slate-800/50 border border-slate-700/50 p-1">
              {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-green-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => fetchAnalytics()}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Revenue Card */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              {revenueChange !== 0 && (
                <div className={`flex items-center gap-1 text-sm ${revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {revenueChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(revenueChange).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-sm text-slate-400 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
            <Sparkline data={dailyRevenue.slice(-10).map(d => d.revenue)} color="#22c55e" />
          </div>

          {/* Orders Card */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-white">{totalOrders}</p>
            <p className="text-xs text-slate-500 mt-2">Avg: ${avgOrderValue.toFixed(2)}/order</p>
          </div>

          {/* Downloads Card */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-1">Total Downloads</p>
            <p className="text-2xl font-bold text-white">{totalDownloads}</p>
            <p className="text-xs text-slate-500 mt-2">Across {products.length} products</p>
          </div>

          {/* Products Card */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-1">Active Products</p>
            <p className="text-2xl font-bold text-white">{products.length}</p>
            <p className="text-xs text-slate-500 mt-2">Avg rating: {avgRating.toFixed(1)}★</p>
          </div>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart - Large */}
          <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Revenue Overview</h3>
                <p className="text-sm text-slate-400">Track your earnings over time</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-400">Revenue</span>
                </div>
              </div>
            </div>
            <AnimatedWaveChart 
              data={dailyRevenue.map(d => d.revenue)} 
              color="#22c55e" 
              height={280}
              animate={true}
            />
            <div className="flex justify-between mt-4 text-xs text-slate-500">
              <span>{timeRange === '7d' ? '7 days ago' : timeRange === '30d' ? '30 days ago' : timeRange === '90d' ? '90 days ago' : '1 year ago'}</span>
              <span>Today</span>
            </div>
          </div>

          {/* Top Products */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Top Products</h3>
            <div className="space-y-4">
              {products.slice(0, 5).map((product, i) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center text-sm font-bold text-green-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{product.title}</p>
                    <p className="text-xs text-slate-400">{getProductSales(product.id)} sales</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">${getProductRevenue(product.id).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No products yet</p>
                  <Button asChild size="sm" className="mt-3 bg-green-600 hover:bg-green-700">
                    <Link to="/add-product">Add Product</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {sales.slice(0, 10).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{sale.product?.title || 'Unknown Product'}</p>
                      <p className="text-xs text-slate-400">{formatTimeAgo(new Date(sale.created_at))}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">+${Number(sale.amount).toFixed(2)}</p>
                    <p className="text-xs text-slate-400">Completed</p>
                  </div>
                </div>
              ))}
              {sales.length === 0 && (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No orders yet</p>
                  <p className="text-slate-500 text-sm mt-1">Orders will appear here in real-time</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Insights */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Insights</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Best Seller</span>
                </div>
                <p className="text-white font-semibold">{bestSeller?.title || 'No products yet'}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {bestSeller ? `${bestSeller.downloads} downloads` : 'Add your first product'}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">Conversion Rate</span>
                </div>
                <p className="text-white font-semibold">{conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-slate-400 mt-1">Downloads to sales</p>
              </div>

              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">Avg Rating</span>
                </div>
                <p className="text-white font-semibold">{avgRating.toFixed(1)} / 5.0</p>
                <p className="text-xs text-slate-400 mt-1">Based on {products.length} products</p>
              </div>

              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  {revenueChange >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-orange-400" />
                  )}
                  <span className="text-sm font-medium text-orange-400">Growth</span>
                </div>
                <p className="text-white font-semibold">
                  {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400 mt-1">vs previous period</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreAnalytics;
