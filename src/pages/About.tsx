import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Zap, Users, Heart } from "lucide-react";
import Navigation from "@/components/Navigation";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Link } from "react-router-dom";
import { useStats } from "@/hooks/useStats";
import vectabseLogo from "@/assets/vectabse-logo.png";

const About = () => {
  const { stats, loading, formatNumber } = useStats();
  
  const values = [
    {
      icon: Shield,
      title: "Trust & Security",
      description: "We prioritize the security of transactions and protect both creators and buyers with our robust verification systems.",
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "Constantly evolving our platform with cutting-edge features and tools to empower the game development community.",
    },
    {
      icon: Users,
      title: "Community First",
      description: "Building a supportive ecosystem where creators can thrive and developers can find exactly what they need.",
    },
    {
      icon: Heart,
      title: "Passion for Gaming",
      description: "Driven by our love for game development and commitment to helping creators turn their passion into profit.",
    },
  ];

  const statsData = [
    { 
      label: "Happy Developers", 
      value: loading ? "..." : stats.hasRealData ? formatNumber(stats.totalSales) : "Growing" 
    },
    { 
      label: "Assets Available", 
      value: loading ? "..." : stats.hasRealData ? formatNumber(stats.totalProducts) : "0" 
    },
    { 
      label: "Active Creators", 
      value: loading ? "..." : stats.hasRealData ? formatNumber(stats.totalCreators) : "0" 
    },
    { 
      label: "Creator Earnings", 
      value: loading ? "..." : stats.hasRealData ? `$${formatNumber(stats.totalRevenue)}` : "$0" 
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <div className="relative z-10">
        <Navigation />
        
        <div className="container mx-auto px-6 pt-24 pb-12">
          {/* Hero Section */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="flex justify-center mb-6">
              <img src={vectabseLogo} alt="Vectabse" className="w-20 h-20 rounded-2xl" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              About <span className="gradient-text">Vectabse</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Empowering game developers worldwide with premium assets, tools, and a thriving creative community
            </p>
          </div>

          {/* Mission Section */}
          <Card className="glass p-8 mb-16">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Vectabse was founded with a simple yet powerful mission: to democratize game development by providing 
                creators with a platform to monetize their skills while giving developers access to high-quality assets 
                and tools. We believe that great games are built by passionate communities, and we're here to fuel that passion.
              </p>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {statsData.map((stat, index) => (
              <Card key={stat.label} className="glass p-6 text-center hover-lift">
                <div className="text-3xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>

          {/* Values */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <Card key={value.title} className="glass p-6 hover-lift">
                    <div className="p-3 rounded-lg bg-gradient-primary glow-primary mb-4 w-fit">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Story Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <Card className="glass p-8">
              <h3 className="text-2xl font-bold mb-4">The Beginning</h3>
              <p className="text-muted-foreground leading-relaxed">
                Started in 2024 by a team of passionate game developers and entrepreneurs, Vectabse was born out of 
                frustration with existing marketplaces that didn't truly serve the gaming community. We saw talented 
                creators struggling to monetize their work and developers spending countless hours searching for 
                quality assets.
              </p>
            </Card>
            <Card className="glass p-8">
              <h3 className="text-2xl font-bold mb-4">Today & Tomorrow</h3>
              <p className="text-muted-foreground leading-relaxed">
                Today, Vectabse hosts thousands of creators and serves developers worldwide. But we're just getting 
                started. Our roadmap includes AI-powered asset recommendations, collaborative tools, and educational 
                resources to help the entire game development ecosystem thrive.
              </p>
            </Card>
          </div>

          {/* CTA */}
          <Card className="glass p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Join Our Journey</h2>
            <p className="text-muted-foreground mb-6">
              Whether you're a creator looking to share your work or a developer building the next big game, 
              we'd love to have you as part of our community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/creators">
                <Button size="lg" className="btn-gaming">
                  Become a Creator
                </Button>
              </Link>
              <Link to="/shop">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-primary/30 hover:border-primary bg-card/30 backdrop-blur-sm"
                >
                  Browse Assets
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default About;