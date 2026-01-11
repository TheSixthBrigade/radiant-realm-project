// Settings for About and TOS pages

export interface AboutPageSettings {
  // Header
  title: string;
  subtitle: string;
  showHeader: boolean;
  
  // Content
  content: string;
  
  // Team Section
  showTeam: boolean;
  teamTitle: string;
  teamMembers: Array<{
    name: string;
    role: string;
    avatar: string;
    bio: string;
  }>;
  
  // Mission Section
  showMission: boolean;
  missionTitle: string;
  missionContent: string;
  
  // Colors & Styling
  accentColor: string;
  backgroundColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  cardBackgroundColor: string;
  cardBorderRadius: number;
  cardOpacity: number;
  
  // Background
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundGradientStart: string;
  backgroundGradientEnd: string;
  backgroundImage: string;
  backgroundOverlayOpacity: number;
}

export interface TosPageSettings {
  // Header
  title: string;
  subtitle: string;
  showHeader: boolean;
  lastUpdated: string;
  
  // Content Sections
  sections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  
  // Colors & Styling
  accentColor: string;
  backgroundColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  cardBackgroundColor: string;
  cardBorderRadius: number;
  cardOpacity: number;
  
  // Background
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundGradientStart: string;
  backgroundGradientEnd: string;
  backgroundImage: string;
  backgroundOverlayOpacity: number;
}

export const DEFAULT_ABOUT_SETTINGS: AboutPageSettings = {
  title: 'About Us',
  subtitle: 'Learn more about who we are and what we do',
  showHeader: true,
  
  content: 'Welcome to our store! We are passionate about creating high-quality digital products that help you succeed.',
  
  showTeam: false,
  teamTitle: 'Meet the Team',
  teamMembers: [],
  
  showMission: true,
  missionTitle: 'Our Mission',
  missionContent: 'We strive to deliver exceptional digital products and provide outstanding support to our community.',
  
  accentColor: '#14b8a6',
  backgroundColor: '#0f172a',
  textPrimaryColor: '#ffffff',
  textSecondaryColor: '#9ca3af',
  cardBackgroundColor: 'rgba(30, 41, 59, 0.6)',
  cardBorderRadius: 16,
  cardOpacity: 60,
  
  backgroundType: 'gradient',
  backgroundGradientStart: '#0f172a',
  backgroundGradientEnd: '#1e1b4b',
  backgroundImage: '',
  backgroundOverlayOpacity: 50,
};

export const DEFAULT_TOS_SETTINGS: TosPageSettings = {
  title: 'Terms of Service',
  subtitle: 'Please read these terms carefully before using our services',
  showHeader: true,
  lastUpdated: new Date().toISOString().split('T')[0],
  
  sections: [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      content: 'By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.',
    },
    {
      id: 'use-license',
      title: '2. Use License',
      content: 'Permission is granted to temporarily download one copy of the materials (information or software) on this website for personal, non-commercial transitory viewing only.',
    },
    {
      id: 'disclaimer',
      title: '3. Disclaimer',
      content: 'The materials on this website are provided on an "as is" basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.',
    },
    {
      id: 'limitations',
      title: '4. Limitations',
      content: 'In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this website.',
    },
    {
      id: 'revisions',
      title: '5. Revisions and Errata',
      content: 'The materials appearing on this website could include technical, typographical, or photographic errors. We do not warrant that any of the materials on this website are accurate, complete or current.',
    },
  ],
  
  accentColor: '#14b8a6',
  backgroundColor: '#0f172a',
  textPrimaryColor: '#ffffff',
  textSecondaryColor: '#9ca3af',
  cardBackgroundColor: 'rgba(30, 41, 59, 0.6)',
  cardBorderRadius: 16,
  cardOpacity: 60,
  
  backgroundType: 'gradient',
  backgroundGradientStart: '#0f172a',
  backgroundGradientEnd: '#1e1b4b',
  backgroundImage: '',
  backgroundOverlayOpacity: 50,
};
