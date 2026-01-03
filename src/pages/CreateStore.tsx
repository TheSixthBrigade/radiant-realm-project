import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Store, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { useToast } from "@/hooks/use-toast";

const CreateStore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createStore } = useStores();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    store_name: '',
    store_slug: '',
    description: '',
    logo_url: '',
    banner_url: '',
  });
  const [loading, setLoading] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      store_name: name,
      store_slug: generateSlug(name)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await createStore({
        ...formData,
        user_id: user.id,
        is_active: true,
      });

      if (error) throw new Error(error);

      toast({
        title: "Store Created!",
        description: "Your store has been successfully created.",
      });

      navigate(`/store/${formData.store_slug}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create store",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
              You need to be logged in to create a store.
            </p>
            <Button onClick={() => navigate('/auth')} className="btn-gaming">
              Login / Sign Up
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-card/50"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold gradient-text">Create Your Store</h1>
              <p className="text-muted-foreground text-lg">
                Set up your marketplace to start selling your creations
              </p>
            </div>
          </div>

          {/* Form */}
          <Card className="glass p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Store Name */}
              <div className="space-y-2">
                <Label htmlFor="store_name">Store Name *</Label>
                <Input
                  id="store_name"
                  value={formData.store_name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="My Awesome Store"
                  required
                  className="bg-card/50"
                />
              </div>

              {/* Store Slug */}
              <div className="space-y-2">
                <Label htmlFor="store_slug">Store URL *</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-muted text-muted-foreground text-sm">
                    vectabse.com/store/
                  </span>
                  <Input
                    id="store_slug"
                    value={formData.store_slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, store_slug: e.target.value }))}
                    placeholder="my-awesome-store"
                    required
                    className="rounded-l-none bg-card/50"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  This will be your store's unique URL
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell customers about your store and what you sell..."
                  rows={4}
                  className="bg-card/50"
                />
              </div>

              {/* Logo URL */}
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL (Optional)</Label>
                <Input
                  id="logo_url"
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="bg-card/50"
                />
              </div>

              {/* Banner URL */}
              <div className="space-y-2">
                <Label htmlFor="banner_url">Banner URL (Optional)</Label>
                <Input
                  id="banner_url"
                  type="url"
                  value={formData.banner_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, banner_url: e.target.value }))}
                  placeholder="https://example.com/banner.png"
                  className="bg-card/50"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData.store_name || !formData.store_slug}
                  className="flex-1 btn-gaming"
                >
                  {loading ? (
                    "Creating..."
                  ) : (
                    <>
                      <Store className="w-4 h-4 mr-2" />
                      Create Store
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <Card className="glass p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Products
              </h3>
              <p className="text-sm text-muted-foreground">
                After creating your store, you can upload and manage your products
              </p>
            </Card>
            <Card className="glass p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Store className="w-4 h-4" />
                Store Analytics
              </h3>
              <p className="text-sm text-muted-foreground">
                Track your sales, earnings, and customer engagement
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStore;