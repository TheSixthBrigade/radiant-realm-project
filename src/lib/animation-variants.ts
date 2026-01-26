// Reusable Framer Motion animation variants
import { Variants } from 'framer-motion';

export const animationVariants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  } as Variants,
  
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  } as Variants,
  
  slideDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  } as Variants,
  
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  } as Variants,
  
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  } as Variants,
  
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  } as Variants,
  
  stagger: {
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  } as Variants,
  
  staggerFast: {
    visible: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  } as Variants,
} as const;

// Default transition configurations
export const transitions = {
  spring: {
    type: 'spring',
    stiffness: 100,
    damping: 15,
  },
  smooth: {
    type: 'tween',
    duration: 0.3,
    ease: 'easeOut',
  },
  fast: {
    type: 'tween',
    duration: 0.15,
    ease: 'easeOut',
  },
  slow: {
    type: 'tween',
    duration: 0.8,
    ease: 'easeInOut',
  },
} as const;
