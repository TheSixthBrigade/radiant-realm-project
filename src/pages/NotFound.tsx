import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ghost watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[40vw] font-black leading-none"
          style={{ color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.03)', fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
          404
        </span>
      </div>

      {/* Violet glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />

      <div className="relative z-10 text-center max-w-md">
        <p className="text-violet-400 text-xs uppercase tracking-widest mb-4 font-medium">Error 404</p>
        <h1 className="text-6xl font-black mb-4 leading-none" style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
          Page not<br />
          <span style={{ color: 'transparent', WebkitTextStroke: '2px rgba(139,92,246,0.6)' }}>found.</span>
        </h1>
        <p className="text-white/40 text-sm mb-10 leading-relaxed">
          The page at <code className="text-violet-400/70 text-xs bg-violet-500/10 px-2 py-0.5 rounded">{location.pathname}</code> doesn't exist or was moved.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link to="/"
            className="magnet-btn magnet-btn-primary px-6 h-11 rounded-xl text-sm font-semibold">
            <span className="magnet-btn-content">Go Home</span>
          </Link>
          <Link to="/shop"
            className="magnet-btn magnet-btn-outline px-6 h-11 rounded-xl text-sm font-semibold">
            <span className="magnet-btn-content">Browse Shop</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
