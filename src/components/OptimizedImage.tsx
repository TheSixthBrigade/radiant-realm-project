import { useState, useRef, useEffect, memo } from 'react';
import { getOptimizedImageUrl, generateBlurPlaceholder } from '@/utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean; // Load immediately without lazy loading
  quality?: number;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component with:
 * - Lazy loading via IntersectionObserver
 * - Blur placeholder
 * - Automatic WebP conversion (when supported)
 * - Error handling with fallback
 */
export const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 80,
  placeholder = 'blur',
  onLoad,
  onError,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px', threshold: 0.1 }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const optimizedSrc = getOptimizedImageUrl(src, { width, height, quality });
  const placeholderSrc = placeholder === 'blur' ? generateBlurPlaceholder() : undefined;

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div 
        className={`bg-gray-800 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-500 text-sm">Failed to load</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-800 animate-pulse"
          style={{ 
            backgroundImage: placeholderSrc ? `url(${placeholderSrc})` : undefined,
            backgroundSize: 'cover',
          }}
        />
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={isInView ? optimizedSrc : placeholderSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`
          w-full h-full object-cover transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
