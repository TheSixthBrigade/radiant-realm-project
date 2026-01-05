import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import KineticLoadingScreen from './KineticLoadingScreen';

interface SellerRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
  requireCreator?: boolean;
}

/**
 * Protected route wrapper for seller features.
 * Redirects to onboarding if the user hasn't completed the seller setup.
 * 
 * Property 1: TOS Agreement Blocks Seller Access
 * For any user who has not agreed to TOS, attempting to access any seller feature
 * SHALL result in a redirect to the onboarding page.
 */
export function SellerRoute({ 
  children, 
  requireOnboarding = true,
  requireCreator = true 
}: SellerRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { status, isLoading: onboardingLoading } = useOnboardingStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for auth and onboarding status to load
    if (authLoading || onboardingLoading) return;

    // Not logged in - redirect to auth
    if (!user) {
      navigate('/auth', { state: { from: location.pathname } });
      return;
    }

    // If we require creator status and user is not a creator, prompt them
    if (requireCreator && status && !status.is_creator) {
      navigate('/onboarding', { 
        state: { 
          from: location.pathname,
          becomeCreator: true 
        } 
      });
      return;
    }

    // If we require onboarding and it's not complete, redirect to onboarding
    if (requireOnboarding && status && !status.is_fully_onboarded) {
      navigate('/onboarding', { state: { from: location.pathname } });
      return;
    }
  }, [user, status, authLoading, onboardingLoading, navigate, location, requireOnboarding, requireCreator]);

  // Show loading while checking auth/onboarding status
  if (authLoading || onboardingLoading) {
    return <KineticLoadingScreen />;
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Check creator requirement
  if (requireCreator && status && !status.is_creator) {
    return null;
  }

  // Check onboarding requirement
  if (requireOnboarding && status && !status.is_fully_onboarded) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Utility function to check if a user can access seller features.
 * Used for conditional rendering without full route protection.
 */
export function canAccessSellerFeatures(status: {
  tos_agreed: boolean;
  is_creator: boolean;
  is_fully_onboarded: boolean;
} | null): boolean {
  if (!status) return false;
  return status.tos_agreed && status.is_creator && status.is_fully_onboarded;
}

export default SellerRoute;
