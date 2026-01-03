import React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';

interface GradientButtonProps extends ButtonProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'home';
  glow?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({ 
  children, 
  className,
  variant = 'primary',
  glow = false,
  ...props 
}) => {
  const gradients = {
    primary: 'from-[#2196F3] to-[#00BCD4]',
    success: 'from-[#10B981] to-[#059669]',
    warning: 'from-[#F59E0B] to-[#D97706]',
    error: 'from-[#EF4444] to-[#DC2626]',
    home: 'from-[#667eea] to-[#764ba2]',
  };

  const glowColors = {
    primary: 'hover:shadow-[0_0_20px_rgba(33,150,243,0.4),0_0_40px_rgba(33,150,243,0.2)]',
    success: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.4),0_0_40px_rgba(16,185,129,0.2)]',
    warning: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.4),0_0_40px_rgba(245,158,11,0.2)]',
    error: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.4),0_0_40px_rgba(239,68,68,0.2)]',
    home: 'hover:shadow-[0_0_20px_rgba(102,126,234,0.4),0_0_40px_rgba(102,126,234,0.2)]',
  };

  return (
    <Button
      className={cn(
        'bg-gradient-to-r text-white font-semibold',
        'transition-all duration-300',
        'hover:scale-105 hover:shadow-lg',
        gradients[variant],
        glow && glowColors[variant],
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};
