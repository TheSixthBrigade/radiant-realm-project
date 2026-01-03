import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';

export const HomeHero: React.FC = () => {
  const { products } = useProducts();
  const [stats, setStats] = React.useState({
    totalProducts: 0,
    totalCreators: 0,
    totalDownloads: 0
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total products
        const totalProducts = products.length;

        // Get unique creators
        const uniqueCreators = new Set(products.map(p => p.creator_id)).size;

        // Get total downloads
        const totalDownloads = products.reduce((sum, p) => sum + (p.downloads || 0), 0);

        setStats({
          totalProducts,
          totalCreators: uniqueCreators,
          totalDownloads
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (products.length > 0) {
      fetchStats();
    }
  }, [products]);

  return (
    <div className="relative min-h-[600px] overflow-hidden">
      {/* Cozy Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Floating Background Images */}
      <div className="absolute top-20 left-10 w-32 h-32 opacity-10 rotate-12 rounded-lg overflow-hidden">
        <img src="/images/64ae2dcb-97a5-46db-8dc5-e08a059ac1df.png" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute top-40 right-20 w-24 h-24 opacity-10 -rotate-12 rounded-lg overflow-hidden">
        <img src="/images/6e155d7c-8b71-4db9-82e9-1dff7d63357b.png" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute bottom-32 left-20 w-28 h-28 opacity-10 rotate-6 rounded-lg overflow-hidden">
        <img src="/images/7ae4ede6-a80a-4759-a13f-c92cc5d798bd.png" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute bottom-20 right-10 w-36 h-36 opacity-10 -rotate-6 rounded-lg overflow-hidden">
        <img src="/images/88cb2391-e55a-42fc-b5c4-01c29096737a.png" alt="" className="w-full h-full object-cover" />
      </div>
      
      {/* Subtle Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.15) 1px, transparent 0)',
        backgroundSize: '32px 32px'
      }} />
      
      {/* Warm Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px]" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Discover Amazing
            <br />
            <span className="text-blue-400">
              Digital Products
            </span>
          </h1>
          
          {/* Subheading */}
          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            A marketplace for creators and buyers to find tools, templates, and resources.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link 
              to="/shop" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-2 transition-all duration-200"
            >
              <Search className="w-5 h-5" />
              <span>Explore Products</span>
            </Link>
            
            <Link
              to="/auth?mode=register"
              className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-200"
            >
              Start Selling
            </Link>
          </div>
          
          {/* Real Stats */}
          {stats.totalProducts > 0 && (
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stats.totalProducts}
                </div>
                <div className="text-slate-400 text-sm">Products</div>
              </div>
              
              <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stats.totalCreators}
                </div>
                <div className="text-slate-400 text-sm">Creators</div>
              </div>
              
              <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stats.totalDownloads}
                </div>
                <div className="text-slate-400 text-sm">Downloads</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent" />
    </div>
  );
};
