/**
 * Hook to track visitor sessions
 * Call this once at app root level
 * Triggers immediately on page load - no auth required
 */

import { useEffect, useRef } from 'react';
import { trackVisitor } from '@/lib/visitorTracking';

export function useVisitorTracking() {
  const hasTracked = useRef(false);
  
  useEffect(() => {
    // Only track once per app mount
    if (hasTracked.current) return;
    hasTracked.current = true;
    
    // Track visitor immediately on page load
    console.log('[useVisitorTracking] Triggering visitor tracking on page load...');
    trackVisitor();
  }, []);
}

export default useVisitorTracking;
