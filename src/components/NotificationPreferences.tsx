import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, Mail, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationPref {
  id: string;
  product_id: string;
  email_enabled: boolean;
  product?: { title: string; image_url?: string };
}

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchPrefs();
  }, [user]);

  const fetchPrefs = async () => {
    try {
      const { data } = await (supabase as any)
        .from('notification_preferences')
        .select('*, product:products(title, image_url)')
        .eq('user_id', user?.id);
      setPrefs(data || []);
    } catch (e) {
      console.error('Error fetching preferences:', e);
    }
    setLoading(false);
  };

  const togglePref = async (prefId: string, currentState: boolean) => {
    setUpdating(prefId);
    try {
      await (supabase as any)
        .from('notification_preferences')
        .update({ email_enabled: !currentState })
        .eq('id', prefId);
      toast.success(currentState ? 'Notifications disabled' : 'Notifications enabled');
      fetchPrefs();
    } catch (e) {
      toast.error('Failed to update');
    }
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-purple-500" />
        <h2 className="text-2xl font-bold text-white">Notification Preferences</h2>
      </div>

      <p className="text-gray-400">
        Manage email notifications for products you've purchased.
      </p>

      {prefs.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border bg-slate-800/30 border-white/10">
          <Mail className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">No notification preferences yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Purchase products to receive update notifications
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {prefs.map(pref => (
            <div
              key={pref.id}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-purple-500/30"
            >
              <div className="flex items-center gap-3">
                {pref.product?.image_url ? (
                  <img
                    src={pref.product.image_url}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-purple-400" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium">{pref.product?.title || 'Unknown Product'}</p>
                  <p className="text-sm text-gray-400">
                    {pref.email_enabled ? 'Receiving update emails' : 'Emails disabled'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => togglePref(pref.id, pref.email_enabled)}
                disabled={updating === pref.id}
                className="p-1"
              >
                {updating === pref.id ? (
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                ) : pref.email_enabled ? (
                  <ToggleRight className="w-10 h-10 text-green-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationPreferences;
