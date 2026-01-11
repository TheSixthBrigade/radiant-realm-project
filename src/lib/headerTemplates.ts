import { HeaderConfig, NavLink } from '@/components/SiteHeader';

export interface HeaderTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // CSS gradient for preview
  config: Partial<HeaderConfig>;
}

// Extended HeaderConfig with all new styling options
export interface ExtendedHeaderConfig extends HeaderConfig {
  // Template selection
  templateId?: string;
  
  // Button styling
  buttonBorderRadius: number; // 0-50
  buttonPadding: 'compact' | 'normal' | 'relaxed' | 'spacious';
  hoverEffect: 'none' | 'glow' | 'lift' | 'scale' | 'color-shift';
  
  // Layout
  logoPosition: 'left' | 'center' | 'right';
  headerHeight: 'compact' | 'normal' | 'tall' | 'extra-tall';
  layoutMode: 'full-width' | 'contained';
  headerLayout: 'full' | 'floating-nav' | 'minimal';
  
  // Visual effects
  backgroundEffect: 'solid' | 'gradient' | 'glassmorphism' | 'blur';
  gradientColors?: [string, string];
  gradientDirection?: string;
  animatedGradient?: boolean;
  animationSpeed?: 'slow' | 'normal' | 'fast';
  
  // Borders and shadows
  borderStyle: 'none' | 'solid' | 'gradient' | 'glow';
  borderColor?: string;
  shadowStyle: 'none' | 'subtle' | 'medium' | 'strong' | 'colored';
  shadowColor?: string;
  
  // Typography
  fontWeight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  fontSize: 'small' | 'normal' | 'medium' | 'large';
  letterSpacing: 'tight' | 'normal' | 'wide' | 'extra-wide';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  
  // Icons
  iconPosition: 'before' | 'after' | 'only';
  iconSize: 'small' | 'normal' | 'medium' | 'large';
  
  // Mobile
  mobileMenuStyle: 'slide-in' | 'dropdown' | 'fullscreen';
  
  // Scroll effects
  scrollEffect: 'none' | 'fade-in' | 'blur-in' | 'slide-down';
  
  // Hide logo
  hideLogo: boolean;
}

export const HEADER_TEMPLATES: HeaderTemplate[] = [
  // === FLOATING NAV STYLES (No background, just nav pill) ===
  {
    id: 'floating-clean',
    name: 'Floating Clean',
    description: 'Just the nav pill, no header background',
    preview: 'linear-gradient(135deg, transparent 50%, #1e293b 50%)',
    config: {
      headerLayout: 'floating-nav',
      navStyle: 'pills',
      navBackgroundColor: '#1e293b',
      navBorderColor: '#334155',
      textColor: '#ffffff',
      accentColor: '#14b8a6',
      pillBorderRadius: 24,
      navPosition: 'center',
      showIcons: true,
      hideLogo: true,
    }
  },
  {
    id: 'floating-glass',
    name: 'Floating Glass',
    description: 'Glassmorphism nav pill floating',
    preview: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%)',
    config: {
      headerLayout: 'floating-nav',
      navStyle: 'pills',
      navBackgroundColor: 'rgba(255,255,255,0.1)',
      navBorderColor: 'rgba(255,255,255,0.2)',
      textColor: '#ffffff',
      accentColor: '#8b5cf6',
      pillBorderRadius: 20,
      navPosition: 'center',
      showIcons: true,
      hideLogo: true,
    }
  },
  {
    id: 'floating-neon',
    name: 'Floating Neon',
    description: 'Glowing neon nav pill',
    preview: 'linear-gradient(135deg, transparent 50%, #0a0a1a 50%)',
    config: {
      headerLayout: 'floating-nav',
      navStyle: 'outlined',
      navBackgroundColor: 'rgba(0,255,136,0.1)',
      navBorderColor: '#00ff88',
      textColor: '#ffffff',
      accentColor: '#00ff88',
      pillBorderRadius: 16,
      navPosition: 'center',
      showIcons: true,
      hideLogo: true,
    }
  },
  {
    id: 'floating-dark',
    name: 'Floating Dark',
    description: 'Dark floating nav with subtle border',
    preview: 'linear-gradient(135deg, transparent 50%, #0c0c0c 50%)',
    config: {
      headerLayout: 'floating-nav',
      navStyle: 'pills',
      navBackgroundColor: '#0c0c0c',
      navBorderColor: '#262626',
      textColor: '#fafafa',
      accentColor: '#f97316',
      pillBorderRadius: 12,
      navPosition: 'center',
      showIcons: true,
      hideLogo: true,
    }
  },

  // === MINIMAL STYLES (Transparent until scroll) ===
  {
    id: 'minimal-fade',
    name: 'Minimal Fade',
    description: 'Fades in on scroll',
    preview: 'linear-gradient(180deg, transparent, #0f172a)',
    config: {
      headerLayout: 'minimal',
      scrollEffect: 'fade-in',
      navStyle: 'pills',
      backgroundColor: '#0f172a',
      navBackgroundColor: '#1e293b',
      navBorderColor: '#334155',
      textColor: '#ffffff',
      accentColor: '#14b8a6',
      pillBorderRadius: 24,
    }
  },
  {
    id: 'minimal-blur',
    name: 'Minimal Blur',
    description: 'Blur effect on scroll',
    preview: 'linear-gradient(180deg, transparent, rgba(15,23,42,0.8))',
    config: {
      headerLayout: 'minimal',
      scrollEffect: 'blur-in',
      navStyle: 'pills',
      backgroundColor: 'rgba(15,23,42,0.9)',
      navBackgroundColor: 'rgba(30,41,59,0.8)',
      navBorderColor: 'rgba(51,65,85,0.5)',
      textColor: '#ffffff',
      accentColor: '#06b6d4',
      pillBorderRadius: 20,
    }
  },

  // === FULL HEADER STYLES ===
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple with subtle styling',
    preview: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    config: {
      headerLayout: 'full',
      navStyle: 'default',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      isTransparent: false,
      navPosition: 'right',
      showIcons: false,
      pillBorderRadius: 8,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary design with pill navigation',
    preview: 'linear-gradient(135deg, #1e293b, #334155)',
    config: {
      headerLayout: 'full',
      navStyle: 'pills',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      navBackgroundColor: '#1e293b',
      navBorderColor: '#334155',
      pillBorderRadius: 24,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass effect with blur',
    preview: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
    config: {
      headerLayout: 'full',
      navStyle: 'pills',
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      textColor: '#ffffff',
      isTransparent: true,
      navBackgroundColor: 'rgba(255,255,255,0.1)',
      navBorderColor: 'rgba(255,255,255,0.2)',
      pillBorderRadius: 16,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Vibrant glow effects and bold colors',
    preview: 'linear-gradient(135deg, #0f0f23, #1a1a3e)',
    config: {
      headerLayout: 'full',
      navStyle: 'outlined',
      backgroundColor: '#0a0a1a',
      textColor: '#ffffff',
      accentColor: '#00ff88',
      navBackgroundColor: 'transparent',
      navBorderColor: '#00ff88',
      pillBorderRadius: 8,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'relaxed',
      headerPadding: 'medium',
    }
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional and business-focused',
    preview: 'linear-gradient(135deg, #1e3a5f, #2d5a87)',
    config: {
      headerLayout: 'full',
      navStyle: 'underline',
      backgroundColor: '#1e3a5f',
      textColor: '#ffffff',
      accentColor: '#60a5fa',
      navPosition: 'right',
      showIcons: false,
      pillBorderRadius: 0,
      navSpacing: 'relaxed',
      headerPadding: 'large',
    }
  },
  {
    id: 'gaming',
    name: 'Gaming',
    description: 'Bold and energetic with gradients',
    preview: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    config: {
      headerLayout: 'full',
      navStyle: 'gradient',
      backgroundColor: '#18181b',
      textColor: '#ffffff',
      accentColor: '#8b5cf6',
      navBackgroundColor: '#27272a',
      pillBorderRadius: 12,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Sophisticated with refined typography',
    preview: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
    config: {
      headerLayout: 'full',
      navStyle: 'ghost',
      backgroundColor: '#1a1a1a',
      textColor: '#e5e5e5',
      accentColor: '#d4af37',
      navPosition: 'center',
      showIcons: false,
      pillBorderRadius: 4,
      navSpacing: 'relaxed',
      headerPadding: 'large',
    }
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Strong presence with thick buttons',
    preview: 'linear-gradient(135deg, #dc2626, #ea580c)',
    config: {
      headerLayout: 'full',
      navStyle: 'buttons',
      backgroundColor: '#18181b',
      textColor: '#ffffff',
      accentColor: '#ef4444',
      navBackgroundColor: '#27272a',
      pillBorderRadius: 8,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'dark-luxury',
    name: 'Dark Luxury',
    description: 'Premium dark theme with gold accents',
    preview: 'linear-gradient(135deg, #0c0c0c, #1a1a1a)',
    config: {
      headerLayout: 'full',
      navStyle: 'ghost',
      backgroundColor: '#0c0c0c',
      textColor: '#fafafa',
      accentColor: '#d4af37',
      navPosition: 'center',
      showIcons: false,
      pillBorderRadius: 0,
      navSpacing: 'relaxed',
      headerPadding: 'large',
    }
  },
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    description: 'Modern tech company aesthetic',
    preview: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
    config: {
      headerLayout: 'full',
      navStyle: 'pills',
      backgroundColor: '#020617',
      textColor: '#ffffff',
      accentColor: '#0ea5e9',
      navBackgroundColor: '#0f172a',
      navBorderColor: '#1e293b',
      pillBorderRadius: 20,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'creative-agency',
    name: 'Creative Agency',
    description: 'Artistic and expressive design',
    preview: 'linear-gradient(135deg, #ec4899, #f97316)',
    config: {
      headerLayout: 'full',
      navStyle: 'underline',
      backgroundColor: '#fafafa',
      textColor: '#18181b',
      accentColor: '#ec4899',
      navPosition: 'right',
      showIcons: false,
      pillBorderRadius: 0,
      navSpacing: 'relaxed',
      headerPadding: 'medium',
    }
  },
  {
    id: 'retro-wave',
    name: 'Retro Wave',
    description: '80s inspired synthwave aesthetic',
    preview: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    config: {
      headerLayout: 'full',
      navStyle: 'pills',
      backgroundColor: '#0f0f1a',
      textColor: '#ffffff',
      accentColor: '#ec4899',
      navBackgroundColor: 'rgba(124, 58, 237, 0.3)',
      navBorderColor: '#7c3aed',
      pillBorderRadius: 24,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Organic and earthy tones',
    preview: 'linear-gradient(135deg, #166534, #15803d)',
    config: {
      headerLayout: 'full',
      navStyle: 'pills',
      backgroundColor: '#14532d',
      textColor: '#ffffff',
      accentColor: '#4ade80',
      navBackgroundColor: '#166534',
      navBorderColor: '#22c55e',
      pillBorderRadius: 16,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep sea blues and teals',
    preview: 'linear-gradient(135deg, #0c4a6e, #0891b2)',
    config: {
      headerLayout: 'full',
      navStyle: 'pills',
      backgroundColor: '#0c4a6e',
      textColor: '#ffffff',
      accentColor: '#22d3ee',
      navBackgroundColor: '#164e63',
      navBorderColor: '#0891b2',
      pillBorderRadius: 20,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange and pink gradients',
    preview: 'linear-gradient(135deg, #f97316, #ec4899)',
    config: {
      headerLayout: 'full',
      navStyle: 'gradient',
      backgroundColor: '#1c1917',
      textColor: '#ffffff',
      accentColor: '#f97316',
      navBackgroundColor: '#292524',
      pillBorderRadius: 16,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep purple night theme',
    preview: 'linear-gradient(135deg, #1e1b4b, #312e81)',
    config: {
      headerLayout: 'full',
      navStyle: 'pills',
      backgroundColor: '#1e1b4b',
      textColor: '#e0e7ff',
      accentColor: '#818cf8',
      navBackgroundColor: '#312e81',
      navBorderColor: '#4338ca',
      pillBorderRadius: 20,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Futuristic neon city vibes',
    preview: 'linear-gradient(135deg, #0d0d0d, #1a0a2e)',
    config: {
      headerLayout: 'full',
      navStyle: 'outlined',
      backgroundColor: '#0d0d0d',
      textColor: '#00ffff',
      accentColor: '#ff00ff',
      navBackgroundColor: 'transparent',
      navBorderColor: '#00ffff',
      pillBorderRadius: 0,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'relaxed',
      headerPadding: 'medium',
    }
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights inspired',
    preview: 'linear-gradient(135deg, #064e3b, #0e7490, #7c3aed)',
    config: {
      headerLayout: 'full',
      navStyle: 'gradient',
      backgroundColor: '#022c22',
      textColor: '#ffffff',
      accentColor: '#34d399',
      navBackgroundColor: '#064e3b',
      navBorderColor: '#10b981',
      pillBorderRadius: 20,
      navPosition: 'center',
      showIcons: true,
      navSpacing: 'normal',
      headerPadding: 'medium',
    }
  },
];

// Apply a template to existing config, preserving nav links
export const applyHeaderTemplate = (
  currentConfig: HeaderConfig,
  template: HeaderTemplate
): HeaderConfig => {
  return {
    ...currentConfig,
    ...template.config,
    // Always preserve nav links
    navLinks: currentConfig.navLinks,
    // Preserve logo and site name
    logoUrl: currentConfig.logoUrl,
    siteName: currentConfig.siteName,
    showSiteName: currentConfig.showSiteName,
    // Mark which template is applied
    templateId: template.id,
  } as HeaderConfig;
};

// Get template by ID
export const getHeaderTemplate = (templateId: string): HeaderTemplate | undefined => {
  return HEADER_TEMPLATES.find(t => t.id === templateId);
};
