import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStatus, getCurrentOnboardingStep } from '@/hooks/useOnboardingStatus';
import Navigation from '@/components/Navigation';
import AnimatedBackground from '@/components/AnimatedBackground';
import KineticLoadingScreen from '@/components/KineticLoadingScreen';
import { Check, ChevronRight, ChevronLeft, FileText, Building2, CreditCard } from 'lucide-react';

// Step components
import TOSStep from '@/components/onboarding/TOSStep';
import BusinessProfileStep from '@/components/onboarding/BusinessProfileStep';
import StripeConnectStep from '@/components/onboarding/StripeConnectStep';

const STEPS = [
  { id: 'tos', title: 'Terms of Service', icon: FileText, description: 'Review and accept our terms' },
  { id: 'profile', title: 'Business Profile', icon: Building2, description: 'Set up your seller profile' },
  { id: 'stripe', title: 'Payment Setup', icon: CreditCard, description: 'Connect your Stripe account' },
] as const;

type StepId = typeof STEPS[number]['id'];

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { status, isLoading: statusLoading, refetch, becomeCreator } = useOnboardingStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine initial step based on onboarding status
  useEffect(() => {
    if (!status) return;

    // If user came here to become a creator, set that first
    if (location.state?.becomeCreator && !status.is_creator) {
      becomeCreator();
    }

    // Find the first incomplete step
    const currentStep = getCurrentOnboardingStep({
      tos_agreed_at: status.tos_agreed_at,
      business_name: status.business_name,
      stripe_connect_status: status.stripe_status,
    });

    if (currentStep === 'complete') {
      // Already fully onboarded, redirect to dashboard
      navigate(location.state?.from || '/dashboard');
      return;
    }

    const stepIndex = STEPS.findIndex(s => s.id === currentStep);
    if (stepIndex !== -1) {
      setCurrentStepIndex(stepIndex);
    }
  }, [status, navigate, location.state, becomeCreator]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { state: { from: '/onboarding' } });
    }
  }, [user, authLoading, navigate]);

  const handleStepComplete = async () => {
    await refetch();
    
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // All steps complete
      navigate(location.state?.from || '/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const getStepStatus = (stepId: StepId): 'complete' | 'current' | 'upcoming' => {
    if (!status) return 'upcoming';
    
    const stepIndex = STEPS.findIndex(s => s.id === stepId);
    if (stepIndex < currentStepIndex) return 'complete';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const isStepComplete = (stepId: StepId): boolean => {
    if (!status) return false;
    switch (stepId) {
      case 'tos': return status.tos_agreed;
      case 'profile': return status.profile_completed;
      case 'stripe': return status.stripe_connected;
      default: return false;
    }
  };

  if (authLoading || statusLoading) {
    return <KineticLoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const currentStep = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <div className="relative z-10">
        <Navigation />
        
        <div className="container mx-auto px-6 pt-24 pb-12">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold gradient-text mb-2">Become a Seller</h1>
              <p className="text-muted-foreground">Complete these steps to start selling on Vectabase</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Step {currentStepIndex + 1} of {STEPS.length}</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between mb-8">
              {STEPS.map((step, index) => {
                const stepStatus = getStepStatus(step.id);
                const StepIcon = step.icon;
                
                return (
                  <div key={step.id} className="flex flex-col items-center flex-1">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all
                      ${stepStatus === 'complete' ? 'bg-green-500/20 text-green-500 border-2 border-green-500' : ''}
                      ${stepStatus === 'current' ? 'bg-primary/20 text-primary border-2 border-primary' : ''}
                      ${stepStatus === 'upcoming' ? 'bg-muted text-muted-foreground border-2 border-muted' : ''}
                    `}>
                      {stepStatus === 'complete' ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <StepIcon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`text-sm font-medium text-center ${
                      stepStatus === 'current' ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Step Content */}
            <Card className="glass p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-1">{currentStep.title}</h2>
                <p className="text-muted-foreground">{currentStep.description}</p>
              </div>

              {currentStep.id === 'tos' && (
                <TOSStep 
                  onComplete={handleStepComplete}
                  isSubmitting={isSubmitting}
                  setIsSubmitting={setIsSubmitting}
                />
              )}

              {currentStep.id === 'profile' && (
                <BusinessProfileStep
                  onComplete={handleStepComplete}
                  onBack={handleBack}
                  isSubmitting={isSubmitting}
                  setIsSubmitting={setIsSubmitting}
                />
              )}

              {currentStep.id === 'stripe' && (
                <StripeConnectStep
                  onComplete={handleStepComplete}
                  onBack={handleBack}
                  isSubmitting={isSubmitting}
                  setIsSubmitting={setIsSubmitting}
                />
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
