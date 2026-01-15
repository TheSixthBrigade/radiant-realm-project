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

// Get precise GPS location from browser (requires HTTPS or localhost)
async function getPreciseLocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  // Check if we already asked this session
  if (sessionStorage.getItem(LOCATION_ASKED_KEY)) {
    console.log('[Visitor Tracking] GPS already asked this session, skipping');
    return null;
  }
  
  // GPS requires secure context (HTTPS) - won't work on HTTP except localhost
  if (!isSecureContext && !window.location.hostname.includes('localhost')) {
    console.log('[Visitor Tracking] GPS unavailable - requires HTTPS. Current:', window.location.protocol);
    return null;
  }
  
  if (!navigator.geolocation) {
    console.log('[Visitor Tracking] Geolocation API not available');
    return null;
  }
  
  console.log('[Visitor Tracking] Requesting GPS permission...');
  
  return new Promise((resolve) => {
    sessionStorage.setItem(LOCATION_ASKED_KEY, 'true');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[Visitor Tracking] GPS success! Accuracy:', position.coords.accuracy, 'm');
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        // User denied or error - that's fine, we have IP location
        console.log('[Visitor Tracking] GPS denied/failed:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  });
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
  console.log('[Visitor Tracking] Secure context:', isSecureContext, 'Local network:', isLocalNetwork);
  
  try {
    const sessionId = getSessionId();
    const ua = navigator.userAgent;
    const utm = getUTMParams();
    
    console.log('[Visitor Tracking] Session ID:', sessionId);
    console.log('[Visitor Tracking] Device:', getDeviceType(ua), 'Browser:', getBrowser(ua), 'OS:', getOS(ua));
    
    // Get IP-based location data (includes lat/lng, ISP, postal code)
    const ipLocation = await getLocationFromIP();
    console.log('[Visitor Tracking] IP Location result:', ipLocation);
    
    // Try to get precise GPS location (will prompt user once per session)
    // Note: GPS only works on HTTPS - on HTTP we rely on IP geolocation
    const gpsLocation = await getPreciseLocation();
    console.log('[Visitor Tracking] GPS Location result:', gpsLocation);
    
    // Use GPS coordinates if available (more accurate), otherwise use IP-based
    const latitude = gpsLocation?.latitude ?? ipLocation.latitude ?? null;
    const longitude = gpsLocation?.longitude ?? ipLocation.longitude ?? null;
    const accuracy = gpsLocation?.accuracy ?? null; // Only GPS provides accuracy
    
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
    };
    
    console.log('[Visitor Tracking] Saving to database:', {
      city: visitorData.city,
      country: visitorData.country,
      latitude: visitorData.latitude,
      longitude: visitorData.longitude,
      device_type: visitorData.device_type,
      isp: visitorData.isp
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
