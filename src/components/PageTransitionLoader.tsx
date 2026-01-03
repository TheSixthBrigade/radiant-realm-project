import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const TRANSITION_MESSAGES = [
  'LOADING',
  'SYNCING',
  'READY'
];

export default function PageTransitionLoader() {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Show overlay immediately
    setIsVisible(true);
    setProgress(0);
    setMessageIndex(0);

    // Fast progress animation - 600ms total
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 60);

    // Quick message cycling
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % TRANSITION_MESSAGES.length);
    }, 200);

    // Hide overlay after animation - 600ms (page swaps in background)
    const timeout = setTimeout(() => {
      setIsVisible(false);
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    }, 600);

    return () => {
      clearTimeout(timeout);
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [location.pathname]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'rgba(10, 15, 26, 0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ background: 'rgba(33, 150, 243, 0.2)' }}
        />
      </div>

      {/* Tactical grid */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(33, 150, 243, 0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Corner brackets - animated */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 animate-corner-tl" style={{ borderColor: 'rgba(33, 150, 243, 0.6)' }} />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 animate-corner-tr" style={{ borderColor: 'rgba(33, 150, 243, 0.6)' }} />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 animate-corner-bl" style={{ borderColor: 'rgba(33, 150, 243, 0.6)' }} />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 animate-corner-br" style={{ borderColor: 'rgba(33, 150, 243, 0.6)' }} />

      {/* Central gear system with proper gear teeth */}
      <div className="relative">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 w-40 h-40 -translate-x-10 -translate-y-10">
          <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              fill="none" 
              stroke="rgba(33, 150, 243, 0.3)" 
              strokeWidth="1"
              strokeDasharray="10 5"
            />
          </svg>
        </div>

        {/* Middle ring - counter rotation */}
        <div className="absolute inset-0 w-32 h-32 -translate-x-6 -translate-y-6">
          <svg className="w-full h-full animate-spin-reverse" viewBox="0 0 100 100">
            <circle 
              cx="50" 
              cy="50" 
              r="45" 
              fill="none" 
              stroke="rgba(33, 150, 243, 0.4)" 
              strokeWidth="2"
              strokeDasharray="5 10"
            />
          </svg>
        </div>

        {/* Main gear container */}
        <div className="relative w-20 h-20">
          {/* Background glow */}
          <div 
            className="absolute inset-0 rounded-full blur-xl"
            style={{ background: 'rgba(33, 150, 243, 0.5)' }}
          />
          
          {/* Main large gear with teeth */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-20 h-20 animate-spin-gear" viewBox="0 0 100 100" fill="none">
              {/* Gear teeth */}
              <path 
                d="M50,10 L52,15 L48,15 Z M90,50 L85,52 L85,48 Z M50,90 L48,85 L52,85 Z M10,50 L15,48 L15,52 Z
                   M73,27 L71,31 L68,28 Z M73,73 L68,72 L71,69 Z M27,73 L28,68 L31,71 Z M27,27 L31,28 L28,31 Z"
                fill="hsl(210, 100%, 50%)"
                style={{ filter: 'drop-shadow(0 0 8px rgba(33, 150, 243, 0.8))' }}
              />
              {/* Gear body */}
              <circle 
                cx="50" 
                cy="50" 
                r="30" 
                fill="hsl(210, 100%, 50%)"
                style={{ filter: 'drop-shadow(0 0 10px rgba(33, 150, 243, 0.8))' }}
              />
              {/* Inner circle */}
              <circle 
                cx="50" 
                cy="50" 
                r="15" 
                fill="hsl(230, 25%, 8%)"
                stroke="hsl(180, 100%, 50%)"
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.6))' }}
              />
              {/* Center hole */}
              <circle 
                cx="50" 
                cy="50" 
                r="6" 
                fill="hsl(230, 25%, 8%)"
              />
            </svg>
          </div>

          {/* Secondary gear - small top right with teeth */}
          <div className="absolute -top-3 -right-3">
            <svg className="w-10 h-10 animate-spin-gear-reverse" viewBox="0 0 100 100" fill="none">
              {/* Small gear teeth */}
              <path 
                d="M50,15 L52,20 L48,20 Z M85,50 L80,52 L80,48 Z M50,85 L48,80 L52,80 Z M15,50 L20,48 L20,52 Z"
                fill="hsl(180, 100%, 50%)"
                style={{ filter: 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.6))' }}
              />
              {/* Gear body */}
              <circle 
                cx="50" 
                cy="50" 
                r="25" 
                fill="hsl(180, 100%, 50%)"
                style={{ filter: 'drop-shadow(0 0 8px rgba(33, 150, 243, 0.6))' }}
              />
              {/* Inner circle */}
              <circle 
                cx="50" 
                cy="50" 
                r="12" 
                fill="hsl(230, 25%, 8%)"
                stroke="hsl(210, 100%, 50%)"
                strokeWidth="2"
              />
              {/* Center hole */}
              <circle 
                cx="50" 
                cy="50" 
                r="5" 
                fill="hsl(230, 25%, 8%)"
              />
            </svg>
          </div>

          {/* Tertiary gear - small bottom left with teeth */}
          <div className="absolute -bottom-3 -left-3">
            <svg className="w-10 h-10 animate-spin-gear-fast" viewBox="0 0 100 100" fill="none">
              {/* Small gear teeth */}
              <path 
                d="M50,15 L52,20 L48,20 Z M85,50 L80,52 L80,48 Z M50,85 L48,80 L52,80 Z M15,50 L20,48 L20,52 Z"
                fill="hsl(195, 100%, 50%)"
                style={{ filter: 'drop-shadow(0 0 6px rgba(33, 150, 243, 0.6))' }}
              />
              {/* Gear body */}
              <circle 
                cx="50" 
                cy="50" 
                r="25" 
                fill="hsl(195, 100%, 50%)"
                style={{ filter: 'drop-shadow(0 0 8px rgba(33, 150, 243, 0.6))' }}
              />
              {/* Inner circle */}
              <circle 
                cx="50" 
                cy="50" 
                r="12" 
                fill="hsl(230, 25%, 8%)"
                stroke="hsl(210, 100%, 50%)"
                strokeWidth="2"
              />
              {/* Center hole */}
              <circle 
                cx="50" 
                cy="50" 
                r="5" 
                fill="hsl(230, 25%, 8%)"
              />
            </svg>
          </div>
        </div>

        {/* Orbiting particles */}
        <div className="absolute inset-0 w-32 h-32 -translate-x-6 -translate-y-6 animate-spin-slow">
          <div 
            className="absolute top-0 left-1/2 w-2 h-2 rounded-full -translate-x-1/2"
            style={{ 
              background: 'hsl(210, 100%, 50%)',
              boxShadow: '0 0 10px rgba(33, 150, 243, 0.8)'
            }}
          />
        </div>
        <div className="absolute inset-0 w-32 h-32 -translate-x-6 -translate-y-6 animate-spin-reverse">
          <div 
            className="absolute bottom-0 left-1/2 w-2 h-2 rounded-full -translate-x-1/2"
            style={{ 
              background: 'hsl(180, 100%, 50%)',
              boxShadow: '0 0 10px rgba(33, 150, 243, 0.8)'
            }}
          />
        </div>
      </div>

      {/* Loading text and progress */}
      <div className="flex flex-col items-center gap-4 mt-16 relative z-10">
        <p 
          className="font-mono text-sm tracking-[0.2em] uppercase font-bold"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: 'hsl(210, 100%, 50%)',
            textShadow: '0 0 10px rgba(33, 150, 243, 0.5), 0 0 20px rgba(33, 150, 243, 0.3)'
          }}
        >
          {TRANSITION_MESSAGES[messageIndex]}
        </p>
        
        {/* Sleek progress bar */}
        <div 
          className="w-64 h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(33, 150, 243, 0.1)' }}
        >
          <div 
            className="h-full transition-all duration-100 ease-out"
            style={{ 
              width: `${progress}%`,
              background: 'linear-gradient(90deg, hsl(210, 100%, 50%), hsl(180, 100%, 50%))',
              boxShadow: '0 0 10px rgba(33, 150, 243, 0.6)'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin-gear {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-gear-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes spin-gear-fast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-gear {
          animation: spin-gear 3s linear infinite;
        }
        .animate-spin-gear-reverse {
          animation: spin-gear-reverse 2s linear infinite;
        }
        .animate-spin-gear-fast {
          animation: spin-gear-fast 1.5s linear infinite;
        }
        .animate-spin-slow {
          animation: spin-gear 4s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-gear-reverse 3s linear infinite;
        }
        
        @keyframes corner-tl {
          0%, 100% { transform: translate(0, 0); opacity: 0.6; }
          50% { transform: translate(-4px, -4px); opacity: 1; }
        }
        @keyframes corner-tr {
          0%, 100% { transform: translate(0, 0); opacity: 0.6; }
          50% { transform: translate(4px, -4px); opacity: 1; }
        }
        @keyframes corner-bl {
          0%, 100% { transform: translate(0, 0); opacity: 0.6; }
          50% { transform: translate(-4px, 4px); opacity: 1; }
        }
        @keyframes corner-br {
          0%, 100% { transform: translate(0, 0); opacity: 0.6; }
          50% { transform: translate(4px, 4px); opacity: 1; }
        }
        .animate-corner-tl {
          animation: corner-tl 1.5s ease-in-out infinite;
        }
        .animate-corner-tr {
          animation: corner-tr 1.5s ease-in-out infinite;
        }
        .animate-corner-bl {
          animation: corner-bl 1.5s ease-in-out infinite;
        }
        .animate-corner-br {
          animation: corner-br 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
