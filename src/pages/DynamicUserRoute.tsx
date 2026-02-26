import { useParams, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const UserSite = lazy(() => import('./UserSite'));

// System routes that should NOT be treated as user stores
const SYSTEM_ROUTES = new Set([
  'shop', 'product', 'dashboard', 'auth', 'creators', 'about', 'contact',
  'add-product', 'create-store', 'store', 'store-management', 'admin',
  'checkout', 'downloads', 'payment-success', 'payment-failure', 'site',
  'creator', 'developer', 'analytics', 'onboarding', 'tos', 'privacy', 'old',
  'api', 'assets', 'static', 'favicon.ico', 'robots.txt', 'sitemap.xml', '404',
  'pricing', 'index', 'home',
]);

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
  </div>
);

/** Convert a display_name to a URL slug: "John Smith" → "john-smith" */
function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export default function DynamicUserRoute() {
  const { username } = useParams();
  const [isValidUser, setIsValidUser] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (!username) { setIsValidUser(false); setLoading(false); return; }
      if (SYSTEM_ROUTES.has(username.toLowerCase())) { setIsValidUser(false); setLoading(false); return; }

      try {
        const slug = username.toLowerCase();
        // "john-smith" → "john smith" for display_name matching
        const nameFromSlug = slug.replace(/-/g, ' ');

        // Use % wildcards so ilike does a CONTAINS search, not exact match.
        // We fetch up to 20 candidates and match client-side.
        const { data: candidates } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .ilike('display_name', `%${nameFromSlug}%`)
          .limit(20);

        const profiles = candidates || [];

        const match = profiles.find(p => {
          if (!p.display_name) return false;
          const dn = p.display_name.toLowerCase();
          return (
            toSlug(dn) === slug ||   // "John Smith" → "john-smith" === slug
            dn === slug ||            // display_name stored as slug itself
            dn === nameFromSlug       // display_name matches space version
          );
        });

        setIsValidUser(!!match);
      } catch (err) {
        console.error('[DynamicUserRoute] Error checking user:', err);
        // On error, let UserSite handle it gracefully
        setIsValidUser(true);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [username]);

  if (loading) return <PageLoader />;
  if (!isValidUser) return <Navigate to="/404" replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <UserSite />
    </Suspense>
  );
}
