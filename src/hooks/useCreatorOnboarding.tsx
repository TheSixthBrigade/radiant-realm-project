import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingStatus {
  id?: string;
  step: number;
  profilePictureUploaded: boolean;
  creatorTypeSelected: boolean;
  businessInfoCompleted: boolean;
  completedAt?: string;
  isCompleted: boolean;
}

export const useCreatorOnboarding = () => {
  const { user } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>({
    step: 1,
    profilePictureUploaded: false,
    creatorTypeSelected: false,
    businessInfoCompleted: false,
    isCompleted: false,
  });
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);

      // Check if user is a creator and if profile is completed
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_creator, profile_completed, avatar_url, creator_type')
        .eq('user_id', user?.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      // If user is not a creator, no onboarding needed
      if (!profile?.is_creator) {
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      // If profile is completed, no onboarding needed
      if (profile?.profile_completed) {
        setNeedsOnboarding(false);
        setOnboardingStatus(prev => ({ ...prev, isCompleted: true }));
        setLoading(false);
        return;
      }

      // Check onboarding table
      const { data: onboarding, error: onboardingError } = await supabase
        .from('creator_onboarding')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (onboardingError && onboardingError.code !== 'PGRST116') {
        console.error('Error fetching onboarding:', onboardingError);
        return;
      }

      if (onboarding) {
        setOnboardingStatus({
          id: onboarding.id,
          step: onboarding.step,
          profilePictureUploaded: onboarding.profile_picture_uploaded,
          creatorTypeSelected: onboarding.creator_type_selected,
          businessInfoCompleted: onboarding.business_info_completed,
          completedAt: onboarding.completed_at,
          isCompleted: !!onboarding.completed_at,
        });
        setNeedsOnboarding(!onboarding.completed_at);
      } else {
        // Create onboarding record
        const { error: createError } = await supabase
          .from('creator_onboarding')
          .insert({ user_id: user?.id });

        if (createError) {
          console.error('Error creating onboarding:', createError);
        }

        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
    setOnboardingStatus(prev => ({ ...prev, isCompleted: true }));
  };

  return {
    onboardingStatus,
    needsOnboarding,
    loading,
    checkOnboardingStatus,
    completeOnboarding,
  };
};