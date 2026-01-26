import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.6,
  once = true,
  className = '',
}: FadeInProps) {
  const { ref, isVisible } = useScrollReveal({ triggerOnce: once, threshold: 0.1 });
  const prefersReducedMotion = useReducedMotion();

  const animationDuration = prefersReducedMotion ? 0.3 : duration;

  return (
    <motion.div
      ref={ref as any}
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: animationDuration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
