/**
 * Visitor Analytics Dashboard Component
 * Shows geographic and demographic data about visitors
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Globe, MapPin, Users, Monitor, Smartphone, Tablet,
  Languages, TrendingUp, RefreshCw, Loader2, Eye,
  Clock, MousePointer
} from 'lucide-react';

interface VisitorSession {
  id: string;
  session_id: string;
  country: string;
  country_code: string;
  region: string;
  city: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isp: string;
  org: string;
  language: string;
  device_type: string;
  browser: string;
  os: string;
  page_views: number;
  referrer: string;
  created_at: string;
  last_seen_at: string;
}

interface AnalyticsStats {
  totalSessions: number;
  todaySessions: number;
  countries: { name: string; code: string; count: number }[];
  cities: { name: string; country: string; count: number }[];
  postalCodes: { code: string; city: string; count: number }[];
  isps: { name: string; count: number }[];
  languages: { code: string; name: string; count: number }[];
  devices: { type: string; count: number }[];
  browsers: { name: string; count: number }[];
  topPages: { path: string; views: number }[];
  recentVisitors: VisitorSession[];
}

// Language code to name mapping
const languageNames: Record<string, string> = {
  'en': 'English', 'en-US': 'English (US)', 'en-GB': 'English (UK)',
  'es': 'Spanish', 'es-ES': 'Spanish (Spain)', 'es-MX': 'Spanish (Mexico)',
  'fr': 'French', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese',
  'pt-BR': 'Portuguese (Brazil)', 'ru': 'Russian', 'zh': 'Chinese',
  'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi',
  'nl': 'Dutch', 'pl': 'Polish', 'tr': 'Turkish', 'vi': 'Vietnamese',
  'th': 'Thai', 'id': 'Indonesian', 'sv': 'Swedish', 'da': 'Danish',
  'fi': 'Finnish', 'no': 'Norwegian', 'cs': 'Czech', 'el': 'Greek',
  'he': 'Hebrew', 'hu': 'Hungarian', 'ro': 'Romanian', 'uk': 'Ukrainian',
};

const getLanguageName = (code: string): string => {
  return languageNames[code] || languageNames[code.split('-')[0]] || code;
};

export const VisitorAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [stats, setStats] = useState<AnalyticsStats>({
    totalSessions: 0,
    todaySessions: 0,
    countries: [],
    cities: [],
    postalCodes: [],
    isps: [],
    languages: [],
    devices: [],
    browsers: [],
    topPages: [],
    recentVisitors: [],
  });

  const fetchAnalytics = async (showRefreshing = true) => {
    if (showRefreshing) setRefreshing(true);
    try {
      console.log('[Analytics] 🔄 Fetching visitor sessions...');
      
      // Fetch all visitor sessions - sort by last_seen_at to show recent activity
      const { data: sessions, error } = await (supabase as any)
        .from('visitor_sessions')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[Analytics] ❌ Error fetching:', error);
        return;
      }
      
      console.log('[Analytics] ✅ Fetched', sessions?.length || 0, 'sessions');
      if (sessions?.length > 0) {
        console.log('[Analytics] Most recent:', sessions[0]?.city, sessions[0]?.device_type, sessions[0]?.last_seen_at);
      }

      if (!sessions || sessions.length === 0) {
        setStats({
          totalSessions: 0,
          todaySessions: 0,
          countries: [],
          cities: [],
          postalCodes: [],
          isps: [],
          languages: [],
          devices: [],
          browsers: [],
          topPages: [],
          recentVisitors: [],
        });
        return;
      }

      // Calculate today's sessions
      const today = new Date().toDateString();
      const todaySessions = sessions.filter((s: VisitorSession) => 
        new Date(s.created_at).toDateString() === today
      ).length;

      // Aggregate countries
      const countryMap = new Map<string, { name: string; code: string; count: number }>();
      sessions.forEach((s: VisitorSession) => {
        if (s.country) {
          const key = s.country_code || s.country;
          const existing = countryMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            countryMap.set(key, { name: s.country, code: s.country_code || '', count: 1 });
          }
        }
      });
      const countries = Array.from(countryMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Aggregate cities
      const cityMap = new Map<string, { name: string; country: string; count: number }>();
      sessions.forEach((s: VisitorSession) => {
        if (s.city) {
          const key = `${s.city}-${s.country_code}`;
          const existing = cityMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            cityMap.set(key, { name: s.city, country: s.country || '', count: 1 });
          }
        }
      });
      const cities = Array.from(cityMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Aggregate languages
      const langMap = new Map<string, number>();
      sessions.forEach((s: VisitorSession) => {
        if (s.language) {
          langMap.set(s.language, (langMap.get(s.language) || 0) + 1);
        }
      });
      const languages = Array.from(langMap.entries())
        .map(([code, count]) => ({ code, name: getLanguageName(code), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Aggregate devices
      const deviceMap = new Map<string, number>();
      sessions.forEach((s: VisitorSession) => {
        if (s.device_type) {
          deviceMap.set(s.device_type, (deviceMap.get(s.device_type) || 0) + 1);
        }
      });
      const devices = Array.from(deviceMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Aggregate browsers
      const browserMap = new Map<string, number>();
      sessions.forEach((s: VisitorSession) => {
        if (s.browser) {
          browserMap.set(s.browser, (browserMap.get(s.browser) || 0) + 1);
        }
      });
      const browsers = Array.from(browserMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Aggregate postal codes
      const postalMap = new Map<string, { code: string; city: string; count: number }>();
      sessions.forEach((s: VisitorSession) => {
        if (s.postal_code) {
          const key = `${s.postal_code}-${s.city}`;
          const existing = postalMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            postalMap.set(key, { code: s.postal_code, city: s.city || '', count: 1 });
          }
        }
      });
      const postalCodes = Array.from(postalMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Aggregate ISPs
      const ispMap = new Map<string, number>();
      sessions.forEach((s: VisitorSession) => {
        if (s.isp) {
          ispMap.set(s.isp, (ispMap.get(s.isp) || 0) + 1);
        }
      });
      const isps = Array.from(ispMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      console.log('[Analytics] 📊 Stats updated:', {
        total: sessions.length,
        today: todaySessions,
        recentCount: sessions.slice(0, 20).length,
        firstRecent: sessions[0]?.city,
      });

      setStats({
        totalSessions: sessions.length,
        todaySessions,
        countries,
        cities,
        postalCodes,
        isps,
        languages,
        devices,
        browsers,
        topPages: [],
        recentVisitors: sessions.slice(0, 20),
      });

    } catch (e) {
      console.error('Analytics fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Set up realtime subscription for live updates
  useEffect(() => {
    // Initial fetch
    fetchAnalytics();
    
    // Subscribe to realtime changes on visitor_sessions table
    console.log('[Analytics] 🔌 Setting up realtime subscription...');
    const channel = (supabase as any)
      .channel('visitor_sessions_realtime_' + Date.now())
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'visitor_sessions',
        },
        (payload: any) => {
          console.log('[Analytics] 🆕 NEW VISITOR:', payload.new?.city, payload.new?.device_type);
          setLiveIndicator(true);
          setTimeout(() => setLiveIndicator(false), 2000);
          // Immediate refresh for new visitors
          fetchAnalytics(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'visitor_sessions',
        },
        (payload: any) => {
          console.log('[Analytics] 🔄 Visitor updated:', payload.new?.session_id?.slice(0, 10));
          setLiveIndicator(true);
          setTimeout(() => setLiveIndicator(false), 500);
          // Refresh on updates too
          fetchAnalytics(false);
        }
      )
      .subscribe((status: string) => {
        console.log('[Analytics] 📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[Analytics] ✅ Realtime connected!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Analytics] ❌ Realtime failed, using polling only');
        }
      });

    // Fallback: Poll every 5 seconds for reliability
    const pollInterval = setInterval(() => {
      fetchAnalytics(false);
    }, 5000);

    // Cleanup subscription on unmount
    return () => {
      console.log('[Analytics] Cleaning up realtime subscription');
      (supabase as any).removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Visitor Analytics</h2>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${liveIndicator ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
            <span className={`w-2 h-2 rounded-full ${liveIndicator ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`} />
            LIVE
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Visitors</p>
              <p className="text-2xl font-bold">{stats.totalSessions}</p>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold text-green-500">{stats.todaySessions}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Countries</p>
              <p className="text-2xl font-bold text-blue-500">{stats.countries.length}</p>
            </div>
            <Globe className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Languages</p>
              <p className="text-2xl font-bold text-purple-500">{stats.languages.length}</p>
            </div>
            <Languages className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Top Countries
          </h3>
          {stats.countries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.countries.map((country, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{country.code ? `🏳️` : '🌍'}</span>
                    <span className="font-medium">{country.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(country.count / stats.totalSessions) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {country.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Cities */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Top Cities
          </h3>
          {stats.cities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.cities.map((city, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div>
                    <span className="font-medium">{city.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">{city.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(city.count / stats.totalSessions) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {city.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Languages */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Languages
          </h3>
          {stats.languages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.languages.map((lang, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div>
                    <span className="font-medium">{lang.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({lang.code})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${(lang.count / stats.totalSessions) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {lang.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Devices & Browsers */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Devices & Browsers
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Devices</p>
              <div className="flex gap-4">
                {stats.devices.map((device, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    {getDeviceIcon(device.type)}
                    <span className="capitalize">{device.type}</span>
                    <span className="text-muted-foreground">({device.count})</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Browsers</p>
              <div className="flex flex-wrap gap-2">
                {stats.browsers.map((browser, i) => (
                  <div key={i} className="px-3 py-1 rounded-full bg-muted/50 text-sm">
                    {browser.name} ({browser.count})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ISPs */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Internet Providers (ISPs)
          </h3>
          {stats.isps.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.isps.map((isp, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="font-medium text-sm truncate max-w-[200px]">{isp.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${(isp.count / stats.totalSessions) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">
                      {isp.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Postal Codes */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Postal Codes / ZIP
          </h3>
          {stats.postalCodes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.postalCodes.map((postal, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div>
                    <span className="font-mono font-medium">{postal.code}</span>
                    {postal.city && <span className="text-sm text-muted-foreground ml-2">({postal.city})</span>}
                  </div>
                  <span className="text-sm text-muted-foreground">{postal.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Visitors */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Recent Visitors
        </h3>
        {stats.recentVisitors.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No visitors yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Location</th>
                  <th className="text-left p-2">Coordinates</th>
                  <th className="text-left p-2">ISP</th>
                  <th className="text-left p-2">Language</th>
                  <th className="text-left p-2">Device</th>
                  <th className="text-left p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentVisitors.map((visitor, i) => (
                  <tr key={visitor.id || i} className="border-b border-muted/30 hover:bg-muted/20">
                    <td className="p-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {visitor.city ? `${visitor.city}, ` : ''}{visitor.country || 'Unknown'}
                        </div>
                        {visitor.postal_code && (
                          <span className="text-xs text-muted-foreground ml-4">{visitor.postal_code}</span>
                        )}
                        <span className="text-xs text-muted-foreground/50 ml-4 font-mono">
                          {visitor.session_id?.slice(0, 15)}...
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      {visitor.latitude && visitor.longitude ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-mono">
                            {visitor.latitude.toFixed(4)}, {visitor.longitude.toFixed(4)}
                          </span>
                          {visitor.accuracy && (
                            <span className="text-xs text-green-500">±{Math.round(visitor.accuracy)}m GPS</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-2">
                      <span className="text-xs">{visitor.isp || '-'}</span>
                    </td>
                    <td className="p-2">{getLanguageName(visitor.language)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {getDeviceIcon(visitor.device_type)}
                        <span className="capitalize">{visitor.device_type}</span>
                      </div>
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {formatTimeAgo(visitor.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VisitorAnalytics;
