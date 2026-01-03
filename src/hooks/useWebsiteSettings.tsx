import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebsiteSettings {
  hero_title: string;
  hero_subtitle: string;
  site_logo: string;
  primary_color: string;
  secondary_color: string;
  featured_product_ids: string[];
  footer_content: string;
}

export const useWebsiteSettings = () => {
  const [settings, setSettings] = useState<WebsiteSettings>({
    hero_title: "Premium Digital Assets for Roblox Developers",
    hero_subtitle: "Discover high-quality game assets, scripts, and 3D models from talented creators worldwide. Build your dream game with confidence.",
    site_logo: "/Logo_pic.png",
    primary_color: "#22c55e",
    secondary_color: "#16a34a",
    featured_product_ids: [],
    footer_content: "© 2024 Vectabse. All rights reserved.",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Try to load from localStorage first
      const savedSettings = localStorage.getItem('website_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      }
      
      // In the future, we can try to fetch from database here
      // For now, just use defaults + localStorage
      
    } catch (err) {
      console.error('Error fetching website settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof WebsiteSettings, value: any) => {
    try {
      // For now, just update local state since the table might not exist
      setSettings(prev => ({ ...prev, [key]: value }));
      
      // Try to save to localStorage as backup
      const currentSettings = JSON.parse(localStorage.getItem('website_settings') || '{}');
      currentSettings[key] = value;
      localStorage.setItem('website_settings', JSON.stringify(currentSettings));
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error updating setting:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update setting' };
    }
  };

  const updateMultipleSettings = async (updates: Partial<WebsiteSettings>) => {
    try {
      // Update local state
      setSettings(prev => ({ ...prev, ...updates }));
      
      // Try to save to localStorage as backup
      const currentSettings = JSON.parse(localStorage.getItem('website_settings') || '{}');
      Object.assign(currentSettings, updates);
      localStorage.setItem('website_settings', JSON.stringify(currentSettings));
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error updating settings:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update settings' };
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    updateSetting,
    updateMultipleSettings,
    refetch: fetchSettings,
  };
};