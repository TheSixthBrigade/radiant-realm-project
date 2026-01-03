import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Store, 
  Plus, 
  Edit, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users,
  Settings,
  Eye,
  MoreHorizontal
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const StoreManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stores, fetchUserStore, updateStore } = useStores();
  const { products } = useProducts();
  const { toast } = useToast();
  
  const [userStore, setUserStore] = useState<any>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    store_name: '',
    description: '',
    logo_url: '',
    banner_url: '',
  });

  useEffect(() => {
    const loadUserStore = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data: store } = await fetchUserStore(user.id);
        
        if (store) {
          setUserStore(store);
          setFormData({
            store_name: store.store_name,
            description: store.description || '',
            logo_url: store.logo_url || '',
            banner_url: store.banner_url || '',
          });

          // Fetch store products
          const { data: productData } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', store.id)
            .order('created_at', { ascending: false });

          setStoreProducts(productData || []);
        }
      } catch (error) {
        console.error('Error loading store:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserStore();
  }, [user, fetchUserStore]);

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userStore) return;

    try {
      const { error } = await updateStore(userStore.id, formData);
      if (error) throw new Error(error);

      toast({
        title: "Store Updated",
        description: "Your store has been updated successfully.",
      });
      
      setEditMode(false);
      setUserStore(prev => ({ ...prev, ...formData }));
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update store",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <Card className="glass p-8 text-center max-w-md mx-auto">
            <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-4">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              You need to be logged in to manage your store.
            </p>
            <Button onClick={() => navigate('/auth')} className="btn-gaming">
              Login / Sign Up
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="text-center">Loading your store...</div>
        </div>
      </div>
    );
  }

  if (!userStore) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <Card className="glass p-8 text-center max-w-md mx-auto">
            <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-4">No Store Found</h2>
            <p className="text-muted-foreground mb-6">
              You haven't created a store yet. Create one to start selling your products.
            </p>
            <Button onClick={() => navigate('/create-store')} className="btn-gaming">
              <Plus className="w-4 h-4 mr-2" />
              Create Store
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Earnings",
      value: `$${userStore.total_earnings || 0}`,
      change: "+12.5%",
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Total Sales",
      value: userStore.total_sales || 0,
      change: "+8.2%",
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      title: "Products",
      value: storeProducts.length,
      change: "+2",
      icon: Package,
      color: "text-secondary",
    },
    {
      title: "Followers",
      value: "42",
      change: "+5",
      icon: Users,
      color: "text-warning",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Store Management</h1>
            <p className="text-muted-foreground text-lg">
              Manage your store and track your performance
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={() => navigate(`/store/${userStore.store_slug}`)}
              className="bg-card/30"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Store
            </Button>
            <Button onClick={() => navigate('/add-product')} className="btn-gaming">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="glass p-6 hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-primary glow-primary">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <Badge variant="outline" className={stat.color}>
                    {stat.change}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold gradient-text">{stat.value}</h3>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Management Tabs */}
        <Card className="glass">
          <Tabs defaultValue="overview" className="p-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Store Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Store Preview</h3>
                <Card className="glass p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {userStore.logo_url ? (
                      <img
                        src={userStore.logo_url}
                        alt={userStore.store_name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <Store className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-xl font-bold">{userStore.store_name}</h4>
                      <p className="text-muted-foreground">{userStore.store_slug}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {userStore.description || "No description provided"}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditMode(true)}
                    className="bg-card/30"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Store Info
                  </Button>
                </Card>
              </div>

              {/* Recent Products */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Recent Products</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/add-product')}
                    className="bg-card/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                
                {storeProducts.length > 0 ? (
                  <div className="space-y-3">
                    {storeProducts.slice(0, 3).map((product) => (
                      <Card key={product.id} className="glass p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                              <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{product.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                ${product.price} • {product.downloads} downloads
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="glass p-8 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No products uploaded yet</p>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="products" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Your Products ({storeProducts.length})</h3>
                  <Button onClick={() => navigate('/add-product')} className="btn-gaming">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                
                {storeProducts.length > 0 ? (
                  <div className="space-y-4">
                    {storeProducts.map((product) => (
                      <Card key={product.id} className="glass p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg">{product.title}</h4>
                              <Badge variant={product.is_featured ? 'default' : 'secondary'}>
                                {product.is_featured ? 'Featured' : 'Active'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Price</p>
                                <p className="font-semibold">${product.price}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Downloads</p>
                                <p className="font-semibold">{product.downloads}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Rating</p>
                                <p className="font-semibold">{product.rating}/5</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Category</p>
                                <p className="font-semibold">{product.category}</p>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="glass p-12 text-center">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Products Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Upload your first product to start selling
                    </p>
                    <Button onClick={() => navigate('/add-product')} className="btn-gaming">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Product
                    </Button>
                  </Card>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-6">
              <Card className="glass p-12 text-center">
                <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground">
                  Detailed analytics and insights coming soon...
                </p>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-6">
              {editMode ? (
                <form onSubmit={handleUpdateStore} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="store_name">Store Name</Label>
                      <Input
                        id="store_name"
                        value={formData.store_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
                        className="bg-card/50"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="bg-card/50"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="logo_url">Logo URL</Label>
                      <Input
                        id="logo_url"
                        type="url"
                        value={formData.logo_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                        className="bg-card/50"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="banner_url">Banner URL</Label>
                      <Input
                        id="banner_url"
                        type="url"
                        value={formData.banner_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, banner_url: e.target.value }))}
                        className="bg-card/50"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button type="submit" className="btn-gaming">
                      Save Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Card className="glass p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Store Settings</h3>
                    <Button onClick={() => setEditMode(true)} variant="outline" className="bg-card/30">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Settings
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Store Name</Label>
                      <p className="text-muted-foreground">{userStore.store_name}</p>
                    </div>
                    <div>
                      <Label>Store URL</Label>
                      <p className="text-muted-foreground">vectabse.com/store/{userStore.store_slug}</p>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <p className="text-muted-foreground">
                        {userStore.description || "No description provided"}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default StoreManagement;