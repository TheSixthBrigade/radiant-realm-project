export interface CommunitySettings {
  // Theme
  accentColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  cardBorderColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  
  // Card styling
  cardOpacity: number;
  cardBorderRadius: number;
  cardGlow: boolean;
  glowIntensity: number;
  
  // Layout
  title: string;
  subtitle: string;
  showHeader: boolean;
  
  // Background
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundGradientStart: string;
  backgroundGradientEnd: string;
  backgroundImage: string;
  backgroundOverlayOpacity: number;
}

export const DEFAULT_COMMUNITY_SETTINGS: CommunitySettings = {
  accentColor: '#14b8a6',
  backgroundColor: '#0f172a',
  cardBackgroundColor: 'rgba(30, 41, 59, 0.4)',
  cardBorderColor: 'rgba(255, 255, 255, 0.08)',
  textPrimaryColor: '#ffffff',
  textSecondaryColor: '#9ca3af',
  
  cardOpacity: 40,
  cardBorderRadius: 12,
  cardGlow: false,
  glowIntensity: 50,
  
  title: 'Community Forum',
  subtitle: 'Join the conversation with the community',
  showHeader: true,
  
  backgroundType: 'gradient',
  backgroundGradientStart: '#0f172a',
  backgroundGradientEnd: '#1e1b4b',
  backgroundImage: '',
  backgroundOverlayOpacity: 50,
};
