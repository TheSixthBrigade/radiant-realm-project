/**
 * Visitor Analytics Tracking
 * Tracks anonymous visitor data for platform analytics
 * Works in both local development (HTTP) and production (HTTPS)
 * Uses IP geolocation + optional browser GPS for precise location
 */

import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'vectabase_visitor_session';
const CONSENT_KEY = 'vectabase_analytics_consent';
const LOCATION_ASKED_KEY = 'vectabase_location_asked';

// Check if we're in a secure context (HTTPS or localhost)
const isSecureContext = window.isSecureContext || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// Check if we're on local network
const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|localhost|127\.0\.0\.1)/.test(window.location.hostname);

interface VisitorData {
  sessionId: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  isp?: string;
  org?: string;
  language: string;
  languages: string[];
  userAgent: string;
  deviceType: string;
  browser: string;
  os: string;
  referrer: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

// Generate unique session ID
function generateSessionId(): string {
  return 'vs_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Get or create session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// Detect device type from user agent
function getDeviceType(ua: string): string {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Detect browser from user agent
function getBrowser(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
}

// Detect OS from user agent
function getOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

// Get UTM parameters from URL
function getUTMParams(): { source?: string; medium?: string; campaign?: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
  };
}

// Fetch detailed location data from IP using multiple APIs
async function getLocationFromIP(): Promise<Partial<VisitorData>> {
  console.log('[Visitor Tracking] Fetching IP location... (local network:', isLocalNetwork, ')');
  
  // Try ipapi.co first (HTTPS, works everywhere, 1000 free/day)
  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(8000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.ip && !data.error) {
        console.log('[Visitor Tracking] IP Location from ipapi.co:', data.city, data.country_name, 'IP:', data.ip);
        return {
          country: data.country_name,
          countryCode: data.country_code,
          region: data.region,
          city: data.city,
          postalCode: data.postal,
          timezone: data.timezone,
          latitude: data.latitude,
          longitude: data.longitude,
          isp: data.org,
          org: data.asn,
        };
      }
    }
  } catch (e) {
    console.warn('[Visitor Tracking] ipapi.co failed:', e);
  }

  // Fallback to ipwho.is (HTTPS, unlimited free)
  try {
    const response = await fetch('https://ipwho.is/', {
      signal: AbortSignal.timeout(8000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success !== false) {
        console.log('[Visitor Tracking] IP Location from ipwho.is:', data.city, data.country, 'IP:', data.ip);
        return {
          country: data.country,
          countryCode: data.country_code,
          region: data.region,
          city: data.city,
          postalCode: data.postal,
          timezone: data.timezone?.id,
          latitude: data.latitude,
          longitude: data.longitude,
          isp: data.connection?.isp,
          org: data.connection?.org,
        };
      }
    }
  } catch (e) {
    console.warn('[Visitor Tracking] ipwho.is failed:', e);
  }

  // Try ipinfo.io (HTTPS, 50k free/month)
  try {
    const response = await fetch('https://ipinfo.io/json', {
      signal: AbortSignal.timeout(8000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.ip) {
        const [lat, lon] = (data.loc || '0,0').split(',').map(Number);
        console.log('[Visitor Tracking] IP Location from ipinfo.io:', data.city, data.country, 'IP:', data.ip);
        return {
          country: data.country,
          countryCode: data.country,
          region: data.region,
          city: data.city,
          postalCode: data.postal,
          timezone: data.timezone,
          latitude: lat || undefined,
          longitude: lon || undefined,
          isp: data.org,
        };
      }
    }
  } catch (e) {
    console.warn('[Visitor Tracking] ipinfo.io failed:', e);
  }

  console.warn('[Visitor Tracking] All IP geolocation APIs failed');
  return {};
}

// Get precise GPS location from browser
// Always tries to get location, updates if better accuracy found
async function getPreciseLocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  // Check stored accuracy - only skip if we already have good accuracy (<100m)
  const storedAccuracy = sessionStorage.getItem('vectabase_gps_accuracy');
  if (storedAccuracy && parseFloat(storedAccuracy) < 100) {
    console.log('[Visitor Tracking] Already have good GPS accuracy:', storedAccuracy, 'm');
    return null;
  }
  
  if (!navigator.geolocation) {
    console.log('[Visitor Tracking] Geolocation API not available');
    return null;
  }
  
  console.log('[Visitor Tracking] Requesting location (will use best available method)...');
  
  const getPosition = (highAccuracy: boolean, timeout: number): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          console.log('[Visitor Tracking] Location error:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeout,
          maximumAge: 0,
        }
      );
    });
  };
  
  // Try high accuracy first
  console.log('[Visitor Tracking] Trying high accuracy location...');
  let position = await getPosition(true, 20000);
  
  // If poor accuracy or failed, try again
  if (!position || position.coords.accuracy > 500) {
    console.log('[Visitor Tracking] Retrying for better accuracy...');
    const position2 = await getPosition(true, 10000);
    if (position2 && (!position || position2.coords.accuracy < position.coords.accuracy)) {
      position = position2;
    }
  }
  
  if (position) {
    // Store accuracy so we know if we need to retry next time
    sessionStorage.setItem('vectabase_gps_accuracy', position.coords.accuracy.toString());
    console.log('[Visitor Tracking] Location obtained - Accuracy:', position.coords.accuracy, 'm');
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  }
  
  console.log('[Visitor Tracking] Could not get location');
  return null;
}

// Check if user has consented to analytics
export function hasAnalyticsConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true';
}

// Set analytics consent
export function setAnalyticsConsent(consent: boolean): void {
  localStorage.setItem(CONSENT_KEY, consent ? 'true' : 'false');
}

// Track visitor session
export async function trackVisitor(): Promise<void> {
  console.log('[Visitor Tracking] Starting tracking...');
  console.log('[Visitor Tracking] Host:', window.location.hostname, 'Protocol:', window.location.protocol);
  
  try {
    const sessionId = getSessionId();
    const ua = navigator.userAgent;
    const utm = getUTMParams();
    
    console.log('[Visitor Tracking] Session ID:', sessionId);
    console.log('[Visitor Tracking] Device:', getDeviceType(ua), 'Browser:', getBrowser(ua), 'OS:', getOS(ua));
    
    // Request GPS and IP location IN PARALLEL for faster results
    const [gpsLocation, ipLocation] = await Promise.all([
      getPreciseLocation(),
      getLocationFromIP(),
    ]);
    
    console.log('[Visitor Tracking] IP Location result:', ipLocation);
    console.log('[Visitor Tracking] GPS/Device Location result:', gpsLocation);
    
    // ONLY use GPS coordinates if accuracy is GOOD (under 500m)
    // Otherwise the device location can be wildly wrong (like showing Lincoln instead of Chester)
    // IP geolocation is more reliable for city-level accuracy
    let latitude = ipLocation.latitude ?? null;
    let longitude = ipLocation.longitude ?? null;
    let accuracy: number | null = null;
    
    if (gpsLocation && gpsLocation.accuracy < 500) {
      // Good GPS accuracy - use it
      console.log('[Visitor Tracking] Using GPS location (accuracy:', gpsLocation.accuracy, 'm)');
      latitude = gpsLocation.latitude;
      longitude = gpsLocation.longitude;
      accuracy = gpsLocation.accuracy;
    } else if (gpsLocation) {
      // Poor GPS accuracy - ignore it, use IP location
      console.log('[Visitor Tracking] Ignoring poor GPS accuracy:', gpsLocation.accuracy, 'm - using IP location instead');
    }
    
    const visitorData = {
      session_id: sessionId,
      country: ipLocation.country || null,
      country_code: ipLocation.countryCode || null,
      region: ipLocation.region || null,
      city: ipLocation.city || null,
      postal_code: ipLocation.postalCode || null,
      timezone: ipLocation.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      latitude,
      longitude,
      accuracy,
      isp: ipLocation.isp || null,
      org: ipLocation.org || null,
      language: navigator.language,
      languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
      user_agent: ua,
      device_type: getDeviceType(ua),
      browser: getBrowser(ua),
      os: getOS(ua),
      referrer: document.referrer || null,
      utm_source: utm.source || null,
      utm_medium: utm.medium || null,
      utm_campaign: utm.campaign || null,
      first_page: window.location.pathname,
      last_page: window.location.pathname,
      last_seen_at: new Date().toISOString(),
    };
    
    console.log('[Visitor Tracking] Saving to database:', {
      city: visitorData.city,
      country: visitorData.country,
      latitude: visitorData.latitude,
      longitude: visitorData.longitude,
      accuracy: visitorData.accuracy,
      device_type: visitorData.device_type,
    });
    
    // Upsert session (create or update)
    const { error } = await (supabase as any)
      .from('visitor_sessions')
      .upsert(visitorData, { 
        onConflict: 'session_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('[Visitor Tracking] Database error:', error.message);
    } else {
      console.log('[Visitor Tracking] ✅ Successfully saved visitor data!');
    }
    
    // If we got poor accuracy or no GPS, try to get better location in background
    if (!gpsLocation || gpsLocation.accuracy > 500) {
      console.log('[Visitor Tracking] Will retry for better GPS in background...');
      setTimeout(async () => {
        const betterLocation = await getPreciseLocation();
        // Only update if we got GOOD accuracy (under 500m)
        if (betterLocation && betterLocation.accuracy < 500) {
          console.log('[Visitor Tracking] Got good GPS accuracy:', betterLocation.accuracy, 'm - updating!');
          await (supabase as any)
            .from('visitor_sessions')
            .update({
              latitude: betterLocation.latitude,
              longitude: betterLocation.longitude,
              accuracy: betterLocation.accuracy,
            })
            .eq('session_id', sessionId);
        } else if (betterLocation) {
          console.log('[Visitor Tracking] Still poor accuracy:', betterLocation.accuracy, 'm - keeping IP location');
        }
      }, 5000);
    }
  } catch (e) {
    console.error('[Visitor Tracking] Error:', e);
  }
}

// Track page view
export async function trackPageView(pagePath?: string, pageTitle?: string): Promise<void> {
  try {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) return;
    
    const path = pagePath || window.location.pathname;
    const title = pageTitle || document.title;
    
    // Insert page view
    await (supabase as any)
      .from('page_views')
      .insert({
        session_id: sessionId,
        page_path: path,
        page_title: title,
      });
    
    // Update session last_page and increment page_views
    await (supabase as any)
      .from('visitor_sessions')
      .update({
        last_page: path,
        last_seen_at: new Date().toISOString(),
        page_views: (supabase as any).rpc('increment_page_views', { sid: sessionId })
      })
      .eq('session_id', sessionId);
      
  } catch (e) {
    console.warn('Page view tracking error:', e);
  }
}

// Export for use in components
export { getSessionId };
