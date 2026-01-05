import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useOnboardingStatus, validateBusinessProfile } from '@/hooks/useOnboardingStatus';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface BusinessProfileStepProps {
  onComplete: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

const BusinessProfileStep = ({ onComplete, onBack, isSubmitting, setIsSubmitting }: BusinessProfileStepProps) => {
  const { user } = useAuth();
  const { status, saveBusinessProfile } = useOnboardingStatus();
  const { toast } = useToast();
  
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill with existing data
  useEffect(() => {
    if (status) {
      setBusinessName(status.business_name || '');
      setBusinessDescription(status.business_description || '');
      setContactEmail(status.contact_email || user?.email || '');
    } else if (user?.email) {
      setContactEmail(user.email);
    }
  }, [status, user]);

  const handleSubmit = async () => {
    // Validate
    const validation = validateBusinessProfile({
      business_name: businessName,
      business_description: businessDescription,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await saveBusinessProfile({
        business_name: businessName,
        business_description: businessDescription || undefined,
        contact_email: contactEmail || undefined,
      });
      
      toast({
        title: 'Profile Saved',
        description: 'Your business profile has been saved.',
      });
      onComplete();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const descriptionLength = businessDescription.length;
  const descriptionRemaining = 500 - descriptionLength;

  return (
    <div className="space-y-6">
      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="business-name">
          Business / Store Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="business-name"
          placeholder="Enter your business or store name"
          value={businessName}
          onChange={(e) => {
            setBusinessName(e.target.value);
            if (errors.business_name) {
              setErrors(prev => ({ ...prev, business_name: '' }));
            }
          }}
          className={errors.business_name ? 'border-red-500' : ''}
        />
        {errors.business_name && (
          <p className="text-sm text-red-500">{errors.business_name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          This will be displayed on your store page and products
        </p>
      </div>

      {/* Business Description */}
      <div className="space-y-2">
        <Label htmlFor="business-description">
          Business Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="business-description"
          placeholder="Tell buyers about your business, what you sell, and what makes you unique..."
          value={businessDescription}
          onChange={(e) => {
            if (e.target.value.length <= 500) {
              setBusinessDescription(e.target.value);
              if (errors.business_description) {
                setErrors(prev => ({ ...prev, business_description: '' }));
              }
            }
          }}
          className={`min-h-[100px] ${errors.business_description ? 'border-red-500' : ''}`}
        />
        <div className="flex justify-between text-xs">
          {errors.business_description ? (
            <p className="text-red-500">{errors.business_description}</p>
          ) : (
            <span className="text-muted-foreground">A good description helps buyers trust your store</span>
          )}
          <span className={descriptionRemaining < 50 ? 'text-yellow-500' : 'text-muted-foreground'}>
            {descriptionRemaining} characters remaining
          </span>
        </div>
      </div>

      {/* Contact Email */}
      <div className="space-y-2">
        <Label htmlFor="contact-email">
          Contact Email <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="contact-email"
          type="email"
          placeholder="business@example.com"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          For business inquiries. Defaults to your account email if not provided.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-gaming"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default BusinessProfileStep;
