import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Star, Users, Download, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useStats } from "@/hooks/useStats";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

const Hero = () => {
  const { stats, loading, error, formatNumber } = useStats();
  const { settings } = useWebsiteSettings();

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Clean gradient background like ClearlyDev */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800"></div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      
      <div className="relative container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8">
              <Star className="w-4 h-4" />
              Trusted by 10,000+ creators worldwide
            </div>

            {/* Main heading - clean and modern */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-slate-900 dark:text-white">The modern</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                digital marketplace
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed mb-12">
              {settings.hero_subtitle || "Sell digital products with zero fees. Built for creators, by creators. Start earning in minutes."}
            </p>

            {/* CTA Buttons - ClearlyDev style */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button asChild size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Link to="/auth">
                  Start selling for free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg border-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                <Link to="/shop">
                  <Play className="w-5 h-5 mr-2" />
                  Browse marketplace
                </Link>
              </Button>
            </div>

            {/* Clean stats display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              {[
                { 
                  label: "Revenue paid", 
                  value: loading ? "..." : (stats.hasRealData ? `$${formatNumber(stats.totalRevenue)}` : "$2.4M+"),
                  icon: TrendingUp
                },
                { 
                  label: "Active creators", 
                  value: loading ? "..." : (stats.hasRealData ? formatNumber(stats.totalCreators) : "12K+"),
                  icon: Users
                },
                { 
                  label: "Products sold", 
                  value: loading ? "..." : (stats.hasRealData ? formatNumber(stats.totalSales) : "89K+"),
                  icon: Download
                },
                { 
                  label: "Avg. rating", 
                  value: "4.9",
                  icon: Star
                }
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Icon className="w-5 h-5 text-blue-600 mr-2" />
                      <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                        {stat.value}
                      </div>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;