import { useSearchParams, Link } from "react-router-dom";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Navigation from "@/components/Navigation";

const PaymentFailure = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  const handleRetry = () => {
    window.history.back();
  };

  const reasons = [
    "Insufficient funds in your account",
    "Incorrect or expired card details",
    "Card blocked by your bank",
    "Network connection issues",
  ];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Red-tinted glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(239,68,68,0.08) 0%, transparent 70%)' }} />

      <Navigation />

      <div className="relative z-10 flex items-center justify-center min-h-[80vh] px-6 pt-20">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20 bg-red-500/10">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>

          <p className="text-red-400/70 text-xs uppercase tracking-widest mb-3 font-medium">Payment failed</p>
          <h1 className="text-5xl font-black mb-4 leading-tight" style={{ fontFamily: "'Arial Rounded MT Bold', sans-serif" }}>
            Something<br />went wrong.
          </h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            We couldn't process your payment. No charges were made.
          </p>

          {error && (
            <div className="border border-red-500/20 rounded-2xl p-4 mb-6 bg-red-500/5 text-left">
              <p className="text-red-400/70 text-xs uppercase tracking-wider mb-1">Error details</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="border border-white/[0.07] rounded-2xl p-5 mb-8 bg-[#0a0a0a] text-left">
            <p className="text-white/30 text-xs uppercase tracking-wider mb-3">Common reasons</p>
            <ul className="space-y-2">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-center gap-3 text-white/50 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={handleRetry}
              className="magnet-btn magnet-btn-primary px-6 h-12 rounded-xl text-sm font-semibold">
              <span className="magnet-btn-content flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </span>
            </button>
            <Link to="/shop"
              className="magnet-btn magnet-btn-outline px-6 h-12 rounded-xl text-sm font-semibold">
              <span className="magnet-btn-content flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Shop
              </span>
            </Link>
          </div>

          <p className="text-white/20 text-xs mt-8">
            Still having issues?{" "}
            <Link to="/contact" className="text-violet-400/60 hover:text-violet-400 transition-colors">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;
