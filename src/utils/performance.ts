// Performance monitoring and optimization utilities

/**
 * Debounce function to limit rapid function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit function calls to once per interval
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Measure component render time
 */
export const measureRenderTime = (componentName: string) => {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    const duration = end - start;
    
    if (process.env.NODE_ENV === 'development' && duration > 16) {
      console.warn(`[Performance] ${componentName} took ${duration.toFixed(2)}ms to render`);
    }
  };
};

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback = 
  window.requestIdleCallback ||
  ((cb: IdleRequestCallback) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1));

/**
 * Cancel idle callback polyfill
 */
export const cancelIdleCallback = 
  window.cancelIdleCallback || 
  ((id: number) => clearTimeout(id));

/**
 * Run task during idle time
 */
export const runWhenIdle = (task: () => void, timeout = 2000): void => {
  requestIdleCallback(task, { timeout });
};

/**
 * Batch DOM updates
 */
export const batchUpdates = (updates: (() => void)[]): void => {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
};

/**
 * Memory-efficient array chunking for large data sets
 */
export function* chunkArray<T>(array: T[], chunkSize: number): Generator<T[]> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}

/**
 * Virtual scroll helper - calculate visible items
 */
export const getVisibleItems = <T>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan = 3
): { visibleItems: T[]; startIndex: number; endIndex: number } => {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  return {
    visibleItems: items.slice(startIndex, endIndex),
    startIndex,
    endIndex,
  };
};

/**
 * Memoize expensive computations
 */
export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
};
