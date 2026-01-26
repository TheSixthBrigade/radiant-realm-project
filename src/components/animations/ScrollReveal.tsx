import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { animationVariants } from '@/lib/animation-variants';

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
}

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  once = true,
  className = '',
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal({ triggerOnce: once, threshold: 0.2 });
  const prefersReducedMotion = useReducedMotion();

  // Map direction to animation variant
  const variantMap = {
    up: animationVariants.slideUp,
    down: animationVariants.slideDown,
    left: animationVariants.slideLeft,
    right: animationVariants.slideRight,
    fade: animationVariants.fadeIn,
  };

  const variant = variantMap[direction];

  // If reduced motion is preferred, just fade in
  if (prefersReducedMotion) {
    return (
      <motion.div
        ref={ref as any}
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref as any}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={variant}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
