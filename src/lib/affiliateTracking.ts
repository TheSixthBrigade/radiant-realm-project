// Robust affiliate tracking utility
// Uses multiple storage methods to ensure ref code persists

const AFFILIATE_REF_KEY = 'vectabase_affiliate_ref';
const AFFILIATE_TIME_KEY = 'vectabase_affiliate_time';
const COOKIE_DAYS = 30;

// Set affiliate ref in all storage methods
export function setAffiliateRef(refCode: string): void {
  const timestamp = Date.now().toString();
  
  // localStorage
  try {
    localStorage.setItem(AFFILIATE_REF_KEY, refCode);
    localStorage.setItem(AFFILIATE_TIME_KEY, timestamp);
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
  
  // sessionStorage (persists across page navigations in same tab)
  try {
    sessionStorage.setItem(AFFILIATE_REF_KEY, refCode);
    sessionStorage.setItem(AFFILIATE_TIME_KEY, timestamp);
  } catch (e) {
    console.warn('sessionStorage not available:', e);
  }
  
  // Cookie (most reliable for cross-page persistence)
  try {
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_DAYS);
    document.cookie = `${AFFILIATE_REF_KEY}=${refCode}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    document.cookie = `${AFFILIATE_TIME_KEY}=${timestamp}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  } catch (e) {
    console.warn('Cookie not available:', e);
  }
  
  console.log('Affiliate ref stored:', refCode);
}

// Get affiliate ref from any available storage
export function getAffiliateRef(): string | null {
  const maxAge = COOKIE_DAYS * 24 * 60 * 60 * 1000; // 30 days in ms
  
  // Try cookie first (most reliable)
  const cookieRef = getCookie(AFFILIATE_REF_KEY);
  const cookieTime = getCookie(AFFILIATE_TIME_KEY);
  if (cookieRef && cookieTime) {
    const age = Date.now() - parseInt(cookieTime);
    if (age < maxAge) {
      console.log('Got affiliate ref from cookie:', cookieRef);
      return cookieRef;
    }
  }
  
  // Try sessionStorage
  try {
    const sessionRef = sessionStorage.getItem(AFFILIATE_REF_KEY);
    const sessionTime = sessionStorage.getItem(AFFILIATE_TIME_KEY);
    if (sessionRef && sessionTime) {
      const age = Date.now() - parseInt(sessionTime);
      if (age < maxAge) {
        console.log('Got affiliate ref from sessionStorage:', sessionRef);
        return sessionRef;
      }
    }
  } catch (e) {}
  
  // Try localStorage
  try {
    const localRef = localStorage.getItem(AFFILIATE_REF_KEY);
    const localTime = localStorage.getItem(AFFILIATE_TIME_KEY);
    if (localRef && localTime) {
      const age = Date.now() - parseInt(localTime);
      if (age < maxAge) {
        console.log('Got affiliate ref from localStorage:', localRef);
        return localRef;
      }
    }
  } catch (e) {}
  
  console.log('No valid affiliate ref found');
  return null;
}

// Clear affiliate ref from all storage
export function clearAffiliateRef(): void {
  try {
    localStorage.removeItem(AFFILIATE_REF_KEY);
    localStorage.removeItem(AFFILIATE_TIME_KEY);
  } catch (e) {}
  
  try {
    sessionStorage.removeItem(AFFILIATE_REF_KEY);
    sessionStorage.removeItem(AFFILIATE_TIME_KEY);
  } catch (e) {}
  
  try {
    document.cookie = `${AFFILIATE_REF_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${AFFILIATE_TIME_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (e) {}
}

// Helper to get cookie value
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

// Build checkout URL with affiliate ref
export function buildCheckoutUrl(productId: string): string {
  const ref = getAffiliateRef();
  let url = `/checkout?product_id=${productId}`;
  if (ref) {
    url += `&ref=${ref}`;
  }
  return url;
}
