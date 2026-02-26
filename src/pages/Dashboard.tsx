import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Download, DollarSign, Eye, Store, ShoppingBag, Package, ShoppingCart, Palette, Layout as LayoutIcon, Globe, Image as ImageIcon, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { safeRevenueChange } from "@/lib/analyticsUtils";
import Navigation from "@/components/Navigation";
import CreatorOnboarding from "@/components/CreatorOnboarding";
import ProfileSettings from "@/components/ProfileSettings";
import ProductActionsMenu from "@/components/ProductActionsMenu";
import ProductEditModal from "@/components/ProductEditModal";
import ProductDeleteConfirmation from "@/components/ProductDeleteConfirmation";
import DatabaseDebugger from "@/components/DatabaseDebugger";
import StripeSettings from "@/components/StripeSettings";
import { AffiliateManager } from "@/components/AffiliateManager";
import { DiscountCodesManager } from "@/components/DiscountCodesManager";
import { useCreatorStats } from "@/hooks/useCreatorStats";
import { useCreatorOnboarding } from "@/hooks/useCreatorOnboarding";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStyle } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCyberpunk } = useThemeStyle();
  const [activeTab, setActiveTab] = useState("overview");
  const { stats: creatorStats, products, recentActivity, loading, error, refetch, previousMonthRevenue } = useCreatorStats();
  const { needsOnboarding, loading: onboardingLoading, completeOnboarding } = useCreatorOnboarding();
  const { status: sellerStatus, isLoading: sellerStatusLoading } = useOnboardingStatus();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const handlePayPalCallback = async () => {
      const code = searchParams.get('code');
      if (code && user?.id) {
        searchParams.delete('code');
        searchParams.delete('state');
        setSearchParams(searchParams);
        try {
          const { data, error } = await supabase.functions.invoke('paypal-callback', {
            body: { code, userId: user?.id }
          });
          if (error) throw error;
          if (data?.success) {
            toast.success("PayPal Connected!", { description: `Verified: ${data.email}` });
            setActiveTab("settings");
            refetch();
          }
        } catch (error: any) {
          console.error('PayPal callback error:', error);
          toast.error("Failed to verify PayPal account");
        }
      }
    };
    if (user) handlePayPalCallback();
  }, [searchParams, user]);

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const statsCards = [
    { title: "Total Revenue", value: loading ? "..." : `$${creatorStats.totalEarnings.toFixed(2)}`, sub: creatorStats.totalSales > 0 ? `${creatorStats.totalSales} sales` : "No sales yet", icon: DollarSign },
    { title: "Total Purchases", value: loading ? "..." : creatorStats.totalSales.toLocaleString(), sub: creatorStats.totalSales > 0 ? "Orders completed" : "Get started", icon: ShoppingCart },
    { title: "Active Products", value: loading ? "..." : creatorStats.activeProducts.toString(), sub: creatorStats.activeProducts > 0 ? "Published" : "Upload first", icon: Eye },
    { title: "Monthly Revenue", value: loading ? "..." : `$${creatorStats.monthlyRevenue.toFixed(2)}`, sub: creatorStats.monthlyRevenue > 0 ? "This month" : "Start selling", icon: TrendingUp },
  ];

  const monthlyRevenueChange = safeRevenueChange(creatorStats.monthlyRevenue, previousMonthRevenue);

  const handleEditProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) { setEditingProduct(product); setEditModalOpen(true); }
  };
  const handleDeleteProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) { setDeletingProduct(product); setDeleteModalOpen(true); }
  };
  const handleToggleVisibility = async (productId: string) => { console.log("Toggle visibility for product:", productId); };
  const handleDuplicateProduct = async (productId: string) => { console.log("Duplicate product:", productId); };
  const handleProductUpdated = () => { refetch(); };
  const handleProductDeleted = () => { refetch(); };

  if (needsOnboarding && !onboardingLoading) {
    return <CreatorOnboarding onComplete={completeOnboarding} />;
  }

  if (loading || onboardingLoading || sellerStatusLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto" />
            <p className="mt-4 text-white/40 text-sm">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sellerStatus?.is_creator) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <div className="max-w-4xl mx-auto px-6 pt-28 pb-16">
          <h1 className="text-4xl font-black mb-1">My Account</h1>
          <p className="text-white/40 mb-10">Manage your purchases and account settings</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { to: "/downloads", icon: Download, label: "My Downloads", sub: "Access purchased products", color: "text-violet-400", bg: "bg-violet-500/10" },
              { to: "/shop", icon: ShoppingBag, label: "Browse Shop", sub: "Discover new products", color: "text-blue-400", bg: "bg-blue-500/10" },
              { to: "/creators", icon: Package, label: "Creators", sub: "Find top sellers", color: "text-purple-400", bg: "bg-purple-500/10" },
            ].map(({ to, icon: Icon, label, sub, color, bg }) => (
              <Link key={to} to={to} className="group bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6 flex flex-col items-center text-center gap-3 hover:border-violet-500/30 transition-all">
                <div className={`p-3 rounded-xl ${bg}`}><Icon className={`w-7 h-7 ${color}`} /></div>
                <div>
                  <p className="font-semibold text-white group-hover:text-violet-300 transition-colors">{label}</p>
                  <p className="text-sm text-white/40">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="bg-[#0a0a0a] border border-violet-500/20 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-violet-500/10"><Store className="w-8 h-8 text-violet-400" /></div>
              <div>
                <h3 className="text-lg font-bold text-white">Want to Sell Your Creations?</h3>
                <p className="text-white/40 text-sm mt-1">Join our creators. Keep 95% of your earnings with instant Stripe payouts.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/onboarding', { state: { becomeCreator: true } })}
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Store className="w-4 h-4" /> Become a Seller
            </button>
          </div>
          <ProfileSettings />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "products", label: "Products" },
    { id: "store", label: "Store Builder" },
    { id: "affiliates", label: "Affiliates" },
    { id: "discounts", label: "Discounts" },
    { id: "analytics", label: "Analytics" },
    { id: "settings", label: "Settings" },
    { id: "debug", label: "Debug" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-16">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <p className="text-violet-400 text-xs font-mono uppercase tracking-widest mb-2">Creator Dashboard</p>
            <h1 className="text-5xl font-black leading-none">Your Store</h1>
          </div>
          <Link
            to="/add-product"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Upload Product
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statsCards.map(({ title, value, sub, icon: Icon }) => (
            <div key={title} className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6 hover:border-violet-500/20 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                {title === "Monthly Revenue" && previousMonthRevenue > 0 ? (
                  <div className={`flex items-center gap-1 text-xs font-medium ${monthlyRevenueChange >= 0 ? "text-violet-400" : "text-red-400"}`}>
                    {monthlyRevenueChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(monthlyRevenueChange).toFixed(1)}%
                  </div>
                ) : (
                  <span className="text-xs text-white/30 font-mono">{sub}</span>
                )}
              </div>
              <p className="text-3xl font-black text-white mb-1">{value}</p>
              <p className="text-xs text-white/40 uppercase tracking-wider">{title}</p>
            </div>
          ))}
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-1 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-violet-600 text-white"
                  : "text-white/40 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {!sellerStatusLoading && sellerStatus && !sellerStatus.is_fully_onboarded && (
                <div className="bg-violet-950/30 border border-violet-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-violet-500/10"><Store className="w-6 h-6 text-violet-400" /></div>
                    <div>
                      <p className="font-bold text-white">Complete Your Seller Setup</p>
                      <p className="text-sm text-white/40">
                        {!sellerStatus.tos_agreed
                          ? "Accept our terms of service to start selling"
                          : !sellerStatus.profile_completed
                          ? "Add your business details to continue"
                          : "Connect Stripe to receive payments"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/onboarding', { state: { becomeCreator: true } })}
                    className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    <Store className="w-4 h-4" />
                    {sellerStatus.tos_agreed ? 'Continue Setup' : 'Become a Seller'}
                  </button>
                </div>
              )}

              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Quick Actions</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: "Upload Product", sub: "Add a new product", icon: Plus, action: () => navigate('/add-product') },
                    { label: "Customize Store", sub: "Edit your store page", icon: Store, action: () => setActiveTab("store") },
                    { label: "Profile Settings", sub: "Update your profile", icon: DollarSign, action: () => setActiveTab("settings") },
                  ].map(({ label, sub, icon: Icon, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4 text-left hover:border-violet-500/30 hover:bg-violet-950/20 transition-all group"
                    >
                      <Icon className="w-5 h-5 text-violet-400 mb-2" />
                      <p className="font-semibold text-white text-sm group-hover:text-violet-300 transition-colors">{label}</p>
                      <p className="text-xs text-white/30">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Recent Activity</p>
                {recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.map((activity, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${activity.type === 'sale' ? 'bg-violet-500' : activity.type === 'download' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {activity.type === 'sale' ? 'New Sale' : activity.type === 'download' ? 'New Download' : 'New Review'}
                            </p>
                            <p className="text-xs text-white/40">{activity.product}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {activity.amount > 0 && <p className="text-sm font-bold text-violet-400">+${activity.amount.toFixed(2)}</p>}
                          <p className="text-xs text-white/30">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-white/[0.05] rounded-xl">
                    <p className="text-white/30 text-sm mb-4">No recent activity. Upload your first product to get started.</p>
                    <Link
                      to="/add-product"
                      className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Upload Product
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Products */}
          {activeTab === "products" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-white/40 text-xs uppercase tracking-widest">Your Products</p>
                <Link
                  to="/add-product"
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Product
                </Link>
              </div>
              {products.length > 0 ? products.map(product => (
                <div key={product.id} className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-5 flex items-center justify-between hover:border-violet-500/20 transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="font-bold text-white">{product.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${product.status === 'active' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                        {product.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {[
                        { label: "Price", value: `$${product.price.toFixed(2)}` },
                        { label: "Downloads", value: product.downloads },
                        { label: "Revenue", value: `$${product.revenue.toFixed(2)}`, violet: true },
                        { label: "Rating", value: `${product.rating.toFixed(1)}/5` },
                      ].map(({ label, value, violet }) => (
                        <div key={label}>
                          <p className="text-white/30 text-xs mb-0.5">{label}</p>
                          <p className={`font-bold ${violet ? 'text-violet-400' : 'text-white'}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ProductActionsMenu
                    productId={product.id}
                    productTitle={product.title}
                    isActive={product.status === 'active'}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    onToggleVisibility={handleToggleVisibility}
                    onDuplicate={handleDuplicateProduct}
                  />
                </div>
              )) : (
                <div className="text-center py-16 border border-white/[0.05] rounded-xl">
                  <Eye className="w-12 h-12 mx-auto text-white/10 mb-4" />
                  <h3 className="text-lg font-bold mb-2">No Products Yet</h3>
                  <p className="text-white/30 text-sm mb-6">Upload your first product to start earning.</p>
                  <Link
                    to="/add-product"
                    className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Upload Your First Product
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Store Builder */}
          {activeTab === "store" && (
            <div className="space-y-6">
              {/* Top bar */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Store Builder</p>
                  <h2 className="text-2xl font-black text-white">Your Store</h2>
                  <p className="text-sm text-white/40 mt-1">
                    {profile?.display_name
                      ? `vectabase.com/${profile.display_name.toLowerCase().replace(/\s+/g, '-')}`
                      : 'Set your display name in Settings to get your store URL'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const slug = profile?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
                      navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
                      toast.success('URL copied!');
                    }}
                    className="flex items-center gap-2 border border-white/10 hover:border-violet-500/30 text-white/60 hover:text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
                  >
                    <Eye className="w-4 h-4" /> Copy URL
                  </button>
                  <button
                    onClick={() => {
                      const slug = profile?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
                      window.open(`/${slug}`, '_blank');
                    }}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                  >
                    <Store className="w-4 h-4" /> Open Builder
                  </button>
                </div>
              </div>

              {/* Store preview card - no iframe to avoid reload loops */}
              {profile?.display_name && (
                <div className="rounded-2xl border border-white/[0.07] overflow-hidden bg-[#050505]">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] bg-white/[0.02]">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-white/10" />
                      <div className="w-3 h-3 rounded-full bg-white/10" />
                      <div className="w-3 h-3 rounded-full bg-white/10" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-white/[0.05] border border-white/[0.07] rounded-lg px-3 py-1 text-xs text-white/40 font-mono">
                        vectabase.com/{profile.display_name.toLowerCase().replace(/\s+/g, '-')}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const slug = profile.display_name.toLowerCase().replace(/\s+/g, '-');
                        window.open(`/${slug}`, '_blank');
                      }}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Open ↗
                    </button>
                  </div>
                  <div
                    className="w-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-violet-950/30 to-black"
                    style={{ height: '420px' }}
                  >
                    <Store className="w-12 h-12 text-violet-400/40" />
                    <div className="text-center">
                      <p className="text-white/60 font-semibold mb-1">Your Store</p>
                      <p className="text-white/30 text-sm mb-4">Open the builder to edit your store live</p>
                      <button
                        onClick={() => {
                          const slug = profile.display_name.toLowerCase().replace(/\s+/g, '-');
                          window.open(`/${slug}`, '_blank');
                        }}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors mx-auto"
                      >
                        <Store className="w-4 h-4" /> Open Builder
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick customization cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    icon: Palette,
                    title: 'Theme & Colors',
                    desc: 'Customize your store colors, fonts, and background style',
                    action: () => {
                      const slug = profile?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
                      window.open(`/${slug}`, '_blank');
                    },
                    label: 'Edit Style',
                    badge: null,
                  },
                  {
                    icon: LayoutIcon,
                    title: 'Page Sections',
                    desc: 'Add hero banners, product grids, testimonials, and more',
                    action: () => {
                      const slug = profile?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
                      window.open(`/${slug}`, '_blank');
                    },
                    label: 'Edit Sections',
                    badge: null,
                  },
                  {
                    icon: Globe,
                    title: 'Custom Pages',
                    desc: 'Add About, Roadmap, Community, and Terms of Service pages',
                    action: () => {
                      const slug = profile?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
                      window.open(`/${slug}`, '_blank');
                    },
                    label: 'Manage Pages',
                    badge: 'Pro',
                  },
                  {
                    icon: ImageIcon,
                    title: 'Media & Branding',
                    desc: 'Upload your logo, banner, and product images',
                    action: () => navigate('/add-product'),
                    label: 'Upload Media',
                    badge: null,
                  },
                  {
                    icon: ShoppingBag,
                    title: 'Products',
                    desc: 'Manage which products appear on your store',
                    action: () => setActiveTab('products'),
                    label: 'Manage Products',
                    badge: null,
                  },
                  {
                    icon: TrendingUp,
                    title: 'Analytics',
                    desc: 'See how your store is performing with real-time data',
                    action: () => navigate('/analytics'),
                    label: 'View Analytics',
                    badge: null,
                  },
                ].map(({ icon: Icon, title, desc, action, label, badge }) => (
                  <button
                    key={title}
                    onClick={action}
                    className="group bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5 text-left hover:border-violet-500/30 hover:bg-violet-950/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-violet-400" />
                      </div>
                      {badge && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-white text-sm group-hover:text-violet-300 transition-colors mb-1">{title}</p>
                    <p className="text-xs text-white/30 leading-relaxed mb-4">{desc}</p>
                    <span className="text-xs text-violet-400 group-hover:text-violet-300 transition-colors font-medium">
                      {label} →
                    </span>
                  </button>
                ))}
              </div>

              {/* Theme presets */}
              <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Quick Theme Presets</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { name: 'Dark Violet', bg: 'from-[#0a0a0a] to-[#1a0a2e]', accent: '#7c3aed', label: 'Dark' },
                    { name: 'Midnight Blue', bg: 'from-[#0a0a1a] to-[#0f1a3a]', accent: '#3b82f6', label: 'Blue' },
                    { name: 'Forest', bg: 'from-[#0a1a0a] to-[#0f2a1a]', accent: '#22c55e', label: 'Green' },
                    { name: 'Crimson', bg: 'from-[#1a0a0a] to-[#2a0f0f]', accent: '#ef4444', label: 'Red' },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        const slug = profile?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
                        window.open(`/${slug}`, '_blank');
                        toast.success(`Open the Style Editor in your store to apply the ${preset.name} theme`);
                      }}
                      className="group relative rounded-xl overflow-hidden border border-white/[0.07] hover:border-violet-500/30 transition-all aspect-video"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${preset.bg}`} />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-white/80">{preset.label}</span>
                        <div className="w-3 h-3 rounded-full" style={{ background: preset.accent }} />
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/30 mt-3">Click a preset then use the Style Editor in your store to apply it</p>
              </div>

              {/* Tip */}
              <div className="bg-violet-950/20 border border-violet-500/20 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-300 mb-1">How to customize your store</p>
                  <p className="text-xs text-violet-300/60 leading-relaxed">
                    Click "Open Builder" to open your live store. A sidebar will appear on the left where you can add sections, change colors, upload images, and manage pages. All changes save instantly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "affiliates" && <AffiliateManager mode="owner" />}
          {activeTab === "discounts" && <DiscountCodesManager />}

          {activeTab === "analytics" && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-2xl font-black mb-2">Advanced Analytics</h3>
              <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">View detailed real-time analytics with animated charts, live visitor tracking, and comprehensive insights.</p>
              <Link
                to="/analytics"
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <TrendingUp className="w-4 h-4" /> Open Analytics Dashboard
              </Link>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <ProfileSettings />
              <div id="stripe-settings-section"><StripeSettings /></div>
            </div>
          )}

          {activeTab === "debug" && <DatabaseDebugger />}
        </div>
      </div>

      <ProductEditModal product={editingProduct} open={editModalOpen} onOpenChange={setEditModalOpen} onProductUpdated={handleProductUpdated} />
      <ProductDeleteConfirmation product={deletingProduct} open={deleteModalOpen} onOpenChange={setDeleteModalOpen} onProductDeleted={handleProductDeleted} />
    </div>
  );
};

export default Dashboard;
