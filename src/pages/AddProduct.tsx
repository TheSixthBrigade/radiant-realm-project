import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import AnimatedBackground from "@/components/AnimatedBackground";
import { ImageUploadZone } from "@/components/ImageUploadZone";
import SellerRoute from "@/components/SellerRoute";

const AddProductContent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [checkingStripe, setCheckingStripe] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [fileUploading, setFileUploading] = useState(false);

  const { user } = useAuth();
  const { addProduct } = useProducts();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Prevent default drag behavior globally on this page
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent opening images in new tab when dragging
    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('drop', preventDefaults);

    return () => {
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('drop', preventDefaults);
    };
  }, []);

  // Check if Stripe is connected
  useState(() => {
    const checkPaymentMethods = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('stripe_connect_account_id, stripe_connect_status')
          .eq('user_id', user?.id)
          .single();

        const hasStripe = data?.stripe_connect_account_id && (data?.stripe_connect_status === 'connected' || data?.stripe_connect_status === 'complete');

        setStripeConnected(hasStripe);
      } catch (error) {
        console.error('Error checking payment methods:', error);
      } finally {
        setCheckingStripe(false);
      }
    };

    if (user) checkPaymentMethods();
  });

  const categories = [
    "Scripts", "Models", "Maps", "Textures", "Audio", "UI", "Tools", "Other"
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadProductFiles = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file, index) => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `files/${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        // Try to upload to product-images bucket first (since it exists)
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        return data.publicUrl;
      } catch (error) {
        console.error('Error uploading product file:', error);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter(url => url !== null) as string[];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add products",
        variant: "destructive",
      });
      return;
    }

    // Require at least one image
    if (imageUrls.length === 0) {
      toast({
        title: "Image Required",
        description: "Please upload at least one product image before publishing",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if product files are provided
      if (productFiles.length === 0) {
        throw new Error("Please upload at least one product file");
      }

      let fileUrls: string[] = [];

      // Upload product files
      setFileUploading(true);
      fileUrls = await uploadProductFiles(productFiles);
      if (fileUrls.length === 0) {
        throw new Error("Failed to upload product files");
      }

      // Create the product first
      const { data: productData, error } = await addProduct({
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        image_url: imageUrls[0] || null, // Keep first image as primary for backward compatibility
        creator_id: user.id,
        downloads: 0,
        rating: 0,
        is_featured: false,
        is_top_rated: false,
        is_new: true,
        file_urls: fileUrls, // Store the file URLs
      });

      if (error) {
        throw new Error(error);
      }

      // Multiple images are stored with the primary image in image_url field
      // Additional images can be added in future updates

      // Send newsletter to subscribers
      if (productData && productData.id) {
        try {
          // Get the user's store
          const { data: storeData } = await supabase
            .from('stores')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (storeData) {
            // Trigger newsletter sending (fire and forget - don't wait for it)
            supabase.functions.invoke('send-newsletter', {
              body: { productId: productData.id, storeId: storeData.id }
            }).catch(err => console.error('Newsletter error:', err));
          }
        } catch (err) {
          console.error('Error triggering newsletter:', err);
          // Don't fail the product creation if newsletter fails
        }
      }

      toast({
        title: "Success",
        description: "Product added successfully! Newsletter sent to your subscribers.",
      });

      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add product",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // TEMPORARILY DISABLED - PayPal OAuth pending approval
  // Show PayPal requirement if not connected
  // if (!checkingPaypal && !paypalConnected) {
  //   return (
  //     <div className="min-h-screen bg-[#0a0a0a]">
  //       <Navigation />
  //       <div className="container mx-auto px-6 pt-24 pb-12">
  //         <Card className="max-w-2xl mx-auto p-8 text-center" style={{
  //           border: '1px solid rgba(33, 150, 243, 0.2)',
  //           background: 'rgba(33, 150, 243, 0.03)'
  //         }}>
  //           <div className="mb-6">
  //             <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
  //               <span className="text-3xl">⚠️</span>
  //             </div>
  //             <h2 className="text-2xl font-bold mb-2" style={{ color: 'hsl(210, 100%, 50%)' }}>
  //               PayPal Account Required
  //             </h2>
  //             <p className="text-muted-foreground">
  //               You must connect your PayPal account before you can upload and sell products.
  //             </p>
  //           </div>
  //           
  //           <div className="space-y-4 text-left mb-6">
  //             <div className="p-4 bg-muted rounded-lg">
  //               <h3 className="font-semibold mb-2">Why do I need PayPal?</h3>
  //               <ul className="text-sm space-y-1 text-muted-foreground">
  //                 <li>• Receive payments instantly</li>
  //                 <li>• Get 95% of each sale</li>
  //                 <li>• Secure and trusted payment processing</li>
  //                 <li>• No manual payouts needed</li>
  //               </ul>
  //             </div>
  //           </div>
  //
  //           <Button 
  //             onClick={() => navigate('/dashboard?tab=settings')}
  //             className="w-full"
  //             style={{
  //               background: 'hsl(210, 100%, 50%)',
  //               color: 'white'
  //             }}
  //           >
  //             Connect PayPal Account
  //           </Button>
  //         </Card>
  //       </div>
  //     </div>
  //   );
  // }

  if (!user) {
    return (
      <div className="min-h-screen">
        <AnimatedBackground />
        <Navigation />
        <div className="container mx-auto px-6 py-24">
          <Card padding="none" className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-2xl font-bold mb-4">Login Required</h2>
              <p className="text-muted-foreground mb-4">
                You need to be logged in to add products.
              </p>
              <Button onClick={() => navigate("/auth")}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDEDED] dark:bg-[#0a0e14] transition-colors duration-500 relative">
      {/* Dotted Grid Pattern - Dark Mode Only */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(0, 168, 232, 0.4) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          backgroundPosition: '0 0, 15px 15px'
        }} />
      </div>

      {/* Animated Grid Lines - Dark Mode Only */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none opacity-15">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0, 168, 232, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 168, 232, 0.2) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          animation: 'gridMove 20s linear infinite'
        }} />
      </div>

      {/* Glowing Orbs - Dark Mode Only */}
      <div className="hidden dark:block fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Navigation />
      <div className="container mx-auto px-6 py-24 relative z-10">
        <Card variant="glass" padding="none" className="max-w-2xl mx-auto dark:bg-[#0d1219]/80 dark:border-cyan-400/20 dark:backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-3xl text-center dark:text-cyan-400">Add New Product</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Product Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter product title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe your product"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(value) => handleInputChange("category", value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Product Images (Required)</Label>
                  {imageUrls.length === 0 && (
                    <span className="text-xs text-red-500 font-medium">* Required</span>
                  )}
                </div>
                <ImageUploadZone
                  value=""
                  onChange={() => { }}
                  label="Product Images (drag from Payhip or upload)"
                  multiple
                  values={imageUrls}
                  onMultipleChange={setImageUrls}
                />
                <p className="text-sm text-muted-foreground dark:text-cyan-300/70">
                  Drag images directly from Payhip or other websites! AVIF images auto-convert to PNG.
                </p>
                {imageUrls.length === 0 && (
                  <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    ⚠️ You must upload at least one product image to publish your product.
                  </p>
                )}
              </div>

              {/* Product Files Section */}
              <div className="space-y-4">
                <Label htmlFor="files">Product Files (Required)</Label>

                {/* File List */}
                {productFiles.length > 0 && (
                  <div className="space-y-2">
                    {productFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {file.name.split('.').pop()?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setProductFiles(files => files.filter((_, i) => i !== index));
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Input
                  id="files"
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setProductFiles(prev => [...prev, ...files]);
                  }}
                  accept="*"
                />
                <p className="text-sm text-muted-foreground dark:text-cyan-300/70">
                  Upload any file type (.exe, .rbxm, .zip, etc.). Files are stored securely in isolated storage and scanned before delivery. Maximum 100MB per file.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ Note: Files are stored in isolated cloud storage and cannot execute on our servers. Buyers download at their own risk.
                </p>
                {productFiles.length === 0 && (
                  <p className="text-sm text-red-600">
                    You must upload at least one file for customers to download.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || productFiles.length === 0 || imageUrls.length === 0}
              >
                {isLoading ? "Adding Product..." : "Add Product"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Wrap with SellerRoute to require onboarding
const AddProduct = () => {
  return (
    <SellerRoute>
      <AddProductContent />
    </SellerRoute>
  );
};

export default AddProduct;