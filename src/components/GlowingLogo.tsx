import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

interface GlowingLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function GlowingLogo({ size = 'md', showText = true }: GlowingLogoProps) {
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;
      const delta = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      
      // 360 degrees per 8 seconds = 45 degrees per second
      setRotation(prev => (prev + (delta * 0.045)) % 360);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const sizes = {
    sm: { 
      logo: 'w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9', 
      container: 'w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11', 
      text: 'text-base md:text-lg lg:text-xl' 
    },
    md: { 
      logo: 'w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10', 
      container: 'w-10 h-10 md:w-11 md:h-11 lg:w-12 lg:h-12', 
      text: 'text-lg md:text-xl lg:text-2xl' 
    },
    lg: { 
      logo: 'w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14', 
      container: 'w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16', 
      text: 'text-xl md:text-2xl lg:text-3xl' 
    }
  };

  const s = sizes[size];

  return (
    <Link to="/" className="flex items-center gap-2 md:gap-3 group">
      <div className="relative">
        {/* ONLY the glow rotates - outer blur effect */}
        <div 
          className="absolute inset-[-8px] md:inset-[-10px] rounded-2xl overflow-hidden opacity-50 blur-[10px] md:blur-[14px] pointer-events-none"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div 
            className="absolute inset-0"
            style={{
              width: '300%',
              height: '300%',
              top: '-100%',
              left: '-100%',
              backgroundImage: `conic-gradient(
                transparent,
                #22c55e 5%,
                transparent 25%,
                transparent 50%,
                #10b981 55%,
                transparent 75%
              )`
            }}
          />
        </div>
        
        {/* Static border - does NOT rotate */}
        <div className="absolute inset-[-2px] rounded-xl bg-gradient-to-br from-green-500/30 via-transparent to-emerald-500/30 pointer-events-none" />
        
        {/* Logo container - static */}
        <div className={`${s.container} relative z-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1 md:p-2`}>
          <img 
            src="/Logo_pic.png" 
            alt="Vectabase" 
            className={`${s.logo} object-contain transition-transform duration-500 group-hover:scale-110`}
          />
        </div>
      </div>

      {showText && (
        <span className={`${s.text} font-bold text-white group-hover:text-green-400 transition-colors duration-300`}>
          Vectabase
        </span>
      )}
    </Link>
  );
}
