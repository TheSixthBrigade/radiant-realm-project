import { Link } from 'react-router-dom';

interface GlowingLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function GlowingLogo({ size = 'md', showText = true }: GlowingLogoProps) {
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
        {/* Logo container - static */}
        <div className={`${s.container} relative z-10 rounded-xl bg-black border border-white/[0.08] flex items-center justify-center p-1 md:p-2`}>
          <img 
            src={`/Logo_pic.png?v=${Date.now()}`}
            alt="Vectabase" 
            className={`${s.logo} object-contain transition-transform duration-500 group-hover:scale-110`}
          />
        </div>
      </div>

      {showText && (
        <span className={`${s.text} font-bold text-white group-hover:text-violet-400 transition-colors duration-300`}>
          Vectabase
        </span>
      )}
    </Link>
  );
}
