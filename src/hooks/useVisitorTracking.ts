/**
 * Hook to track visitor sessions
 * Call this once at app root level
 */

import { useEffect } from 'react';
import { trackVisitor } from '@/lib/visitorTracking';

export function useVisitorTracking() {
  useEffect(() => {
    // Track visitor on initial load
    trackVisitor();
  }, []);
}

export default useVisitorTracking;
