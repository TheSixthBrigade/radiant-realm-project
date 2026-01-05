import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useToast } from '@/components/ui/use-toast';
import { ChevronRight, ExternalLink } from 'lucide-react';

interface TOSStepProps {
  onComplete: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

const TOS_VERSION = '2026-01-05';

const TOSStep = ({ onComplete, isSubmitting, setIsSubmitting }: TOSStepProps) => {
  const [agreed, setAgreed] = useState(false);
  const { agreeTOS } = useOnboardingStatus();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!agreed) {
      toast({
        title: 'Agreement Required',
        description: 'You must agree to the Terms of Service to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await agreeTOS(TOS_VERSION);
      toast({
        title: 'Terms Accepted',
        description: 'Thank you for accepting our Terms of Service.',
      });
      onComplete();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your agreement. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOS Summary */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
        <h3 className="font-semibold">Key Points</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>You must be at least 18 years old to sell on Vectabase</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>You are responsible for the content you sell and must have rights to distribute it</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Vectabase takes a platform fee on each sale (see pricing page for details)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>All moderation decisions are at Vectabase's sole discretion</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>You agree to comply with all applicable laws and regulations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Payouts are processed through Stripe Connect to your connected account</span>
          </li>
        </ul>
      </div>

      {/* Full TOS Link */}
      <div className="flex items-center gap-2 text-sm">
        <Link 
          to="/tos" 
          target="_blank" 
          className="text-primary hover:underline flex items-center gap-1"
        >
          Read the full Terms of Service
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Agreement Checkbox */}
      <div className="flex items-start space-x-3 p-4 border rounded-lg border-primary/30 bg-primary/5">
        <Checkbox
          id="tos-agreement"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="tos-agreement" className="text-sm leading-relaxed cursor-pointer">
          I have read and agree to the{' '}
          <Link to="/tos" target="_blank" className="text-primary hover:underline font-medium">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link to="/privacy" target="_blank" className="text-primary hover:underline font-medium">
            Privacy Policy
          </Link>
          . I understand that all moderation decisions are at Vectabase's sole discretion.
        </Label>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!agreed || isSubmitting}
          className="btn-gaming"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default TOSStep;
