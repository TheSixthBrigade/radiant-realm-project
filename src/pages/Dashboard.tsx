import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Download, DollarSign, Eye } from "lucide-react";
import Navigation from "@/components/Navigation";
import CreatorOnboarding from "@/components/CreatorOnboarding";
import ProfileSettings from "@/components/ProfileSettings";
import ProductActionsMenu from "@/components/ProductActionsMenu";
import ProductEditModal from "@/components/ProductEditModal";
import ProductDeleteConfirmation from "@/components/ProductDeleteConfirmation";
import DatabaseDebugger from "@/components/DatabaseDebugger";
import StripeSettings from "@/components/StripeSettings";
import { useCreatorStats } from "@/hooks/useCreatorStats";
import { useCreatorOnboarding } from "@/hooks/useCreatorOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStyle } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isCyberpunk } = useThemeStyle();
  const [activeTab, setActiveTab] = useState("overview");
  const { stats: creatorStats, products, recentActivity, loading, error, refetch } = useCreatorStats();
  const { needsOnboarding, loading: onboardingLoading, completeOnboarding } = useCreatorOnboarding();
  const [profile, setProfile] = useState<any>(null);

  // Fetch user profile for site URL
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
  
  // Handle PayPal Connect callback
  useEffect(() => {
    const handlePayPalCallback = async () => {
      const code = searchParams.get('code');
      
      if (code && user?.id) {
        // Clear params immediately to prevent loop
        searchParams.delete('code');
        searchParams.delete('state');
        setSearchParams(searchParams);
        
        try {
          const { data, error } = await supabase.functions.invoke('paypal-callback', {
            body: { code, userId: user?.id }
          });

          if (error) throw error;

          if (data?.success) {
            toast.success("PayPal Connected!", {
              description: `Verified: ${data.email}`
            });
            setActiveTab("settings");
            refetch();
          }
        } catch (error: any) {
          console.error('PayPal callback error:', error);
          toast.error("Failed to verify PayPal account");
        }
      }
    };

    if (user) {
      handlePayPalCallback();
    }
  }, [searchParams, user]);
  
  // Product management state
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const statsCards = [
    {
      title: "Total Earnings",
      value: loading ? "..." : `$${creatorStats.totalEarnings.toFixed(2)}`,
      change: creatorStats.totalSales > 0 ? `${creatorStats.totalSales} sales` : "No sales yet",
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Total Downloads",
      value: loading ? "..." : creatorStats.totalDownloads.toLocaleString(),
      change: creatorStats.totalDownloads > 0 ? "Active" : "Get started",
      icon: Download,
      color: "text-primary",
    },
    {
      title: "Active Products",
      value: loading ? "..." : creatorStats.activeProducts.toString(),
      change: creatorStats.activeProducts > 0 ? "Published" : "Upload first",
      icon: Eye,
      color: "text-secondary",
    },
    {
      title: "Monthly Revenue",
      value: loading ? "..." : `$${creatorStats.monthlyRevenue.toFixed(2)}`,
      change: creatorStats.monthlyRevenue > 0 ? "This month" : "Start selling",
      icon: TrendingUp,
      color: "text-warning",
    },
  ];

  // Product action handlers
  const handleEditProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setEditingProduct(product);
      setEditModalOpen(true);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setDeletingProduct(product);
      setDeleteModalOpen(true);
    }
  };

  const handleToggleVisibility = async (productId: string) => {
    // This would toggle product visibility
    console.log("Toggle visibility for product:", productId);
  };

  const handleDuplicateProduct = async (productId: string) => {
    // This would duplicate the product
    console.log("Duplicate product:", productId);
  };

  const handleProductUpdated = () => {
    refetch();
  };

  const handleProductDeleted = () => {
    refetch();
  };

  // Show onboarding if needed
  if (needsOnboarding && !onboardingLoading) {
    return <CreatorOnboarding onComplete={completeOnboarding} />;
  }

  if (loading || onboardingLoading) {
    return (
      <div className={`min-h-screen ${
        isCyberpunk 
          ? 'bg-[#000000]' 
          : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
      }`}>
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-32 w-32 border-b-2 mx-auto ${
                isCyberpunk ? 'border-primary' : 'border-blue-400'
              }`}></div>
              <p className={`mt-4 ${
                isCyberpunk ? 'text-muted-foreground' : 'text-slate-400'
              }`}>Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 relative overflow-hidden ${
      isCyberpunk 
        ? 'bg-[#000000]' 
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
    }`}>
      {/* Background Effects - Cyberpunk Theme Only */}
      {isCyberpunk && (
        <>
          {/* Kinetic Systems Tactical Grid Pattern */}
          <div className="fixed inset-0 pointer-events-none">
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(33, 150, 243, 0.35) 1.2px, transparent 1.2px)',
                backgroundSize: '30px 30px'
              }} 
            />
          </div>
          
          {/* Kinetic Systems Glowing Orbs */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-20 left-20 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: 'rgba(33, 150, 243, 0.05)' }} />
            <div className="absolute bottom-20 right-20 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: 'rgba(33, 150, 243, 0.05)' }} />
          </div>
        </>
      )}

      {/* Clean Theme Background - Different from other pages */}
      {!isCyberpunk && (
        <>
          {/* Background Image - Using different image */}
          <div className="fixed inset-0">
            <img 
              src="/images/88cb2391-e55a-42fc-b5c4-01c29096737a.png" 
              alt="Dashboard Background"
              className="w-full h-full object-cover opacity-80"
            />
            {/* Light Overlay for Text Readability */}
            <div className="absolute inset-0 bg-slate-900/40" />
          </div>
          
          {/* Clean Ambient Glow Effects */}
          <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-green-500/8 rounded-full blur-[150px] pointer-events-none" />
          <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[150px] pointer-events-none" />
        </>
      )}
      
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className={`text-5xl font-bold mb-2 transition-colors duration-500 ${
              isCyberpunk 
                ? 'text-[hsl(210,100%,50%)] font-mono'
                : 'text-white'
            }`} style={isCyberpunk ? {
              fontFamily: "'JetBrains Mono', monospace",
              textShadow: '0 0 10px rgba(33, 150, 243, 0.5), 0 0 20px rgba(33, 150, 243, 0.3)'
            } : {}}>
              {isCyberpunk ? 'CREATOR DASHBOARD' : 'Creator Dashboard'}
            </h1>
            <p className={`transition-colors duration-500 ${
              isCyberpunk ? 'text-[rgba(33,150,243,0.7)]' : 'text-slate-300'
            }`}>
              Manage your products and track your success
            </p>
          </div>
          <Button asChild className={`mt-4 md:mt-0 ${
            isCyberpunk 
              ? '' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}>
            <Link to="/add-product">
              <Plus className="w-4 h-4 mr-2" />
              Upload New Product
            </Link>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.title} 
                className={`p-6 hover-lift transition-all duration-500 hover:-translate-y-1 ${
                  isCyberpunk 
                    ? ''
                    : 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50'
                }`}
                style={isCyberpunk ? {
                  border: '1px solid rgba(33, 150, 243, 0.2)',
                  background: 'rgba(33, 150, 243, 0.03)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1), inset 0 0 32px rgba(33, 150, 243, 0.05)'
                } : {}}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-primary/10`}>
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant="outline" className={stat.color}>
                    {stat.change}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Dashboard Tabs */}
        <Card 
          className={`transition-all duration-500 ${
            isCyberpunk 
              ? ''
              : 'bg-slate-800/50 border-slate-700/50 backdrop-blur-sm'
          }`}
          style={isCyberpunk ? {
            border: '1px solid rgba(33, 150, 243, 0.2)',
            background: 'rgba(33, 150, 243, 0.03)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1), inset 0 0 32px rgba(33, 150, 243, 0.05)'
          } : {}}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="store">Store Builder</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="debug">Debug</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-card/30">
                    <Link to="/add-product">
                      <Plus className="w-6 h-6" />
                      Upload Product
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2 bg-card/30" onClick={() => setActiveTab("store")}>
                    <TrendingUp className="w-6 h-6" />
                    Customize Store
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2 bg-card/30" onClick={() => setActiveTab("settings")}>
                    <DollarSign className="w-6 h-6" />
                    Profile Settings
                  </Button>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-card/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            activity.type === 'sale' ? 'bg-green-500' :
                            activity.type === 'download' ? 'bg-blue-500' : 'bg-yellow-500'
                          }`} />
                          <div>
                            <p className="font-medium">
                              {activity.type === 'sale' && 'New Sale'}
                              {activity.type === 'download' && 'New Download'}
                              {activity.type === 'review' && 'New Review'}
                            </p>
                            <p className="text-sm text-muted-foreground">{activity.product}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {activity.amount > 0 && (
                            <p className="font-semibold text-green-500">+${activity.amount.toFixed(2)}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No recent activity. Start by uploading your first product!</p>
                      <Button asChild className="mt-4">
                        <Link to="/add-product">
                          <Plus className="w-4 h-4 mr-2" />
                          Upload Product
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="products" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Your Products</h3>
                  <Button asChild>
                    <Link to="/add-product">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Link>
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {products.length > 0 ? (
                    products.map((product) => (
                      <Card key={product.id} className="glass p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg">{product.title}</h4>
                              <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                {product.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Price</p>
                                <p className="font-semibold">${product.price.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Downloads</p>
                                <p className="font-semibold">{product.downloads}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Revenue</p>
                                <p className="font-semibold text-green-500">${product.revenue.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Rating</p>
                                <p className="font-semibold">{product.rating.toFixed(1)}/5</p>
                              </div>
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
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Eye className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Products Yet</h3>
                      <p className="text-muted-foreground mb-6">Upload your first product to start earning!</p>
                      <Button asChild>
                        <Link to="/add-product">
                          <Plus className="w-4 h-4 mr-2" />
                          Upload Your First Product
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="store" className="mt-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Website Builder</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize your store with the live page builder
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const slug = profile?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
                      window.open(`/site/${slug}`, '_blank');
                    }}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Site
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Your Store URL</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {profile?.display_name 
                        ? `/site/${profile.display_name.toLowerCase().replace(/\s+/g, '-')}`
                        : 'Set up your display name in Settings'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const slug = profile?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
                        navigator.clipboard.writeText(`${window.location.origin}/site/${slug}`);
                        toast.success('URL copied to clipboard!');
                      }}
                    >
                      Copy URL
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Page Builder</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add sections like Header, Hero, Product Grid, Footer and customize them
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const slug = profile?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
                          window.open(`/site/${slug}`, '_blank');
                        }}
                      >
                        Open Builder
                      </Button>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Store Style</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Customize colors, fonts, and overall design of your store
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const slug = profile?.display_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
                          window.open(`/site/${slug}`, '_blank');
                        }}
                      >
                        Customize Style
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">💡 Quick Tip</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Click "Preview Site" to open your live store in a new tab. The page builder sidebar will appear on the left where you can add and customize sections like Payhip!
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4">Performance Analytics</h3>
                
                {/* Revenue Chart */}
                <Card 
                  className="p-6"
                  style={{
                    border: '1px solid rgba(33, 150, 243, 0.2)',
                    background: 'rgba(33, 150, 243, 0.03)'
                  }}
                >
                  <h4 className="font-semibold mb-4">Revenue Overview</h4>
                  <div className="space-y-4">
                    {/* Last 7 days revenue bars */}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                      const revenue = Math.random() * 100;
                      return (
                        <div key={day} className="flex items-center gap-4">
                          <span className="w-12 text-sm" style={{ color: 'rgba(33, 150, 243, 0.7)' }}>{day}</span>
                          <div className="flex-1 h-8 rounded overflow-hidden" style={{ background: 'rgba(33, 150, 243, 0.1)' }}>
                            <div 
                              className="h-full transition-all duration-500"
                              style={{ 
                                width: `${revenue}%`,
                                background: 'linear-gradient(90deg, hsl(210, 100%, 50%), hsl(180, 100%, 50%))',
                                boxShadow: '0 0 10px rgba(33, 150, 243, 0.4)'
                              }}
                            />
                          </div>
                          <span className="w-16 text-sm font-semibold" style={{ color: 'hsl(210, 100%, 50%)' }}>
                            ${revenue.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Top Products */}
                <Card 
                  className="p-6"
                  style={{
                    border: '1px solid rgba(33, 150, 243, 0.2)',
                    background: 'rgba(33, 150, 243, 0.03)'
                  }}
                >
                  <h4 className="font-semibold mb-4">Top Performing Products</h4>
                  <div className="space-y-3">
                    {products.slice(0, 5).map((product, i) => (
                      <div key={product.id} className="flex items-center justify-between p-3 rounded" style={{ background: 'rgba(33, 150, 243, 0.05)' }}>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded flex items-center justify-center font-bold"
                            style={{ 
                              background: 'rgba(33, 150, 243, 0.2)',
                              color: 'hsl(210, 100%, 50%)'
                            }}
                          >
                            #{i + 1}
                          </div>
                          <div>
                            <p className="font-medium">{product.title}</p>
                            <p className="text-sm" style={{ color: 'rgba(33, 150, 243, 0.6)' }}>
                              {product.downloads} downloads
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold" style={{ color: 'hsl(180, 100%, 50%)' }}>
                            ${product.revenue.toFixed(2)}
                          </p>
                          <p className="text-sm" style={{ color: 'rgba(33, 150, 243, 0.6)' }}>
                            {product.rating.toFixed(1)}★
                          </p>
                        </div>
                      </div>
                    ))}
                    {products.length === 0 && (
                      <div className="text-center py-8">
                        <p style={{ color: 'rgba(33, 150, 243, 0.6)' }}>
                          No products yet. Upload your first product to see analytics!
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Traffic Sources */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card 
                    className="p-6"
                    style={{
                      border: '1px solid rgba(33, 150, 243, 0.2)',
                      background: 'rgba(33, 150, 243, 0.03)'
                    }}
                  >
                    <h4 className="font-semibold mb-2">Direct Traffic</h4>
                    <p className="text-3xl font-bold" style={{ color: 'hsl(210, 100%, 50%)' }}>
                      {Math.floor(Math.random() * 1000)}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'rgba(33, 150, 243, 0.6)' }}>
                      +{Math.floor(Math.random() * 50)}% this week
                    </p>
                  </Card>
                  
                  <Card 
                    className="p-6"
                    style={{
                      border: '1px solid rgba(33, 150, 243, 0.2)',
                      background: 'rgba(33, 150, 243, 0.03)'
                    }}
                  >
                    <h4 className="font-semibold mb-2">Social Media</h4>
                    <p className="text-3xl font-bold" style={{ color: 'hsl(180, 100%, 50%)' }}>
                      {Math.floor(Math.random() * 500)}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'rgba(33, 150, 243, 0.6)' }}>
                      +{Math.floor(Math.random() * 30)}% this week
                    </p>
                  </Card>
                  
                  <Card 
                    className="p-6"
                    style={{
                      border: '1px solid rgba(33, 150, 243, 0.2)',
                      background: 'rgba(33, 150, 243, 0.03)'
                    }}
                  >
                    <h4 className="font-semibold mb-2">Search Engines</h4>
                    <p className="text-3xl font-bold" style={{ color: 'hsl(195, 100%, 50%)' }}>
                      {Math.floor(Math.random() * 750)}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'rgba(33, 150, 243, 0.6)' }}>
                      +{Math.floor(Math.random() * 40)}% this week
                    </p>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-6">
              <div className="space-y-6">
                <ProfileSettings />
                <div id="stripe-settings-section">
                  <StripeSettings />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="debug" className="mt-6">
              <DatabaseDebugger />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Product Edit Modal */}
        <ProductEditModal
          product={editingProduct}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onProductUpdated={handleProductUpdated}
        />

        {/* Product Delete Confirmation */}
        <ProductDeleteConfirmation
          product={deletingProduct}
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onProductDeleted={handleProductDeleted}
        />
      </div>
    </div>
  );
};

export default Dashboard;