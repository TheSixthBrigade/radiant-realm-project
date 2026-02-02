import { useParams, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const UserSite = lazy(() => import('./UserSite'));

// System routes that should NOT be treated as user stores
const SYSTEM_ROUTES = [
  'shop', 'product', 'dashboard', 'auth', 'creators', 'about', 'contact',
  'add-product', 'create-store', 'store', 'store-management', 'admin',
  'checkout', 'downloads', 'payment-success', 'payment-failure', 'site',
  'creator', 'developer', 'analytics', 'onboarding', 'tos', 'privacy', 'old',
  'api', 'assets', 'static', 'favicon.ico', 'robots.txt', 'sitemap.xml', '404'
];

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
  </div>
);

export default function DynamicUserRoute() {
  const { username, pageType, productId } = useParams();
  const [isValidUser, setIsValidUser] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (!username) {
        setIsValidUser(false);
        setLoading(false);
        return;
      }

      // Check if this is a system route
      if (SYSTEM_ROUTES.includes(username.toLowerCase())) {
        setIsValidUser(false);
        setLoading(false);
        return;
      }

      try {
        // Check if a creator with this slug exists
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .eq('is_creator', true);

        const profile = profiles?.find(p => {
          const profileSlug = p.display_name?.toLowerCase().replace(/\s+/g, '-');
          return profileSlug === username.toLowerCase() || p.user_id === username;
        });

        setIsValidUser(!!profile);
      } catch (error) {
        console.error('Error checking user:', error);
        setIsValidUser(false);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [username]);

  if (loading) {
    return <PageLoader />;
  }

  // If not a valid user store, show 404
  if (!isValidUser) {
    return <Navigate to="/404" replace />;
  }

  // Render UserSite - it will pick up username from useParams
  return (
    <Suspense fallback={<PageLoader />}>
      <UserSite />
    </Suspense>
  );
}
