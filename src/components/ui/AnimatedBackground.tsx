import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  variant?: 'gradient' | 'dots' | 'grid' | 'waves';
  className?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
  variant = 'gradient',
  className 
}) => {
  if (variant === 'gradient') {
    return (
      <div className={cn('absolute inset-0 overflow-hidden', className)}>
        {/* Animated gradient orbs */}
        <div 
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-30 animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(102, 126, 234, 0.6) 0%, transparent 70%)',
            animationDelay: '0s',
          }}
        />
        <div 
          className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-30 animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(118, 75, 162, 0.6) 0%, transparent 70%)',
            animationDelay: '1s',
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-3xl opacity-20 animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(240, 147, 251, 0.6) 0%, transparent 70%)',
            animationDelay: '2s',
          }}
        />
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div 
        className={cn('absolute inset-0', className)}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(33, 150, 243, 0.15) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />
    );
  }

  if (variant === 'grid') {
    return (
      <div className={cn('absolute inset-0', className)}>
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(33, 150, 243, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(33, 150, 243, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>
    );
  }

  if (variant === 'waves') {
    return (
      <div className={cn('absolute inset-0 overflow-hidden', className)}>
        <svg
          className="absolute bottom-0 left-0 w-full h-64 opacity-10"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            fillOpacity="1"
            d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,138.7C960,139,1056,117,1152,101.3C1248,85,1344,75,1392,69.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          >
            <animate
              attributeName="d"
              dur="10s"
              repeatCount="indefinite"
              values="
                M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,138.7C960,139,1056,117,1152,101.3C1248,85,1344,75,1392,69.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                M0,160L48,149.3C96,139,192,117,288,128C384,139,480,181,576,186.7C672,192,768,160,864,138.7C960,117,1056,107,1152,112C1248,117,1344,139,1392,149.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,138.7C960,139,1056,117,1152,101.3C1248,85,1344,75,1392,69.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z
              "
            />
          </path>
        </svg>
      </div>
    );
  }

  return null;
};
