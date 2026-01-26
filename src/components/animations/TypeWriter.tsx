import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface TypeWriterProps {
  text: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
  onComplete?: () => void;
  className?: string;
}

export function TypeWriter({
  text,
  speed = 50,
  delay = 0,
  cursor = true,
  onComplete,
  className = '',
}: TypeWriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const { ref, isVisible } = useScrollReveal({ triggerOnce: true, threshold: 0.5 });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isVisible) return;

    // If reduced motion, show text immediately
    if (prefersReducedMotion) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    let currentIndex = 0;
    const delayTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
          onComplete?.();
        }
      }, 1000 / speed);

      return () => clearInterval(interval);
    }, delay * 1000);

    return () => clearTimeout(delayTimeout);
  }, [text, speed, delay, isVisible, prefersReducedMotion, onComplete]);

  return (
    <span ref={ref as any} className={className}>
      {displayedText}
      {cursor && !isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
          className="inline-block ml-1"
        >
          |
        </motion.span>
      )}
    </span>
  );
}
