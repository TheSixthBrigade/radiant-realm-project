/**
 * Hook to track visitor sessions - ROBUST VERSION
 * Call this once at app root level
 * Triggers immediately on page load - no auth required
 */

import { useEffect, useRef } from 'react';
import { trackVisitor } from '@/lib/visitorTracking';

export function useVisitorTracking() {
  const hasTracked = useRef(false);
  
  useEffect(() => {
    // Only track once per app mount
    if (hasTracked.current) {
      console.log('[useVisitorTracking] Already tracked this mount, skipping');
      return;
    }
    hasTracked.current = true;
    
    console.log('[useVisitorTracking] 🎯 Hook triggered - starting visitor tracking...');
    
    // Track visitor immediately
    trackVisitor().catch(err => {
      console.error('[useVisitorTracking] Tracking failed:', err);
    });
    
    // Also track on visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useVisitorTracking] Tab became visible - updating last_seen');
        // Just update last_seen, don't re-track
        import('@/integrations/supabase/client').then(({ supabase }) => {
          const sessionId = sessionStorage.getItem('vectabase_visitor_session');
          if (sessionId) {
            (supabase as any)
              .from('visitor_sessions')
              .update({ last_seen_at: new Date().toISOString() })
              .eq('session_id', sessionId)
              .then(() => console.log('[useVisitorTracking] Updated last_seen'));
          }
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

export default useVisitorTracking;
