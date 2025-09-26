const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Large floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-drift" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/8 rounded-full blur-3xl animate-drift" style={{ animationDelay: "10s" }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent/6 rounded-full blur-3xl animate-float" style={{ animationDelay: "5s" }} />
      <div className="absolute top-1/6 right-1/6 w-48 h-48 bg-primary-glow/10 rounded-full blur-2xl animate-drift" style={{ animationDelay: "20s" }} />
      
      {/* Medium floating elements */}
      <div className="absolute top-3/4 left-1/6 w-32 h-32 bg-secondary/12 rounded-full blur-xl animate-float" style={{ animationDelay: "15s" }} />
      <div className="absolute bottom-1/6 left-3/4 w-40 h-40 bg-primary/8 rounded-full blur-2xl animate-drift" style={{ animationDelay: "25s" }} />
      
      {/* Smooth flowing particles */}
      <div className="absolute top-1/5 left-1/5 w-4 h-4 bg-primary/60 rounded-full animate-smooth-float" />
      <div className="absolute top-2/5 right-1/4 w-3 h-3 bg-secondary/60 rounded-full animate-smooth-float" style={{ animationDelay: "8s" }} />
      <div className="absolute bottom-1/3 left-1/3 w-5 h-5 bg-accent/60 rounded-full animate-smooth-float" style={{ animationDelay: "12s" }} />
      <div className="absolute top-3/5 right-1/6 w-2 h-2 bg-primary-glow/80 rounded-full animate-smooth-float" style={{ animationDelay: "18s" }} />
      <div className="absolute bottom-1/5 right-2/5 w-4 h-4 bg-secondary/50 rounded-full animate-smooth-float" style={{ animationDelay: "22s" }} />
      
      {/* Flowing light streaks */}
      <div className="absolute top-0 left-1/4 w-1 h-32 bg-gradient-to-b from-primary/40 to-transparent animate-light-streak" />
      <div className="absolute top-1/3 right-1/3 w-1 h-24 bg-gradient-to-b from-secondary/30 to-transparent animate-light-streak" style={{ animationDelay: "6s" }} />
      <div className="absolute bottom-0 left-2/3 w-1 h-28 bg-gradient-to-t from-accent/35 to-transparent animate-light-streak" style={{ animationDelay: "14s" }} />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary)) 0.5px, transparent 0.5px),
            linear-gradient(to bottom, hsl(var(--primary)) 0.5px, transparent 0.5px)
          `,
          backgroundSize: "60px 60px"
        }}
      />
      
      {/* Multi-layer gradient overlays */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/3 via-transparent to-secondary/3" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-accent/2 to-transparent" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-primary/2 via-transparent to-secondary/2" />
    </div>
  );
};

export default AnimatedBackground;