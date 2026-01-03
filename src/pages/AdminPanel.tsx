import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Package, 
  DollarSign, 
  BarChart3, 
  Shield,
  Palette,
  TrendingUp
} from "lucide-react";
import Navigation from "@/components/Navigation";
import AnnouncementsManager from "@/components/AnnouncementsManager";
import UserManagement from "@/components/UserManagement";
import CommissionManagement from "@/components/CommissionManagement";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useProducts } from "@/hooks/useProducts";
import { useStats } from "@/hooks/useStats";
import { useAuth } from "@/hooks/useAuth";
import { seedSampleData } from "@/utils/seedData";
import { toast } from "sonner";

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { user } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const { stats, loading: statsLoading } = useStats();

  useEffect(() => {
    if (!rolesLoading && !user) {
      navigate("/auth");
    }
  }, [user, rolesLoading, navigate]);

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Please sign in to access the admin panel.</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground mt-2">
              Manage your marketplace and website settings
            </p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Shield className="w-4 h-4 mr-1" />
            Admin
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      {statsLoading ? "..." : `$${stats.totalRevenue.toFixed(2)}`}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold">
                      {productsLoading ? "..." : products.length}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-primary" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                    <p className="text-2xl font-bold">
                      {statsLoading ? "..." : stats.totalSales}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Creators</p>
                    <p className="text-2xl font-bold">
                      {statsLoading ? "..." : stats.totalCreators}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {!productsLoading && products.length > 0 ? (
                    products.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Product: {product.title}</p>
                          <p className="text-xs text-muted-foreground">${product.price} • {product.downloads} downloads</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'Recently'}
                        </div>
                      </div>
                    ))
                  ) : productsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-4">
                        No products found. Add some products to see activity here.
                      </p>
                      <Button 
                        onClick={async () => {
                          const result = await seedSampleData();
                          if (result.success) {
                            toast.success(result.message);
                            window.location.reload();
                          } else {
                            toast.error(result.error || 'Failed to seed data');
                          }
                        }}
                        size="sm"
                      >
                        Add Sample Products
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => {
                    window.location.href = '/add-product';
                  }}>
                    <Package className="w-6 h-6" />
                    Add Product
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => {
                    const designTab = document.querySelector('[value="design"]') as HTMLElement;
                    designTab?.click();
                  }}>
                    <Palette className="w-6 h-6" />
                    Edit Design
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => {
                    const analyticsTab = document.querySelector('[value="analytics"]') as HTMLElement;
                    analyticsTab?.click();
                  }}>
                    <BarChart3 className="w-6 h-6" />
                    View Analytics
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => {
                    const usersTab = document.querySelector('[value="users"]') as HTMLElement;
                    usersTab?.click();
                  }}>
                    <Users className="w-6 h-6" />
                    Manage Users
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="text-2xl font-bold text-primary">
                  {productsLoading ? "..." : products.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Products</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-green-500">
                  {productsLoading ? "..." : products.filter(p => p.is_featured).length}
                </div>
                <div className="text-sm text-muted-foreground">Featured</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-green-500">
                  {productsLoading ? "..." : products.filter(p => p.is_new).length}
                </div>
                <div className="text-sm text-muted-foreground">New Products</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-orange-500">
                  {productsLoading ? "..." : products.filter(p => p.is_top_rated).length}
                </div>
                <div className="text-sm text-muted-foreground">Top Rated</div>
              </Card>
            </div>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Product Management</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Export</Button>
                  <Button size="sm">Add Product</Button>
                </div>
              </div>
              
              <div className="space-y-4">
                {productsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : products.length > 0 ? (
                  <div className="space-y-3">
                    {products.slice(0, 10).map(product => (
                      <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={product.image_url || "/placeholder.svg"} 
                            alt={product.title}
                            className="w-12 h-12 rounded object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&h=100&fit=crop";
                            }}
                          />
                          <div>
                            <h4 className="font-medium">{product.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>${product.price}</span>
                              <span>•</span>
                              <span>{product.downloads} downloads</span>
                              <span>•</span>
                              <span>★ {product.rating}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {product.is_featured && <Badge variant="default">Featured</Badge>}
                          {product.is_new && <Badge variant="secondary">New</Badge>}
                          {product.is_top_rated && <Badge variant="outline">Top Rated</Badge>}
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
                      </div>
                    ))}
                    {products.length > 10 && (
                      <div className="text-center pt-4">
                        <Button variant="outline">Load More ({products.length - 10} remaining)</Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-medium mb-2">No Products Found</h4>
                    <p className="text-muted-foreground mb-4">Get started by adding some sample products</p>
                    <Button 
                      onClick={async () => {
                        const result = await seedSampleData();
                        if (result.success) {
                          toast.success(result.message);
                          window.location.reload();
                        } else {
                          toast.error(result.error || 'Failed to seed data');
                        }
                      }}
                    >
                      Add Sample Products
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-6">
            <AnnouncementsManager />
          </TabsContent>

          <TabsContent value="commissions" className="space-y-6">
            <CommissionManagement />
          </TabsContent>

          <TabsContent value="design" className="space-y-6">
            <WebsiteBuilder />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue (30d)</p>
                    <p className="text-2xl font-bold text-green-500">
                      ${statsLoading ? "..." : stats.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sales (30d)</p>
                    <p className="text-2xl font-bold text-green-500">
                      {statsLoading ? "..." : stats.totalSales}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-green-500" />
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {statsLoading ? "..." : stats.totalProducts > 0 ? ((stats.totalSales / stats.totalProducts) * 100).toFixed(1) + "%" : "0%"}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                    <p className="text-2xl font-bold text-orange-500">
                      ${statsLoading ? "..." : stats.totalSales > 0 ? (stats.totalRevenue / stats.totalSales).toFixed(2) : "0.00"}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-orange-500" />
                </div>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Sales Overview</h3>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Sales chart will be displayed here</p>
                    <p className="text-sm text-muted-foreground">Connect analytics service for detailed charts</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Top Products</h3>
                <div className="space-y-3">
                  {productsLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : products.length > 0 ? (
                    products.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{product.title}</p>
                            <p className="text-xs text-muted-foreground">{product.downloads} downloads</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">${product.price}</p>
                          <p className="text-xs text-muted-foreground">★ {product.rating}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No products available</p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">System Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Database Management</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add sample data to populate your marketplace for testing and demonstration purposes.
                  </p>
                  <div className="flex gap-2 mb-4">
                    <Button 
                      onClick={async () => {
                        const result = await seedSampleData();
                        if (result.success) {
                          toast.success(result.message);
                          window.location.reload();
                        } else {
                          toast.error(result.error || 'Failed to seed data');
                        }
                      }}
                      variant="outline"
                    >
                      Add Sample Data
                    </Button>
                    <Button 
                      onClick={() => {
                        console.log('Products:', products);
                        console.log('Stats:', stats);
                        toast.info(`Products: ${products.length}, Stats show: ${stats.totalProducts}`);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Debug Info
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Products in useProducts: {products.length}</p>
                    <p>Products in stats: {stats.totalProducts}</p>
                    <p>Loading states: Products={productsLoading ? 'true' : 'false'}, Stats={statsLoading ? 'true' : 'false'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Other Settings</h4>
                  <p className="text-muted-foreground">Additional system configuration options coming soon</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;