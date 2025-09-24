const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-drift" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-drift" style={{ animationDelay: "10s" }} />
      <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-primary/15 rounded-full blur-2xl animate-float" style={{ animationDelay: "5s" }} />
      
      {/* Orbiting elements */}
      <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-primary rounded-full animate-orbit" />
      <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-secondary rounded-full animate-orbit" style={{ animationDelay: "15s", animationDirection: "reverse" }} />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px"
        }}
      />
      
      {/* Gradient overlays */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
    </div>
  );
};

export default AnimatedBackground;