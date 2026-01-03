import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, User, Building, Users, Briefcase, Camera, Crown, ExternalLink, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileData {
  displayName: string;
  bio: string;
  avatarUrl: string;
  creatorType: string;
  businessName: string;
  websiteUrl: string;
  isCreator: boolean;
  socialLinks: {
    twitter?: string;
    discord?: string;
    youtube?: string;
  };
}

const ProfileSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProfileData>({
    displayName: '',
    bio: '',
    avatarUrl: '',
    creatorType: 'independent',
    businessName: '',
    websiteUrl: '',
    isCreator: false,
    socialLinks: {},
  });
  
  const [paymentStatus, setPaymentStatus] = useState({
    hasStripe: false,
    canSell: false
  });

  const creatorTypes = [
    { value: 'independent', label: 'Independent Creator', icon: User },
    { value: 'business', label: 'Business', icon: Briefcase },
    { value: 'corporation', label: 'Corporation', icon: Building },
    { value: 'group', label: 'Group', icon: Users },
    { value: 'team', label: 'Team', icon: Users },
    { value: 'studio', label: 'Studio', icon: Building },
  ];

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, paypal_email, paypal_onboarding_status, stripe_account_id, stripe_onboarding_status')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (profile) {
        // Check payment method status
        const hasStripe = profile.stripe_account_id && (profile.stripe_onboarding_status === 'connected' || profile.stripe_onboarding_status === 'complete');
        const canSell = hasStripe;
        
        setPaymentStatus({
          hasStripe,
          canSell
        });

        setData({
          displayName: profile.display_name || '',
          bio: profile.bio || '',
          avatarUrl: profile.avatar_url || '',
          creatorType: 'independent',
          businessName: '',
          websiteUrl: '',
          isCreator: profile.is_creator || false,
          socialLinks: {},
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

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
        setData(prev => ({ ...prev, avatarUrl: url }));
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

  const handleBecomeCreator = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_creator: true })
        .eq('user_id', user?.id);

      if (error) throw error;

      setData(prev => ({ ...prev, isCreator: true }));
      toast.success('Welcome to the creator program! Complete your profile to start selling.');
      
      // Refresh the page to trigger onboarding
      window.location.reload();
    } catch (error) {
      console.error('Error becoming creator:', error);
      toast.error('Failed to upgrade to creator status');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving profile data...');

      const updateData = {
        user_id: user?.id,
        display_name: data.displayName || '',
        bio: data.bio || '',
        avatar_url: data.avatarUrl || '',
        is_creator: data.isCreator,
      };

      console.log('Update data:', updateData);

      const { error } = await supabase
        .from('profiles')
        .upsert(updateData, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Profile saved successfully!');
      toast.success('Profile updated successfully!');
      
      await fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(`Failed to save changes: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your profile information and creator status</p>
      </div>

      {/* Creator Status */}
      {!data.isCreator && (
        <Card className="p-6 border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Become a Creator
              </h3>
              <p className="text-muted-foreground">
                Start selling your digital assets and earn money from your creations
              </p>
            </div>
            <Button onClick={handleBecomeCreator} disabled={saving}>
              {saving ? 'Processing...' : 'Upgrade Now'}
            </Button>
          </div>
        </Card>
      )}

      {/* Profile Picture */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            {data.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
                <Camera className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div>
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
              {uploading ? 'Uploading...' : 'Change Picture'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              PNG, JPG up to 5MB
            </p>
          </div>
        </div>
      </Card>

      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={data.displayName}
              onChange={(e) => setData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Your name or brand name"
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={data.bio}
              onChange={(e) => setData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell people about yourself..."
              rows={4}
            />
          </div>
        </div>
      </Card>

      {/* Creator Settings */}
      {data.isCreator && (
        <>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Creator Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="creatorType">Creator Type</Label>
                <Select value={data.creatorType} onValueChange={(value) => setData(prev => ({ ...prev, creatorType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {creatorTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  value={data.websiteUrl}
                  onChange={(e) => setData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Settings</h3>
            <div className="space-y-4">
              {!paymentStatus.canSell ? (
                // Show requirement when Stripe is not connected
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Required to Sell Products
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    Connect your Stripe account to receive payments from customers.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      const stripeSection = document.getElementById('stripe-settings-section');
                      if (stripeSection) {
                        stripeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        stripeSection.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                        setTimeout(() => {
                          stripeSection.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                        }, 2000);
                      }
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Configure Stripe Below
                  </Button>
                </div>
              ) : (
                // Show success when Stripe is connected
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    ✅ Ready to Sell Products
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                    Your Stripe account is connected and you can sell products.
                  </p>
                  <div className="text-xs text-green-700 dark:text-green-300">
                    <span>• Stripe connected - accepting card payments</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Social Links</h3>
            <div className="space-y-4">
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
          </Card>
        </>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default ProfileSettings;