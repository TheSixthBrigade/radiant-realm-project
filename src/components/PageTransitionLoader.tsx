import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageTransitionLoader() {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Show loader
    setIsVisible(true);
    setProgress(0);

    // Quick smooth progress - 300ms total
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 20;
      });
    }, 50);

    // Hide after 300ms
    const timeout = setTimeout(() => {
      setIsVisible(false);
      clearInterval(progressInterval);
    }, 300);

    return () => {
      clearTimeout(timeout);
      clearInterval(progressInterval);
    };
  }, [location.pathname]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[10000] pointer-events-none transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Simple top progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800/50">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-100 ease-out"
          style={{ 
            width: `${progress}%`,
            boxShadow: '0 0 10px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.3)'
          }}
        />
      </div>
      
      {/* Subtle fade overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-200"
        style={{ opacity: isVisible ? 1 : 0 }}
      />
    </div>
  );
}
