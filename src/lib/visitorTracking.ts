/**
 * Visitor Analytics Tracking - ROBUST VERSION
 * Tracks anonymous visitor data for platform analytics
 * Works in both local development (HTTP) and production (HTTPS)
 * Uses IP geolocation + optional browser GPS for precise location
 * 
 * Features:
 * - Multiple IP geolocation API fallbacks
 * - Retry logic for database saves
 * - Works on mobile, desktop, local network, production
 * - Graceful degradation if APIs fail
 */

import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'vectabase_visitor_session';
const TRACKED_KEY = 'vectabase_tracked_this_session';

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

// Get or create session ID - ALWAYS creates new for new browser sessions
function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  // For debugging - check if this is a returning session
  if (sessionId) {
    console.log('[Visitor Tracking] 📋 Found existing session:', sessionId);
  }
  
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
    // Clear the tracked flag for new sessions
    sessionStorage.removeItem(TRACKED_KEY);
    console.log('[Visitor Tracking] 🆕 Created NEW session:', sessionId);
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
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
}

// Detect OS from user agent
function getOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
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

// Fetch with timeout helper
async function fetchWithTimeout(url: string, timeout = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// Fetch detailed location data from IP using multiple APIs
async function getLocationFromIP(): Promise<Partial<VisitorData>> {
  console.log('[Visitor Tracking] 🌍 Fetching IP location... (local network:', isLocalNetwork, ')');
  
  // Try ipapi.co first (HTTPS, works everywhere, 1000 free/day)
  try {
    const response = await fetchWithTimeout('https://ipapi.co/json/', 8000);
    if (response.ok) {
      const data = await response.json();
      if (data.ip && !data.error) {
        console.log('[Visitor Tracking] ✅ IP Location from ipapi.co:', data.city, data.country_name);
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
    const response = await fetchWithTimeout('https://ipwho.is/', 8000);
    if (response.ok) {
      const data = await response.json();
      if (data.success !== false) {
        console.log('[Visitor Tracking] ✅ IP Location from ipwho.is:', data.city, data.country);
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

  // Try ip-api.com (HTTP only but works on local network)
  try {
    const response = await fetchWithTimeout('http://ip-api.com/json/', 8000);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        console.log('[Visitor Tracking] ✅ IP Location from ip-api.com:', data.city, data.country);
        return {
          country: data.country,
          countryCode: data.countryCode,
          region: data.regionName,
          city: data.city,
          postalCode: data.zip,
          timezone: data.timezone,
          latitude: data.lat,
          longitude: data.lon,
          isp: data.isp,
          org: data.org,
        };
      }
    }
  } catch (e) {
    console.warn('[Visitor Tracking] ip-api.com failed:', e);
  }

  console.warn('[Visitor Tracking] ⚠️ All IP geolocation APIs failed - using defaults');
  return {
    country: 'Unknown',
    city: 'Unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

// Get precise GPS location from browser (non-blocking)
async function getPreciseLocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  if (!navigator.geolocation) {
    console.log('[Visitor Tracking] Geolocation API not available');
    return null;
  }
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('[Visitor Tracking] GPS timeout - continuing without');
      resolve(null);
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        console.log('[Visitor Tracking] 📍 GPS obtained - Accuracy:', position.coords.accuracy, 'm');
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        clearTimeout(timeout);
        console.log('[Visitor Tracking] GPS error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}


// Save visitor data to database with retries
async function saveVisitorData(visitorData: Record<string, unknown>, retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Visitor Tracking] 💾 Save attempt ${attempt}/${retries}...`);
      showDebugToast(`💾 Save attempt ${attempt}/${retries}...`);
      
      // Try upsert first
      const { data, error } = await (supabase as any)
        .from('visitor_sessions')
        .upsert(visitorData, { 
          onConflict: 'session_id',
          ignoreDuplicates: false 
        })
        .select();
      
      if (!error) {
        console.log('[Visitor Tracking] ✅ SUCCESS! Saved visitor data. ID:', data?.[0]?.id);
        return true;
      }
      
      console.error(`[Visitor Tracking] ❌ Attempt ${attempt} failed:`, error.message, error.code);
      showDebugToast(`❌ DB Error: ${error.message} (${error.code})`, true);
      
      // If upsert failed, try direct insert (in case session_id doesn't exist yet)
      if (attempt === 1 && error.code === '23505') {
        // Duplicate key - try update instead
        const { error: updateError } = await (supabase as any)
          .from('visitor_sessions')
          .update({
            ...visitorData,
            last_seen_at: new Date().toISOString(),
          })
          .eq('session_id', visitorData.session_id);
        
        if (!updateError) {
          console.log('[Visitor Tracking] ✅ SUCCESS via update!');
          return true;
        }
      }
      
      // Wait before retry
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    } catch (e) {
      console.error(`[Visitor Tracking] ❌ Attempt ${attempt} exception:`, e);
      showDebugToast(`❌ Exception: ${e}`, true);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  
  console.error('[Visitor Tracking] ❌ All save attempts failed!');
  return false;
}

// Check if user has consented to analytics (kept for future use)
export function hasAnalyticsConsent(): boolean {
  return localStorage.getItem('vectabase_analytics_consent') === 'true';
}

// Set analytics consent (kept for future use)
export function setAnalyticsConsent(consent: boolean): void {
  localStorage.setItem('vectabase_analytics_consent', consent ? 'true' : 'false');
}

// Show debug toast on mobile (temporary for debugging)
function showDebugToast(message: string, isError = false) {
  // Only show in development or if debug param is set
  if (!window.location.search.includes('debug=1') && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('192.168')) {
    return;
  }
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    padding: 12px 16px;
    background: ${isError ? '#ef4444' : '#22c55e'};
    color: white;
    border-radius: 8px;
    font-size: 12px;
    z-index: 99999;
    font-family: monospace;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Main tracking function - ROBUST VERSION
export async function trackVisitor(): Promise<void> {
  const startTime = Date.now();
  console.log('═══════════════════════════════════════════════════════');
  console.log('[Visitor Tracking] 🚀 STARTING TRACKING...');
  console.log('[Visitor Tracking] Host:', window.location.hostname);
  console.log('[Visitor Tracking] Protocol:', window.location.protocol);
  console.log('[Visitor Tracking] URL:', window.location.href);
  console.log('═══════════════════════════════════════════════════════');
  
  showDebugToast('🚀 Starting visitor tracking...');
  
  try {
    const sessionId = getSessionId();
    const ua = navigator.userAgent;
    const utm = getUTMParams();
    const deviceType = getDeviceType(ua);
    const browser = getBrowser(ua);
    const os = getOS(ua);
    
    console.log('[Visitor Tracking] 📱 Device:', deviceType, '| Browser:', browser, '| OS:', os);
    
    // Get IP location first (this is the most reliable)
    console.log('[Visitor Tracking] Getting location data...');
    const ipLocation = await getLocationFromIP();
    
    // Try GPS in parallel but don't wait too long
    let gpsLocation: { latitude: number; longitude: number; accuracy: number } | null = null;
    try {
      gpsLocation = await getPreciseLocation();
    } catch (e) {
      console.log('[Visitor Tracking] GPS failed, using IP location only');
    }
    
    // Determine best coordinates
    let latitude = ipLocation.latitude ?? null;
    let longitude = ipLocation.longitude ?? null;
    let accuracy: number | null = null;
    
    if (gpsLocation && gpsLocation.accuracy < 500) {
      console.log('[Visitor Tracking] 📍 Using GPS (accuracy:', gpsLocation.accuracy, 'm)');
      latitude = gpsLocation.latitude;
      longitude = gpsLocation.longitude;
      accuracy = gpsLocation.accuracy;
    } else if (gpsLocation) {
      console.log('[Visitor Tracking] 📍 GPS too inaccurate:', gpsLocation.accuracy, 'm - using IP location');
    }
    
    const visitorData = {
      session_id: sessionId,
      country: ipLocation.country || 'Unknown',
      country_code: ipLocation.countryCode || null,
      region: ipLocation.region || null,
      city: ipLocation.city || 'Unknown',
      postal_code: ipLocation.postalCode || null,
      timezone: ipLocation.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      latitude,
      longitude,
      accuracy,
      isp: ipLocation.isp || null,
      org: ipLocation.org || null,
      language: navigator.language || 'en',
      languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language || 'en'],
      user_agent: ua,
      device_type: deviceType,
      browser: browser,
      os: os,
      referrer: document.referrer || null,
      utm_source: utm.source || null,
      utm_medium: utm.medium || null,
      utm_campaign: utm.campaign || null,
      first_page: window.location.pathname,
      last_page: window.location.pathname,
      last_seen_at: new Date().toISOString(),
    };
    
    console.log('[Visitor Tracking] 📊 Data to save:', {
      session_id: visitorData.session_id,
      city: visitorData.city,
      country: visitorData.country,
      device_type: visitorData.device_type,
      browser: visitorData.browser,
      os: visitorData.os,
    });
    
    // Save with retries
    const saved = await saveVisitorData(visitorData);
    
    const elapsed = Date.now() - startTime;
    if (saved) {
      console.log('═══════════════════════════════════════════════════════');
      console.log(`[Visitor Tracking] ✅ TRACKING COMPLETE in ${elapsed}ms`);
      console.log('═══════════════════════════════════════════════════════');
      sessionStorage.setItem(TRACKED_KEY, 'true');
      showDebugToast(`✅ Tracked! ${visitorData.city}, ${visitorData.device_type} (${elapsed}ms)`);
    } else {
      console.error('═══════════════════════════════════════════════════════');
      console.error(`[Visitor Tracking] ❌ TRACKING FAILED after ${elapsed}ms`);
      console.error('═══════════════════════════════════════════════════════');
      showDebugToast(`❌ TRACKING FAILED after ${elapsed}ms`, true);
    }
    
  } catch (e) {
    console.error('[Visitor Tracking] ❌ FATAL ERROR:', e);
    showDebugToast(`❌ FATAL ERROR: ${e}`, true);
  }
}

// Track page view
export async function trackPageView(pagePath?: string, pageTitle?: string): Promise<void> {
  try {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) return;
    
    const path = pagePath || window.location.pathname;
    const title = pageTitle || document.title;
    
    await (supabase as any)
      .from('page_views')
      .insert({
        session_id: sessionId,
        page_path: path,
        page_title: title,
      });
    
    await (supabase as any)
      .from('visitor_sessions')
      .update({
        last_page: path,
        last_seen_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);
      
  } catch (e) {
    console.warn('Page view tracking error:', e);
  }
}

// Export for use in components
export { getSessionId };
