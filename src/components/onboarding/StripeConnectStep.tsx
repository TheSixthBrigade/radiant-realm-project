import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, CreditCard, ExternalLink, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface StripeConnectStepProps {
  onComplete: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

const StripeConnectStep = ({ onComplete, onBack, isSubmitting, setIsSubmitting }: StripeConnectStepProps) => {
  const { status, refetch } = useOnboardingStatus();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Check Stripe status when returning from Stripe onboarding
  useEffect(() => {
    const stripeReturn = searchParams.get('stripe_return');
    const stripeRefresh = searchParams.get('stripe_refresh');
    
    if (stripeReturn === 'true' || stripeRefresh === 'true') {
      // Clear the URL params
      searchParams.delete('stripe_return');
      searchParams.delete('stripe_refresh');
      setSearchParams(searchParams, { replace: true });
      
      // Check the Stripe account status
      checkStripeStatus();
    }
  }, [searchParams]);

  const checkStripeStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-check-status');
      
      if (error) {
        console.error('Error checking Stripe status:', error);
        toast({
          title: 'Status Check Failed',
          description: 'Could not verify your Stripe account status. Please try refreshing.',
          variant: 'destructive',
        });
        return;
      }

      console.log('Stripe status check result:', data);

      // Refetch the onboarding status to get updated data
      await refetch();

      if (data?.status === 'complete') {
        toast({
          title: 'Stripe Connected!',
          description: 'Your Stripe account is fully set up and ready to receive payments.',
        });
        onComplete();
      } else if (data?.status === 'pending') {
        toast({
          title: 'Almost There!',
          description: 'Your Stripe account is pending verification. This usually takes a few minutes.',
        });
      } else {
        toast({
          title: 'Setup Incomplete',
          description: 'Please complete all required information in Stripe to finish setup.',
        });
      }
    } catch (err) {
      console.error('Failed to check Stripe status:', err);
      toast({
        title: 'Error',
        description: 'Failed to check Stripe status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleConnectStripe = async () => {
    setIsConnecting(true);
    setIsSubmitting(true);

    try {
      // Call the Stripe Connect edge function
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: {
          return_url: `${window.location.origin}/onboarding?stripe_return=true`,
          refresh_url: `${window.location.origin}/onboarding?stripe_refresh=true`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        throw new Error('No onboarding URL returned');
      }
    } catch (error) {
      console.error('Stripe Connect error:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Stripe. Please try again.',
        variant: 'destructive',
      });
      setIsConnecting(false);
      setIsSubmitting(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsSubmitting(true);
    await checkStripeStatus();
    setIsSubmitting(false);
  };

  const getStatusDisplay = () => {
    if (!status?.stripe_account_id) {
      return {
        icon: <CreditCard className="w-8 h-8 text-muted-foreground" />,
        title: 'Connect Your Stripe Account',
        description: 'Link your Stripe account to receive payouts for your sales.',
        status: 'not_started',
      };
    }

    switch (status.stripe_status) {
      case 'complete':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-500" />,
          title: 'Stripe Connected!',
          description: 'Your Stripe account is fully set up and ready to receive payments.',
          status: 'complete',
        };
      case 'pending':
      case 'incomplete':
        return {
          icon: <Clock className="w-8 h-8 text-yellow-500" />,
          title: 'Setup Incomplete',
          description: 'Your Stripe account needs additional information. Click below to continue setup.',
          status: 'incomplete',
        };
      default:
        return {
          icon: <AlertCircle className="w-8 h-8 text-red-500" />,
          title: 'Setup Required',
          description: 'Please complete your Stripe account setup to receive payments.',
          status: 'error',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="space-y-6">
      {/* Loading state when checking status */}
      {isCheckingStatus && (
        <div className="flex flex-col items-center text-center p-6 bg-muted/50 rounded-lg">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <h3 className="text-lg font-semibold mt-4">Checking Your Stripe Account...</h3>
          <p className="text-muted-foreground mt-2">Please wait while we verify your setup.</p>
        </div>
      )}

      {/* Status Display */}
      {!isCheckingStatus && (
        <div className="flex flex-col items-center text-center p-6 bg-muted/50 rounded-lg">
          {statusDisplay.icon}
          <h3 className="text-lg font-semibold mt-4">{statusDisplay.title}</h3>
          <p className="text-muted-foreground mt-2 max-w-md">{statusDisplay.description}</p>
        </div>
      )}

      {/* Benefits */}
      {statusDisplay.status !== 'complete' && (
        <div className="space-y-3">
          <h4 className="font-medium">Why Stripe Connect?</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Secure, instant payouts directly to your bank account</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Accept credit cards, debit cards, and more</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Automatic tax reporting and compliance</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Dashboard to track your earnings and payouts</span>
            </li>
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting || isConnecting}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <div className="flex gap-2">
          {status?.stripe_account_id && statusDisplay.status !== 'complete' && (
            <Button
              variant="outline"
              onClick={handleRefreshStatus}
              disabled={isSubmitting}
            >
              Refresh Status
            </Button>
          )}

          {statusDisplay.status === 'complete' ? (
            <Button
              onClick={onComplete}
              className="btn-gaming"
            >
              Complete Setup
              <CheckCircle className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleConnectStripe}
              disabled={isConnecting || isSubmitting}
              className="btn-gaming"
            >
              {isConnecting ? 'Connecting...' : status?.stripe_account_id ? 'Continue Setup' : 'Connect with Stripe'}
              <ExternalLink className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center">
        You'll be redirected to Stripe to complete the setup. This usually takes 5-10 minutes.
      </p>
    </div>
  );
};

export default StripeConnectStep;
