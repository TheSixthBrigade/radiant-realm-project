import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Download, DollarSign, Eye, MoreHorizontal } from "lucide-react";
import Navigation from "@/components/Navigation";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data
  const stats = [
    {
      title: "Total Earnings",
      value: "$2,847.50",
      change: "+12.5%",
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Total Downloads",
      value: "1,234",
      change: "+8.2%",
      icon: Download,
      color: "text-primary",
    },
    {
      title: "Active Products",
      value: "8",
      change: "+2",
      icon: Eye,
      color: "text-secondary",
    },
    {
      title: "Monthly Revenue",
      value: "$487.20",
      change: "+23.1%",
      icon: TrendingUp,
      color: "text-warning",
    },
  ];

  const products = [
    {
      id: "1",
      title: "Advanced Sword Combat System",
      price: 24.99,
      downloads: 234,
      revenue: 587.76,
      status: "active",
      rating: 4.8,
      lastUpdated: "2 days ago",
    },
    {
      id: "2",
      title: "GUI Manager Pro",
      price: 15.99,
      downloads: 189,
      revenue: 302.11,
      status: "active",
      rating: 4.6,
      lastUpdated: "1 week ago",
    },
    {
      id: "3",
      title: "Character Animation Pack",
      price: 19.99,
      downloads: 156,
      revenue: 311.84,
      status: "pending",
      rating: 4.7,
      lastUpdated: "3 days ago",
    },
  ];

  const recentActivity = [
    { type: "sale", product: "Advanced Sword Combat System", amount: 24.99, time: "2 hours ago" },
    { type: "download", product: "GUI Manager Pro", amount: 0, time: "4 hours ago" },
    { type: "sale", product: "Character Animation Pack", amount: 19.99, time: "6 hours ago" },
    { type: "review", product: "Advanced Sword Combat System", amount: 0, time: "1 day ago" },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Creator Dashboard</h1>
            <p className="text-muted-foreground text-lg">
              Manage your products and track your success
            </p>
          </div>
          <Button className="btn-gaming mt-4 md:mt-0">
            <Plus className="w-4 h-4 mr-2" />
            Upload New Product
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="glass p-6 hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-primary glow-primary`}>
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

        {/* Dashboard Tabs */}
        <Card className="glass">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Quick Actions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex-col gap-2 bg-card/30">
                    <Plus className="w-6 h-6" />
                    Upload Product
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2 bg-card/30">
                    <TrendingUp className="w-6 h-6" />
                    View Analytics
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2 bg-card/30">
                    <DollarSign className="w-6 h-6" />
                    Payout Settings
                  </Button>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-card/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          activity.type === 'sale' ? 'bg-success' :
                          activity.type === 'download' ? 'bg-primary' : 'bg-secondary'
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
                          <p className="font-semibold text-success">+${activity.amount}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="products" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Your Products</h3>
                  <Button className="btn-gaming">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {products.map((product) => (
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
                              <p className="font-semibold">${product.price}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Downloads</p>
                              <p className="font-semibold">{product.downloads}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Revenue</p>
                              <p className="font-semibold text-success">${product.revenue}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Rating</p>
                              <p className="font-semibold">{product.rating}/5</p>
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
              </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-6">
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground">Detailed analytics and insights coming soon...</p>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-6">
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold mb-2">Account Settings</h3>
                <p className="text-muted-foreground">Manage your account settings and preferences...</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;