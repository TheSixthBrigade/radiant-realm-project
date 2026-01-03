import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function StripeSettings() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [stripeStatus, setStripeStatus] = useState<'not_started' | 'pending' | 'connected'>('not_started');

  useEffect(() => {
    fetchStripeStatus();
    
    // Check if returning from Stripe onboarding
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_success') === 'true') {
      handleStripeReturn();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  const handleStripeReturn = async () => {
    if (!user?.id) return;
    
    try {
      // Check account status via our account checker function
      const { data: checkResult, error: checkError } = await supabase.functions.invoke('stripe-check-accounts');
      
      if (checkError) {
        console.error('Error checking Stripe account:', checkError);
      } else {
        console.log('Account check result:', checkResult);
      }
      
      toast.success("Stripe account status updated!");
      fetchStripeStatus();
    } catch (error) {
      console.error('Error updating Stripe status:', error);
    }
  };

  const fetchStripeStatus = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_status')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setStripeAccountId(data.stripe_account_id || "");
        // Map onboarding status to our component status
        const status = data.stripe_onboarding_status;
        if (status === 'connected' || status === 'complete') {
          setStripeStatus('connected');
        } else if (status === 'pending' || data.stripe_account_id) {
          setStripeStatus('pending');
        } else {
          setStripeStatus('not_started');
        }
      }
    } catch (error) {
      console.error('Error fetching Stripe status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!user?.id) {
      toast.error("Please log in to connect Stripe");
      return;
    }

    setConnecting(true);
    try {
      console.log('Connecting Stripe for user:', user.id);
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { userId: user.id }
      });

      if (error) throw error;
      
      // Check if the edge function returned an error
      if (data?.success === false) {
        throw new Error(data.error || 'Failed to connect Stripe');
      }
      
      if (!data?.onboardingUrl) throw new Error('Failed to get Stripe onboarding URL');

      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
      
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      toast.error(error.message || "Failed to connect Stripe");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectStripe = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          stripe_account_id: null,
          stripe_onboarding_status: 'not_started'
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      setStripeAccountId("");
      setStripeStatus('not_started');
      toast.success("Stripe disconnected");
    } catch (error) {
      console.error('Error disconnecting Stripe:', error);
      toast.error("Failed to disconnect Stripe");
    }
  };

  if (loading || authLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to manage payment settings.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Stripe Payment Settings</h3>
          <p className="text-sm text-muted-foreground">
            Connect your Stripe account to accept credit card payments. You'll receive 95% of each sale.
          </p>
        </div>
      </div>

      {/* Status Alert */}
      {stripeStatus === 'not_started' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Connect your Stripe account to start selling products and receiving payments.
          </AlertDescription>
        </Alert>
      )}

      {stripeStatus === 'pending' && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-600">
            Stripe account created but onboarding not complete. Please complete the setup process.
          </AlertDescription>
        </Alert>
      )}

      {stripeStatus === 'connected' && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Stripe account connected! You can now accept credit card payments.
          </AlertDescription>
        </Alert>
      )}

      {/* Connected Account Info */}
      {stripeStatus === 'connected' && stripeAccountId && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Account ID:</span>
            <span className="font-mono text-xs">{stripeAccountId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commission:</span>
            <span className="font-medium">5% platform fee</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">You receive:</span>
            <span className="font-medium text-green-600">95% of each sale</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {stripeStatus === 'not_started' && (
          <Button
            onClick={handleConnectStripe}
            disabled={connecting}
            className="flex-1"
          >
            {connecting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Connect Stripe Account
              </>
            )}
          </Button>
        )}

        {stripeStatus === 'pending' && (
          <>
            <Button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="flex-1"
            >
              {connecting ? "Connecting..." : "Complete Setup"}
            </Button>
            <Button
              onClick={fetchStripeStatus}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </>
        )}

        {stripeStatus === 'connected' && (
          <Button
            variant="destructive"
            onClick={handleDisconnectStripe}
          >
            Disconnect Stripe
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Payments are processed securely via Stripe</p>
        <p>• 5% platform fee is automatically deducted</p>
        <p>• You receive 95% directly to your Stripe account</p>
        <p>• Funds are transferred automatically</p>
      </div>
    </Card>
  );
}
