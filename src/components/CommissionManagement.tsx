import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  DollarSign, 
  Search, 
  Edit, 
  Trash2,
  Store,
  Calendar,
  Percent
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CommissionManagement = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    custom_rate: "5.00",
    is_permanent: false,
    duration_days: "30",
    reason: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all creators (users who sell products)
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_creator', true)
        .order('created_at', { ascending: false });

      if (creatorsError) throw creatorsError;

      // Fetch all commission overrides (using user_id as store_id for now)
      const { data: overridesData, error: overridesError } = await supabase
        .from('commission_overrides')
        .select('*')
        .then(result => {
          // Handle case where table doesn't exist yet
          if (result.error?.code === '42P01') {
            console.log('Commission overrides table not created yet');
            return { data: [], error: null };
          }
          return result;
        });

      setStores(creatorsData || []);
      setOverrides(overridesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load creators');
    } finally {
      setLoading(false);
    }
  };

  const getCreatorCommission = (creatorId: string) => {
    const override = overrides.find(o => o.store_id === creatorId);
    if (!override) return { rate: 5.00, isDefault: true };

    // Check if expired
    if (!override.is_permanent && override.expires_at) {
      const expiresAt = new Date(override.expires_at);
      if (expiresAt < new Date()) {
        return { rate: 5.00, isDefault: true, expired: true };
      }
    }

    return { 
      rate: override.custom_rate, 
      isDefault: false,
      isPermanent: override.is_permanent,
      expiresAt: override.expires_at,
      reason: override.reason
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingStoreId) {
      toast.error('Please select a store');
      return;
    }

    const rate = parseFloat(formData.custom_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Commission rate must be between 0 and 100');
      return;
    }

    try {
      const expiresAt = formData.is_permanent 
        ? null 
        : new Date(Date.now() + parseInt(formData.duration_days) * 24 * 60 * 60 * 1000).toISOString();

      // Check if override exists
      const existingOverride = overrides.find(o => o.store_id === editingStoreId);

      if (existingOverride) {
        // Update existing
        const { error } = await supabase
          .from('commission_overrides')
          .update({
            custom_rate: rate,
            is_permanent: formData.is_permanent,
            expires_at: expiresAt,
            reason: formData.reason,
            updated_at: new Date().toISOString()
          })
          .eq('store_id', editingStoreId);

        if (error) throw error;
        toast.success('Commission rate updated!');
      } else {
        // Create new
        const { error } = await supabase
          .from('commission_overrides')
          .insert({
            store_id: editingStoreId,
            custom_rate: rate,
            default_rate: 5.00,
            is_permanent: formData.is_permanent,
            expires_at: expiresAt,
            reason: formData.reason
          });

        if (error) throw error;
        toast.success('Commission rate set!');
      }

      setFormData({ custom_rate: "5.00", is_permanent: false, duration_days: "30", reason: "" });
      setShowForm(false);
      setEditingStoreId(null);
      fetchData();
    } catch (error) {
      console.error('Error saving commission:', error);
      toast.error('Failed to save commission rate');
    }
  };

  const handleEdit = (creator: any) => {
    const commission = getCreatorCommission(creator.user_id);
    
    if (!commission.isDefault) {
      setFormData({
        custom_rate: commission.rate.toString(),
        is_permanent: commission.isPermanent || false,
        duration_days: "30",
        reason: commission.reason || ""
      });
    } else {
      setFormData({ custom_rate: "5.00", is_permanent: false, duration_days: "30", reason: "" });
    }
    
    setEditingStoreId(creator.user_id);
    setShowForm(true);
  };

  const handleDelete = async (storeId: string) => {
    if (!confirm('Are you sure you want to remove this commission override?')) return;

    try {
      const { error } = await supabase
        .from('commission_overrides')
        .delete()
        .eq('store_id', storeId);

      if (error) throw error;
      toast.success('Commission override removed');
      fetchData();
    } catch (error) {
      console.error('Error deleting override:', error);
      toast.error('Failed to remove override');
    }
  };

  const filteredStores = stores.filter(creator => 
    creator.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    creator.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Commission Management</h2>
        </div>
        <Badge variant="secondary">{stores.length} Creators</Badge>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Percent className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Default Commission: 5%</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              All stores pay 5% commission by default. You can set custom rates for specific stores below.
            </p>
          </div>
        </div>
      </Card>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search creators by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Form */}
      {showForm && editingStoreId && (
        <Card className="p-6 border-primary">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Set Commission Rate for {stores.find(s => s.user_id === editingStoreId)?.display_name}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setEditingStoreId(null);
                  setFormData({ custom_rate: "5.00", is_permanent: false, duration_days: "30", reason: "" });
                }}
              >
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custom_rate">Commission Rate (%)</Label>
                <Input
                  id="custom_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.custom_rate}
                  onChange={(e) => setFormData({ ...formData, custom_rate: e.target.value })}
                  placeholder="5.00"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default is 5%. Set to 0 for no commission.
                </p>
              </div>

              <div>
                <Label htmlFor="duration_days">Duration (Days)</Label>
                <Input
                  id="duration_days"
                  type="number"
                  min="1"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  disabled={formData.is_permanent}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How long this rate should last
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_permanent"
                checked={formData.is_permanent}
                onCheckedChange={(checked) => setFormData({ ...formData, is_permanent: checked })}
              />
              <Label htmlFor="is_permanent" className="cursor-pointer">
                Make this rate permanent
              </Label>
            </div>

            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Special partnership, promotional period, etc."
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full">
              Save Commission Rate
            </Button>
          </form>
        </Card>
      )}

      {/* Stores List */}
      <div className="space-y-3">
        {filteredStores.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No creators found</p>
          </Card>
        ) : (
          filteredStores.map((creator) => {
            const commission = getCreatorCommission(creator.user_id);
            const hasOverride = !commission.isDefault;

            return (
              <Card key={creator.user_id} className={`p-4 ${hasOverride ? 'border-primary' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Creator Avatar */}
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-6 h-6 text-primary" />
                    )}
                  </div>

                  {/* Creator Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{creator.display_name || 'Unnamed Creator'}</h3>
                      <Badge variant="outline" className="text-xs">
                        Creator
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <span>ID: {creator.user_id.substring(0, 8)}...</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Percent className="w-3 h-3" />
                        <span className={`font-semibold ${hasOverride ? 'text-primary' : ''}`}>
                          Commission: {commission.rate}%
                        </span>
                        {hasOverride && (
                          <>
                            {commission.isPermanent ? (
                              <Badge variant="default" className="text-xs">Permanent</Badge>
                            ) : commission.expiresAt && (
                              <Badge variant="secondary" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                Expires {new Date(commission.expiresAt).toLocaleDateString()}
                              </Badge>
                            )}
                          </>
                        )}
                        {commission.expired && (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        )}
                      </div>

                      {commission.reason && (
                        <p className="text-xs text-muted-foreground italic">
                          Reason: {commission.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(creator)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    {hasOverride && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(creator.user_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CommissionManagement;
