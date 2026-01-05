import { useEffect, useState } from 'react';

export default function KineticLoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Fast progress - complete in ~1.5 seconds
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 4;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(onComplete, 400);
      }, 200);
    }
  }, [progress, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-400 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: '#030712' }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: 'rgba(34, 197, 94, 0.08)' }} />
      </div>

      <div className="text-center relative z-10">
        {/* Logo with glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 blur-2xl opacity-50" style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)' }} />
          <img 
            src="/Logo_pic.png" 
            alt="Vectabase" 
            className={`w-16 h-16 mx-auto relative z-10 transition-transform duration-700 ${isExiting ? 'scale-110' : 'scale-100'}`}
            style={{ filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.4))' }}
          />
        </div>

        {/* Brand name */}
        <h1 className="text-2xl font-bold text-white mb-6 tracking-wide">
          Vectabase
        </h1>

        {/* Progress bar */}
        <div className="w-48 mx-auto">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
            <div 
              className="h-full rounded-full transition-all duration-100 ease-out"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #22c55e, #10b981)',
                boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
