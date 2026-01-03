import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className, 
  hover = false,
  onClick 
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card rounded-xl p-6',
        hover && 'transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer',
        className
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      {children}
    </div>
  );
};
