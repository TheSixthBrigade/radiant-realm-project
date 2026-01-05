import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, DollarSign, Users, TrendingUp, Star } from "lucide-react";
import Navigation from "@/components/Navigation";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Link } from "react-router-dom";
import { useStats } from "@/hooks/useStats";
import { SEO, BreadcrumbSchema } from "@/components/SEO";

const Creators = () => {
  const { stats, loading: statsLoading, error: statsError, formatNumber } = useStats();
  const features = [
    {
      icon: Upload,
      title: "Easy Upload Process",
      description: "Upload your assets with our streamlined process. Support for scripts, models, textures, and more.",
    },
    {
      icon: DollarSign,
      title: "Competitive Revenue Share",
      description: "Keep 80% of your earnings. We handle payments, downloads, and customer support.",
    },
    {
      icon: Users,
      title: "Growing Community",
      description: "Connect with thousands of developers looking for quality assets and tools.",
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Track your sales, downloads, and earnings with detailed analytics and insights.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Create Account",
      description: "Sign up and complete your creator profile with portfolio examples.",
    },
    {
      number: "02",
      title: "Upload Assets",
      description: "Add your products with detailed descriptions, screenshots, and documentation.",
    },
    {
      number: "03",
      title: "Set Pricing",
      description: "Choose your pricing strategy and let our algorithm recommend optimal prices.",
    },
    {
      number: "04",
      title: "Start Earning",
      description: "Your products go live and you start earning from day one.",
    },
  ];

  const testimonials = [
    {
      name: "Alex Rodriguez",
      role: "3D Artist",
      content: "Vectabse has transformed my freelance career. I've made over $5,000 in my first month!",
      rating: 5,
      earnings: "$12,450",
    },
    {
      name: "Sarah Chen",
      role: "Script Developer",
      content: "The platform is incredibly user-friendly and the community is amazing. Highly recommend!",
      rating: 5,
      earnings: "$8,920",
    },
    {
      name: "Mike Johnson",
      role: "Game Designer",
      content: "Best decision I made was joining Vectabse. The revenue share is fair and payments are always on time.",
      rating: 5,
      earnings: "$15,680",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <SEO 
        title="Become a Creator"
        description="Turn your creative skills into passive income. Join thousands of creators earning money by selling game assets, scripts, and tools on Vectabase. Keep 80% of your earnings."
        url="/creators"
        keywords="sell digital assets, become a creator, game asset marketplace, passive income, sell scripts, sell 3D models"
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: '/' },
        { name: 'Creators', url: '/creators' }
      ]} />
      <AnimatedBackground />
      <div className="relative z-10">
        <Navigation />
        
        <div className="container mx-auto px-6 pt-24 pb-12">
          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              Turn Your <span className="gradient-text">Creative Skills</span> Into Passive Income
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of creators earning money by selling game assets, scripts, and tools on Vectabse
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="btn-gaming text-lg px-8 py-4">
                  Start Selling Today
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-4 border-primary/30 hover:border-primary bg-card/30 backdrop-blur-sm"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <Card className="glass p-6 text-center hover-lift">
              <div className="text-3xl font-bold gradient-text mb-2">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted h-8 w-20 mx-auto rounded"></div>
                ) : statsError ? (
                  "N/A"
                ) : stats.hasRealData ? (
                  `$${formatNumber(stats.totalRevenue)}`
                ) : (
                  "$0"
                )}
              </div>
              <div className="text-muted-foreground">Paid to Creators</div>
            </Card>
            <Card className="glass p-6 text-center hover-lift">
              <div className="text-3xl font-bold gradient-text mb-2">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted h-8 w-20 mx-auto rounded"></div>
                ) : statsError ? (
                  "N/A"
                ) : stats.hasRealData ? (
                  formatNumber(stats.totalCreators)
                ) : (
                  "0"
                )}
              </div>
              <div className="text-muted-foreground">Active Creators</div>
            </Card>
            <Card className="glass p-6 text-center hover-lift">
              <div className="text-3xl font-bold gradient-text mb-2">
                {statsLoading ? (
                  <div className="animate-pulse bg-muted h-8 w-20 mx-auto rounded"></div>
                ) : statsError ? (
                  "N/A"
                ) : stats.hasRealData ? (
                  formatNumber(stats.totalSales)
                ) : (
                  "0"
                )}
              </div>
              <div className="text-muted-foreground">Products Sold</div>
            </Card>
          </div>

          {/* Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Vectabse?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="glass p-6 hover-lift">
                    <div className="p-3 rounded-lg bg-gradient-primary glow-primary mb-4 w-fit">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* How it Works */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <Card key={step.number} className="glass p-6 hover-lift">
                  <div className="text-4xl font-bold gradient-text mb-4">{step.number}</div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Creator Success Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={testimonial.name} className="glass p-6 hover-lift">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                    <Badge variant="outline" className="text-success border-success">
                      {testimonial.earnings}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Card className="glass p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Creator Journey?</h2>
            <p className="text-muted-foreground mb-6">
              Join our community and start earning from your creative work today
            </p>
            <Link to="/auth">
              <Button size="lg" className="btn-gaming">
                Get Started Now
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Creators;