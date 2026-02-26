import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  ArrowUpRight, ArrowDownRight, Download, Star, Zap, BarChart3,
  Package, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { safeRevenueChange } from "@/lib/analyticsUtils";

// Format currency for axis labels
const formatAxisValue = (value: number): string => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value >= 1) return `${value.toFixed(0)}`;
  return `${value.toFixed(2)}`;
};

// Revenue Chart Component with Hover Tooltip
const RevenueChart = ({
  data,
  labels,
  color = "#8b5cf6",
  height = 200,
  showGradient = true
}: {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
  showGradient?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; label: string } | null>(null);
  const pointsRef = useRef<{ x: number; y: number; value: number; label: string }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const leftPadding = 60;
    const rightPadding = 20;
    const topPadding = 20;
    const bottomPadding = 30;

    const draw = () => {
      const width = canvas.width / 2;
      const h = canvas.height / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(2, 2);

      const maxVal = Math.max(...data, 1);
      const minVal = 0;

      const tickCount = 5;
      const rawStep = maxVal / (tickCount - 1) || 1;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const niceStep = Math.ceil(rawStep / magnitude) * magnitude || 1;
      const niceMax = Math.ceil(maxVal / niceStep) * niceStep || 1;

      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      for (let i = 0; i <= tickCount - 1; i++) {
        const value = (niceMax / (tickCount - 1)) * (tickCount - 1 - i);
        const y = topPadding + (i / (tickCount - 1)) * (h - topPadding - bottomPadding);

        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftPadding, y);
        ctx.lineTo(width - rightPadding, y);
        ctx.stroke();

        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        ctx.fillText(formatAxisValue(value), leftPadding - 10, y);
      }

      const chartWidth = width - leftPadding - rightPadding;
      const chartHeight = h - topPadding - bottomPadding;

      const points: { x: number; y: number; value: number; label: string }[] = data.map((val, i) => ({
        x: leftPadding + (i / Math.max(data.length - 1, 1)) * chartWidth,
        y: topPadding + chartHeight - ((val - minVal) / niceMax) * chartHeight,
        value: val,
        label: labels?.[i] || `Day ${i + 1}`
      }));

      pointsRef.current = points;

      if (points.length > 1) {
        if (showGradient) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
          ctx.lineTo(points[points.length - 1].x, h - bottomPadding);
          ctx.lineTo(points[0].x, h - bottomPadding);
          ctx.closePath();

          const gradient = ctx.createLinearGradient(0, topPadding, 0, h - bottomPadding);
          gradient.addColorStop(0, color + "30");
          gradient.addColorStop(0.5, color + "15");
          gradient.addColorStop(1, color + "00");
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (let i = 0; i < points.length; i++) {
          const showPoint = data.length <= 15 || i % Math.ceil(data.length / 15) === 0 || i === data.length - 1;
          if (showPoint) {
            ctx.beginPath();
            ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#0a0a0a";
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = height * 2;
      draw();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [data, labels, color, height, showGradient]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || pointsRef.current.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = canvas.width / rect.width / 2;
    const scaledX = mouseX * scaleX;

    let closest = pointsRef.current[0];
    let minDist = Math.abs(scaledX - closest.x);

    for (const point of pointsRef.current) {
      const dist = Math.abs(scaledX - point.x);
      if (dist < minDist) { minDist = dist; closest = point; }
    }

    if (minDist < 30) {
      setTooltip({ x: closest.x / scaleX, y: closest.y / scaleX, value: closest.value, label: closest.label });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => setTooltip(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <p className="text-white/40">No data available</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair"
        style={{ height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 px-3 py-2 rounded-xl bg-[#0a0a0a] border border-white/10 shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y - 50, transform: "translateX(-50%)" }}
        >
          <p className="text-xs text-white/40">{tooltip.label}</p>
          <p className="text-sm font-bold text-violet-400">${tooltip.value.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
};

// Live Activity Pulse
const LivePulse = () => (
  <span className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
  </span>
);

// Sparkline Mini Chart
const Sparkline = ({ data, color = "#8b5cf6" }: { data: number[]; color?: string }) => {
  if (data.length < 2) return <div className="w-20 h-8" />;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-20 h-8" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(diffInMinutes / 1440);
  return `${days} day${days > 1 ? "s" : ""} ago`;
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
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [previousPeriodRevenue, setPreviousPeriodRevenue] = useState(0);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      setRefreshing(true);

      const now = new Date();
      const daysBack = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysBack);

      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - daysBack);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, title, price, downloads, rating, created_at")
        .eq("creator_id", user.id)
        .order("downloads", { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      const productIds = productsData?.map((p) => p.id) || [];

      if (productIds.length > 0) {
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("id, product_id, amount, created_at")
          .in("product_id", productIds)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false });

        if (salesError) throw salesError;

        const salesWithProducts = (salesData || []).map((sale: any) => ({
          ...sale,
          product: productsData?.find((p) => p.id === sale.product_id)
        }));
        setSales(salesWithProducts);

        const revenue = salesData?.reduce((sum: number, sale: any) => sum + Number(sale.amount), 0) || 0;
        setTotalRevenue(revenue);
        setTotalOrders(salesData?.length || 0);

        const { data: prevSalesData } = await supabase
          .from("sales")
          .select("amount")
          .in("product_id", productIds)
          .gte("created_at", previousStartDate.toISOString())
          .lt("created_at", startDate.toISOString());

        const prevRevenue = prevSalesData?.reduce((sum: number, sale: any) => sum + Number(sale.amount), 0) || 0;
        setPreviousPeriodRevenue(prevRevenue);

        const dailyMap = new Map<string, number>();

        for (let i = 0; i < daysBack; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          dailyMap.set(dateStr, 0);
        }

        salesData?.forEach((sale: any) => {
          const dateStr = new Date(sale.created_at).toISOString().split("T")[0];
          const current = dailyMap.get(dateStr) || 0;
          dailyMap.set(dateStr, current + Number(sale.amount));
        });

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

      const downloads = productsData?.reduce((sum, p) => sum + p.downloads, 0) || 0;
      setTotalDownloads(downloads);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user, timeRange]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("analytics-sales")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sales" }, () => {
        fetchAnalytics();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const revenueChange = safeRevenueChange(totalRevenue, previousPeriodRevenue);

  const conversionRate = totalDownloads > 0 ? (totalOrders / totalDownloads) * 100 : 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const bestSeller = products.length > 0 ? products[0] : null;
  const avgRating = products.length > 0 ? products.reduce((sum, p) => sum + p.rating, 0) / products.length : 0;

  const getProductRevenue = (productId: string) =>
    sales.filter((s) => s.product_id === productId).reduce((sum, s) => sum + Number(s.amount), 0);

  const getProductSales = (productId: string) =>
    sales.filter((s) => s.product_id === productId).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto" />
            <p className="mt-4 text-white/40 text-sm">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-16">

        {/* Header */}
        <div className="relative mb-12">
          <span className="absolute inset-0 flex items-center text-[14vw] font-black text-white/[0.02] select-none pointer-events-none leading-none overflow-hidden">
            ANALYTICS
          </span>
          <div
            className="absolute -top-20 right-0 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
            style={{ background: "rgba(124, 58, 237, 0.08)" }}
          />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-5xl font-black">Analytics</h1>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                  <LivePulse />
                  <span className="text-sm text-violet-400 font-medium">Live</span>
                </div>
              </div>
              <p className="text-white/40">Real-time insights for your store</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex rounded-xl bg-white/[0.03] border border-white/[0.07] p-1">
                {(["7d", "30d", "90d", "1y"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      timeRange === range
                        ? "bg-violet-600 text-white"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : range === "90d" ? "90 Days" : "1 Year"}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchAnalytics()}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:border-violet-500/30 text-white/60 hover:text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Revenue */}
          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6 hover:border-violet-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-violet-400" />
              </div>
              {revenueChange !== 0 && (
                <div className={`flex items-center gap-1 text-sm font-medium ${revenueChange >= 0 ? "text-violet-400" : "text-red-400"}`}>
                  {revenueChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(revenueChange).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Revenue</p>
            <p className="text-3xl font-black text-white">${totalRevenue.toFixed(2)}</p>
            <Sparkline data={dailyRevenue.slice(-10).map((d) => d.revenue)} color="#8b5cf6" />
          </div>

          {/* Orders */}
          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6 hover:border-violet-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Orders</p>
            <p className="text-3xl font-black text-white">{totalOrders}</p>
            <p className="text-xs text-white/40 mt-2">Avg: ${avgOrderValue.toFixed(2)}/order</p>
          </div>

          {/* Downloads */}
          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6 hover:border-violet-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Downloads</p>
            <p className="text-3xl font-black text-white">{totalDownloads}</p>
            <p className="text-xs text-white/40 mt-2">Across {products.length} products</p>
          </div>

          {/* Products */}
          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6 hover:border-violet-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Active Products</p>
            <p className="text-3xl font-black text-white">{products.length}</p>
            <p className="text-xs text-white/40 mt-2">Avg rating: {avgRating.toFixed(1)}★</p>
          </div>
        </div>

        {/* Revenue Chart + Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Revenue Overview</h3>
                <p className="text-sm text-white/40">Track your earnings over time</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <span className="text-sm text-white/40">Revenue</span>
              </div>
            </div>
            <RevenueChart
              data={dailyRevenue.map((d) => d.revenue)}
              labels={dailyRevenue.map((d) => {
                const date = new Date(d.date);
                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              })}
              color="#8b5cf6"
              height={280}
            />
            <div className="flex justify-between mt-4 text-xs text-white/40">
              <span>
                {timeRange === "7d" ? "7 days ago" : timeRange === "30d" ? "30 days ago" : timeRange === "90d" ? "90 days ago" : "1 year ago"}
              </span>
              <span>Today</span>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Top Products</h3>
            <div className="space-y-4">
              {products.slice(0, 5).map((product, i) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-400 shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{product.title}</p>
                    <p className="text-xs text-white/40">{getProductSales(product.id)} sales</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-violet-400">${getProductRevenue(product.id).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-violet-400/30 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No products yet</p>
                  <Link
                    to="/add-product"
                    className="inline-block mt-3 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-all"
                  >
                    Add Product
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders + Quick Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {sales.slice(0, 10).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-violet-500/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{sale.product?.title || "Unknown Product"}</p>
                      <p className="text-xs text-white/40">{formatTimeAgo(new Date(sale.created_at))}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-violet-400">+${Number(sale.amount).toFixed(2)}</p>
                    <p className="text-xs text-white/40">Completed</p>
                  </div>
                </div>
              ))}
              {sales.length === 0 && (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-violet-400/20 mx-auto mb-3" />
                  <p className="text-white/40">No orders yet</p>
                  <p className="text-white/20 text-sm mt-1">Orders will appear here in real-time</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Insights */}
          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Insights</h3>
            <div className="space-y-4">
              <div className="bg-violet-950/20 border border-violet-500/15 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-violet-400" />
                  <span className="text-violet-300 text-xs uppercase tracking-wider font-medium">Best Seller</span>
                </div>
                <p className="text-white font-black text-xl leading-tight">{bestSeller?.title || "No products yet"}</p>
                <p className="text-white/40 text-xs mt-1">
                  {bestSeller ? `${bestSeller.downloads} downloads` : "Add your first product"}
                </p>
              </div>

              <div className="bg-violet-950/20 border border-violet-500/15 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  <span className="text-violet-300 text-xs uppercase tracking-wider font-medium">Conversion Rate</span>
                </div>
                <p className="text-white font-black text-xl">{conversionRate.toFixed(1)}%</p>
                <p className="text-white/40 text-xs mt-1">Downloads to sales</p>
              </div>

              <div className="bg-violet-950/20 border border-violet-500/15 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-violet-400" />
                  <span className="text-violet-300 text-xs uppercase tracking-wider font-medium">Avg Rating</span>
                </div>
                <p className="text-white font-black text-xl">{avgRating.toFixed(1)} / 5.0</p>
                <p className="text-white/40 text-xs mt-1">Based on {products.length} products</p>
              </div>

              <div className="bg-violet-950/20 border border-violet-500/15 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {revenueChange >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-violet-400" />
                  )}
                  <span className="text-violet-300 text-xs uppercase tracking-wider font-medium">Growth</span>
                </div>
                <p className="text-white font-black text-xl">
                  {revenueChange >= 0 ? "+" : ""}{revenueChange.toFixed(1)}%
                </p>
                <p className="text-white/40 text-xs mt-1">vs previous period</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StoreAnalytics;
