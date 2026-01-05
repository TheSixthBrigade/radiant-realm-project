import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface OnboardingStatus {
  tos_agreed: boolean;
  tos_agreed_at: string | null;
  tos_version: string | null;
  profile_completed: boolean;
  business_name: string | null;
  business_description: string | null;
  contact_email: string | null;
  stripe_connected: boolean;
  stripe_account_id: string | null;
  stripe_status: 'pending' | 'incomplete' | 'complete' | null;
  is_fully_onboarded: boolean;
  is_creator: boolean;
}

export interface OnboardingUpdates {
  tos_agreed_at?: string;
  tos_version?: string;
  business_name?: string;
  business_description?: string;
  contact_email?: string;
  stripe_connect_account_id?: string;
  stripe_connect_status?: string;
  onboarding_completed_at?: string;
  is_creator?: boolean;
}

// Utility function to check if onboarding is complete
export function isOnboardingComplete(profile: {
  tos_agreed_at: string | null;
  business_name: string | null;
  stripe_connect_status: string | null;
}): boolean {
  return (
    profile.tos_agreed_at !== null &&
    profile.business_name !== null &&
    profile.stripe_connect_status === 'complete'
  );
}

// Utility function to get current onboarding step
export function getCurrentOnboardingStep(profile: {
  tos_agreed_at: string | null;
  business_name: string | null;
  stripe_connect_status: string | null;
}): 'tos' | 'profile' | 'stripe' | 'complete' {
  if (!profile.tos_agreed_at) return 'tos';
  if (!profile.business_name) return 'profile';
  if (profile.stripe_connect_status !== 'complete') return 'stripe';
  return 'complete';
}

// Validation utilities
export function validateBusinessProfile(data: {
  business_name?: string;
  business_description?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.business_name || data.business_name.trim() === '') {
    errors.business_name = 'Business name is required';
  }

  if (data.business_description && data.business_description.length > 500) {
    errors.business_description = 'Description must be 500 characters or less';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function useOnboardingStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          tos_agreed_at,
          tos_version,
          business_name,
          business_description,
          contact_email,
          stripe_connect_account_id,
          stripe_connect_status,
          onboarding_completed_at,
          is_creator
        `)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (profile) {
        const onboardingStatus: OnboardingStatus = {
          tos_agreed: !!profile.tos_agreed_at,
          tos_agreed_at: profile.tos_agreed_at,
          tos_version: profile.tos_version,
          profile_completed: !!profile.business_name,
          business_name: profile.business_name,
          business_description: profile.business_description,
          contact_email: profile.contact_email,
          stripe_connected: profile.stripe_connect_status === 'complete',
          stripe_account_id: profile.stripe_connect_account_id,
          stripe_status: profile.stripe_connect_status as OnboardingStatus['stripe_status'],
          is_fully_onboarded: isOnboardingComplete(profile),
          is_creator: profile.is_creator || false,
        };
        setStatus(onboardingStatus);
      }
    } catch (err) {
      console.error('Error fetching onboarding status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch onboarding status');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateStatus = useCallback(async (updates: OnboardingUpdates) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    // Refetch to get updated status
    await fetchStatus();
  }, [user, fetchStatus]);

  const agreeTOS = useCallback(async (version: string = '2026-01-05') => {
    await updateStatus({
      tos_agreed_at: new Date().toISOString(),
      tos_version: version,
    });
  }, [updateStatus]);

  const saveBusinessProfile = useCallback(async (data: {
    business_name: string;
    business_description?: string;
    contact_email?: string;
  }) => {
    const validation = validateBusinessProfile(data);
    if (!validation.valid) {
      throw new Error(Object.values(validation.errors).join(', '));
    }

    await updateStatus({
      business_name: data.business_name.trim(),
      business_description: data.business_description?.trim() || null,
      contact_email: data.contact_email?.trim() || user?.email || null,
    });
  }, [updateStatus, user]);

  const markOnboardingComplete = useCallback(async () => {
    await updateStatus({
      onboarding_completed_at: new Date().toISOString(),
    });
  }, [updateStatus]);

  const becomeCreator = useCallback(async () => {
    await updateStatus({
      is_creator: true,
    });
  }, [updateStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
    updateStatus,
    agreeTOS,
    saveBusinessProfile,
    markOnboardingComplete,
    becomeCreator,
    getCurrentStep: () => status ? getCurrentOnboardingStep({
      tos_agreed_at: status.tos_agreed_at,
      business_name: status.business_name,
      stripe_connect_status: status.stripe_status,
    }) : 'tos',
  };
}
