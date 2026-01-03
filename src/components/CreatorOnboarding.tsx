import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, User, Building, Users, Briefcase, Camera, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingData {
  step: number;
  profilePicture: string | null;
  creatorType: string;
  displayName: string;
  businessName: string;
  bio: string;
  websiteUrl: string;
  socialLinks: {
    twitter?: string;
    discord?: string;
    youtube?: string;
  };
}

const CreatorOnboarding = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    step: 1,
    profilePicture: null,
    creatorType: '',
    displayName: '',
    businessName: '',
    bio: '',
    websiteUrl: '',
    socialLinks: {},
  });

  const creatorTypes = [
    {
      value: 'independent',
      label: 'Independent Creator',
      description: 'Solo developer or artist',
      icon: User,
    },
    {
      value: 'business',
      label: 'Business',
      description: 'Small to medium business',
      icon: Briefcase,
    },
    {
      value: 'corporation',
      label: 'Corporation',
      description: 'Large company or enterprise',
      icon: Building,
    },
    {
      value: 'group',
      label: 'Group',
      description: 'Informal group of creators',
      icon: Users,
    },
    {
      value: 'team',
      label: 'Team',
      description: 'Organized development team',
      icon: Users,
    },
    {
      value: 'studio',
      label: 'Studio',
      description: 'Game development studio',
      icon: Building,
    },
  ];

  const uploadProfilePicture = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `profile-${user?.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadProfilePicture(file);
      if (url) {
        setData(prev => ({ ...prev, profilePicture: url }));
        toast.success('Profile picture uploaded successfully!');
      } else {
        toast.error('Failed to upload profile picture');
      }
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && !data.profilePicture) {
      toast.error('Please upload a profile picture to continue');
      return;
    }
    
    if (currentStep === 2 && !data.creatorType) {
      toast.error('Please select your creator type');
      return;
    }

    if (currentStep === 3 && !data.displayName.trim()) {
      toast.error('Please enter your display name');
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: data.displayName,
          avatar_url: data.profilePicture,
          bio: data.bio,
          creator_type: data.creatorType,
          business_name: data.businessName || null,
          website_url: data.websiteUrl || null,
          social_links: data.socialLinks,
          profile_completed: true,
          is_creator: true,
        })
        .eq('user_id', user?.id);

      if (profileError) throw profileError;

      // Update onboarding status
      const { error: onboardingError } = await supabase
        .from('creator_onboarding')
        .upsert({
          user_id: user?.id,
          step: 4,
          profile_picture_uploaded: true,
          creator_type_selected: true,
          business_info_completed: true,
          completed_at: new Date().toISOString(),
        });

      if (onboardingError) throw onboardingError;

      toast.success('Creator profile completed successfully!');
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Upload Your Profile Picture</h2>
              <p className="text-muted-foreground">
                A professional profile picture helps build trust with customers
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              {data.profilePicture ? (
                <div className="relative">
                  <img
                    src={data.profilePicture}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
              )}

              <div className="text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="profile-upload"
                />
                <Button
                  onClick={() => document.getElementById('profile-upload')?.click()}
                  disabled={uploading}
                  variant="outline"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? 'Uploading...' : 'Choose Image'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG up to 5MB
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choose Your Creator Type</h2>
              <p className="text-muted-foreground">
                This helps us customize your experience and show the right information to customers
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creatorTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                      data.creatorType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setData(prev => ({ ...prev, creatorType: type.value }))}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        data.creatorType === type.value ? 'bg-primary text-white' : 'bg-muted'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{type.label}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
              <p className="text-muted-foreground">
                Tell us about yourself and your work
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={data.displayName}
                  onChange={(e) => setData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Your name or brand name"
                />
              </div>

              {(data.creatorType === 'business' || data.creatorType === 'corporation' || data.creatorType === 'studio') && (
                <div>
                  <Label htmlFor="businessName">Business/Company Name</Label>
                  <Input
                    id="businessName"
                    value={data.businessName}
                    onChange={(e) => setData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Official business name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={data.bio}
                  onChange={(e) => setData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell customers about your experience and what you create..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Social Links (Optional)</h2>
              <p className="text-muted-foreground">
                Help customers connect with you and build trust
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  value={data.websiteUrl}
                  onChange={(e) => setData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div>
                <Label htmlFor="twitter">Twitter/X Username</Label>
                <Input
                  id="twitter"
                  value={data.socialLinks.twitter || ''}
                  onChange={(e) => setData(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                  }))}
                  placeholder="@yourusername"
                />
              </div>

              <div>
                <Label htmlFor="discord">Discord Server</Label>
                <Input
                  id="discord"
                  value={data.socialLinks.discord || ''}
                  onChange={(e) => setData(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, discord: e.target.value }
                  }))}
                  placeholder="Discord server invite link"
                />
              </div>

              <div>
                <Label htmlFor="youtube">YouTube Channel</Label>
                <Input
                  id="youtube"
                  value={data.socialLinks.youtube || ''}
                  onChange={(e) => setData(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, youtube: e.target.value }
                  }))}
                  placeholder="YouTube channel URL"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl p-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  step < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            {currentStep === 4 ? 'Complete Setup' : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CreatorOnboarding;