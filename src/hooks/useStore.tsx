import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Store {
  id: string;
  owner_id: string;
  store_name: string;
  store_slug: string;
  store_description: string;
  is_public: boolean;
  custom_domain: string;
  stripe_connect_account_id: string;
  paypal_email: string;
  store_logo: string;
  store_banner: string;
  theme_colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  layout_settings: any;
  created_at: string;
  updated_at: string;
}

export const useStore = () => {
  const { user } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStore = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (storeError) {
        if (storeError.code === 'PGRST116') {
          // No store found, create one
          await createStore();
        } else {
          throw storeError;
        }
      } else {
        setStore(data);
      }
    } catch (err) {
      console.error('Error fetching store:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch store');
    } finally {
      setLoading(false);
    }
  };

  const createStore = async () => {
    if (!user) return;

    try {
      // Get user profile for store name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const storeName = profile?.display_name ? `${profile.display_name}'s Store` : 'My Store';
      const storeSlug = generateSlug(storeName);

      const { data, error } = await supabase
        .from('stores')
        .insert({
          owner_id: user.id,
          store_name: storeName,
          store_slug: storeSlug,
          store_description: 'Welcome to my digital store!',
          is_public: true,
          theme_colors: {
            primary: '#3b82f6',
            secondary: '#1e40af',
            accent: '#f59e0b'
          }
        })
        .select()
        .single();

      if (error) throw error;
      
      setStore(data);
      toast.success('Store created successfully!');
    } catch (err) {
      console.error('Error creating store:', err);
      toast.error('Failed to create store');
    }
  };

  const updateStore = async (updates: Partial<Store>) => {
    if (!store) return { success: false, error: 'No store found' };

    try {
      const { data, error } = await supabase
        .from('stores')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', store.id)
        .select()
        .single();

      if (error) throw error;

      setStore(data);
      return { success: true, error: null };
    } catch (err) {
      console.error('Error updating store:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update store' 
      };
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);
  };

  useEffect(() => {
    fetchStore();
  }, [user]);

  return {
    store,
    loading,
    error,
    updateStore,
    refetch: fetchStore,
    createStore
  };
};