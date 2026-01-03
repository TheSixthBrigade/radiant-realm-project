import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar, ExternalLink } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStyle } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";

interface PurchasedProduct {
  id: string;
  title: string;
  image_url: string;
  file_urls: string[];
  price: number;
  purchased_at: string;
  download_count: number;
}

const Downloads = () => {
  const { user } = useAuth();
  const { isCyberpunk } = useThemeStyle();
  const [purchases, setPurchases] = useState<PurchasedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching purchases for user:', user.id);
        
        // Get ALL payment transactions for this user (not just completed)
        const { data: transactions, error } = await supabase
          .from('payment_transactions')
          .select(`
            *,
            product:products(*)
          `)
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false });

        console.log('All transactions found:', transactions);
        console.log('Query error:', error);

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

        if (!transactions || transactions.length === 0) {
          console.log('No transactions found for this user');
          setLoading(false);
          return;
        }

        // Transform to PurchasedProduct format - show ALL purchases regardless of status
        const allProducts = transactions
          .filter(t => {
            console.log('Transaction status:', t.status, 'Product:', t.product);
            return t.product && t.product.id; // Only need product to exist
          })
          .map(t => ({
            id: t.product.id,
            title: t.product.title,
            image_url: t.product.image_url || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop",
            file_urls: t.product.file_urls || [],
            price: t.amount,
            purchased_at: t.created_at,
            download_count: 0
          }));

        // Remove duplicates - keep only the most recent purchase of each product
        const uniqueProducts = allProducts.reduce((acc, current) => {
          const existing = acc.find(item => item.id === current.id);
          if (!existing) {
            acc.push(current);
          } else if (new Date(current.purchased_at) > new Date(existing.purchased_at)) {
            // Replace with more recent purchase
            const index = acc.indexOf(existing);
            acc[index] = current;
          }
          return acc;
        }, [] as PurchasedProduct[]);

        console.log('Unique purchased products to display:', uniqueProducts);
        setPurchases(uniqueProducts);
      } catch (error) {
        console.error('Error fetching purchases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [user]);

  const handleDownload = async (fileUrl: string, productTitle: string) => {
    try {
      // In a real app, this would track downloads and provide secure download links
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (!user) {
    return (
      <div className={`min-h-screen ${
        isCyberpunk 
          ? 'bg-[#000000]' 
          : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
      }`}>
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="text-center py-12">
            <h1 className={`text-4xl font-bold mb-4 ${
              isCyberpunk ? 'text-[hsl(210,100%,50%)]' : 'text-white'
            }`}>Sign In Required</h1>
            <p className={`mb-8 ${
              isCyberpunk ? 'text-muted-foreground' : 'text-slate-400'
            }`}>
              Please sign in to view your downloads.
            </p>
            <Button asChild className={`${
              isCyberpunk ? '' : 'bg-green-600 hover:bg-green-700 text-white'
            }`}>
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${
        isCyberpunk 
          ? 'bg-[#000000]' 
          : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
      }`}>
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className={`animate-spin rounded-full h-32 w-32 border-b-2 ${
              isCyberpunk ? 'border-blue-600' : 'border-blue-400'
            }`}></div>
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
              src="/images/956e9412-50ba-4c82-8314-cebbb5057c6c.png" 
              alt="Downloads Background"
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-5xl font-bold mb-2 transition-colors duration-500 ${
              isCyberpunk 
                ? 'text-[hsl(210,100%,50%)] font-mono'
                : 'text-white'
            }`} style={isCyberpunk ? {
              fontFamily: "'JetBrains Mono', monospace",
              textShadow: '0 0 10px rgba(33, 150, 243, 0.5), 0 0 20px rgba(33, 150, 243, 0.3)'
            } : {}}>
              {isCyberpunk ? 'MY DOWNLOADS' : 'My Downloads'}
            </h1>
            <p className={`transition-colors duration-500 ${
              isCyberpunk ? 'text-[rgba(33,150,243,0.7)]' : 'text-slate-300'
            }`}>
              Access all your purchased digital products
            </p>
          </div>

          {purchases.length > 0 ? (
            <div className="space-y-6">
              {purchases.map((purchase) => (
                <Card 
                  key={purchase.id} 
                  className={`p-6 transition-all duration-500 ${
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
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={purchase.image_url}
                        alt={purchase.title}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">{purchase.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Purchased {new Date(purchase.purchased_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Download className="w-4 h-4" />
                              {purchase.download_count} downloads
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          ${purchase.price.toFixed(2)}
                        </Badge>
                      </div>

                      {/* Download Files */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">
                          Available Downloads:
                        </h4>
                        {purchase.file_urls && purchase.file_urls.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {purchase.file_urls.map((fileUrl, index) => {
                              const fileName = fileUrl.split('/').pop() || `File ${index + 1}`;
                              const fileExt = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                              
                              return (
                                <Button
                                  key={index}
                                  variant="outline"
                                  onClick={() => handleDownload(fileUrl, purchase.title)}
                                  className="justify-start h-auto p-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                        {fileExt}
                                      </span>
                                    </div>
                                    <div className="text-left">
                                      <p className="font-medium text-sm">{fileName}</p>
                                      <p className="text-xs text-slate-500">Click to download</p>
                                    </div>
                                  </div>
                                  <ExternalLink className="w-4 h-4 ml-auto" />
                                </Button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                              ⚠️ No download files available for this product yet. Please contact the seller.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Download className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4">No Downloads Yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                You haven't purchased any products yet. Browse our marketplace to find amazing digital assets!
              </p>
              <Button asChild>
                <a href="/shop">Browse Marketplace</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Downloads;