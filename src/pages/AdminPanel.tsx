import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Users, 
  Package, 
  DollarSign, 
  BarChart3, 
  Shield,
  Palette,
  Globe
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useProducts } from "@/hooks/useProducts";
import { useStats } from "@/hooks/useStats";
import { useAuth } from "@/hooks/useAuth";

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { user } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const { stats, loading: statsLoading } = useStats();

  useEffect(() => {
    if (!rolesLoading && (!user || !isAdmin())) {
      navigate("/auth");
    }
  }, [user, isAdmin, rolesLoading, navigate]);

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

  if (!user || !isAdmin()) {
    return null;
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
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

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Recent products and activity will appear here
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Product Management</h3>
                <Button>Add Product</Button>
              </div>
              <div className="space-y-4">
                {productsLoading ? (
                  <p>Loading products...</p>
                ) : products.length > 0 ? (
                  products.slice(0, 10).map(product => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={product.image_url || "/placeholder.svg"} 
                          alt={product.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div>
                          <h4 className="font-medium">{product.title}</h4>
                          <p className="text-sm text-muted-foreground">${product.price}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={product.is_featured ? "default" : "outline"}>
                          {product.is_featured ? "Featured" : "Regular"}
                        </Badge>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No products found</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="design" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center">
                    <Palette className="w-5 h-5 mr-2" />
                    Website Builder
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Customize your marketplace appearance and branding
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Theme Settings</h4>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Globe className="w-4 h-4 mr-2" />
                      Site Logo & Branding
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Palette className="w-4 h-4 mr-2" />
                      Color Scheme
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Layout Options
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Content Management</h4>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      Hero Section
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Featured Products
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Footer Content
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">User Management</h3>
              <p className="text-muted-foreground">User management features coming soon</p>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Analytics Dashboard</h3>
              <p className="text-muted-foreground">Analytics dashboard coming soon</p>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">System Settings</h3>
              <p className="text-muted-foreground">System configuration options coming soon</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;