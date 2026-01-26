export interface RoadmapTheme {
  name: string;
  backgroundColor: string;
  backgroundGradient?: { start: string; end: string };
  cardBackground: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  statusColors: {
    backlog: string;
    in_progress: string;
    qa: string;
    completed: string;
  };
}

export interface RoadmapSettings {
  theme: string;
  customTheme?: Partial<RoadmapTheme>;
  showSuggestions: boolean;
  suggestionsLimit: number;
  defaultExpanded: boolean;
  title: string;
  subtitle: string;
  // Extended customization
  useCustomColors: boolean;
  customBackgroundColor: string;
  customBackgroundGradientStart: string;
  customBackgroundGradientEnd: string;
  useBackgroundGradient: boolean;
  customCardBackground: string;
  customCardBorder: string;
  customTextPrimary: string;
  customTextSecondary: string;
  customAccentColor: string;
  customStatusBacklog: string;
  customStatusInProgress: string;
  customStatusQa: string;
  customStatusCompleted: string;
  // Hero/Banner settings
  showHero: boolean;
  heroImage: string;
  heroOverlayOpacity: number;
  heroHeight: string;
  // Card styling
  cardBorderRadius: number;
  cardShadow: string;
  cardOpacity: number;
  taskCardOpacity: number;
  taskCardPadding: string;
  cardGlow: boolean;
  cardGlowIntensity: number;
  cardStyle: string; // 'full' | 'left-accent' | 'minimal'
  // Spacing
  sectionSpacing: string;
  // Style presets
  stylePreset: string;
  // Background image
  backgroundType: string;
  backgroundImage: string;
  backgroundOverlayOpacity: number;
  // Header settings
  showHeader: boolean;
  showLogo: boolean;
  // New customization options
  roadmapWidth: string;
  mainTitleSize: string;
  versionTitleSize: string;
  taskTitleSize: string;
  cardPadding: string;
  glowIntensity: number;
  borderWidth: number;
  // Floating orbs settings
  showFloatingOrbs: boolean;
  orbColor: string;
  orbCount: number;
}

export const ROADMAP_THEMES: Record<string, RoadmapTheme> = {
  // Kinetic theme - glass transparency style like kineticdevsystems.com
  kinetic: {
    name: 'Kinetic',
    backgroundColor: '#0d1117',
    backgroundGradient: { start: '#0d1117', end: '#0d1117' },
    cardBackground: 'rgba(22, 27, 34, 0.7)',
    cardBorder: 'rgba(48, 54, 61, 0.6)',
    textPrimary: '#ffffff',
    textSecondary: '#8b949e',
    accentColor: '#2dd4bf',
    statusColors: {
      backlog: '#3b82f6',
      in_progress: '#a855f7',
      qa: '#f59e0b',
      completed: '#22c55e'
    }
  },
  // Glass theme - matches the reference image exactly
  glass: {
    name: 'Glass (Default)',
    backgroundColor: '#0f172a',
    backgroundGradient: { start: '#0f172a', end: '#1e293b' },
    cardBackground: 'rgba(30, 41, 59, 0.5)',
    cardBorder: 'rgba(56, 189, 248, 0.3)',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    accentColor: '#22c55e',
    statusColors: {
      backlog: '#64748b',
      in_progress: '#3b82f6',
      qa: '#a855f7',
      completed: '#22c55e'
    }
  },
  dark: {
    name: 'Dark',
    backgroundColor: '#0f172a',
    cardBackground: '#1e293b',
    cardBorder: '#334155',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    accentColor: '#22c55e',
    statusColors: {
      backlog: '#64748b',
      in_progress: '#3b82f6',
      qa: '#a855f7',
      completed: '#22c55e'
    }
  },
  // Neon Glass - cyan/purple vibes
  neonGlass: {
    name: 'Neon Glass',
    backgroundColor: '#0a0a1a',
    backgroundGradient: { start: '#0a0a1a', end: '#1a0a2e' },
    cardBackground: 'rgba(20, 20, 40, 0.6)',
    cardBorder: 'rgba(139, 92, 246, 0.4)',
    textPrimary: '#e0e7ff',
    textSecondary: '#a5b4fc',
    accentColor: '#8b5cf6',
    statusColors: {
      backlog: '#6b7280',
      in_progress: '#06b6d4',
      qa: '#a855f7',
      completed: '#10b981'
    }
  },
  // Emerald - green focused like the completed version in reference
  emerald: {
    name: 'Emerald',
    backgroundColor: '#022c22',
    backgroundGradient: { start: '#022c22', end: '#064e3b' },
    cardBackground: 'rgba(6, 78, 59, 0.4)',
    cardBorder: 'rgba(34, 197, 94, 0.4)',
    textPrimary: '#ecfdf5',
    textSecondary: '#6ee7b7',
    accentColor: '#22c55e',
    statusColors: {
      backlog: '#4b5563',
      in_progress: '#22c55e',
      qa: '#fbbf24',
      completed: '#10b981'
    }
  },
  light: {
    name: 'Light',
    backgroundColor: '#ffffff',
    cardBackground: '#f8fafc',
    cardBorder: '#e2e8f0',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    accentColor: '#22c55e',
    statusColors: {
      backlog: '#94a3b8',
      in_progress: '#2563eb',
      qa: '#9333ea',
      completed: '#16a34a'
    }
  },
  cyberpunk: {
    name: 'Cyberpunk',
    backgroundColor: '#0a0a0a',
    backgroundGradient: { start: '#0a0a0a', end: '#1a0a2e' },
    cardBackground: 'rgba(26, 26, 46, 0.7)',
    cardBorder: 'rgba(255, 0, 255, 0.4)',
    textPrimary: '#00ffff',
    textSecondary: '#ff00ff',
    accentColor: '#ff00ff',
    statusColors: {
      backlog: '#666666',
      in_progress: '#00ffff',
      qa: '#ff00ff',
      completed: '#00ff00'
    }
  },
  ocean: {
    name: 'Ocean',
    backgroundColor: '#0c1929',
    backgroundGradient: { start: '#0c1929', end: '#1e3a5f' },
    cardBackground: 'rgba(30, 58, 95, 0.5)',
    cardBorder: 'rgba(37, 99, 235, 0.4)',
    textPrimary: '#e0f2fe',
    textSecondary: '#7dd3fc',
    accentColor: '#0ea5e9',
    statusColors: {
      backlog: '#475569',
      in_progress: '#0ea5e9',
      qa: '#6366f1',
      completed: '#10b981'
    }
  },
  premium: {
    name: 'Premium',
    backgroundColor: '#0f1419',
    backgroundGradient: { start: '#0f1419', end: '#1a202c' },
    cardBackground: 'rgba(37, 99, 235, 0.15)',
    cardBorder: 'rgba(59, 130, 246, 0.8)',
    textPrimary: '#ffffff',
    textSecondary: '#e2e8f0',
    accentColor: '#06d6a0',
    statusColors: {
      backlog: '#64b5f6',
      in_progress: '#3b82f6',
      qa: '#8b5cf6',
      completed: '#06d6a0'
    }
  },
  sunset: {
    name: 'Sunset',
    backgroundColor: '#1f1315',
    backgroundGradient: { start: '#1f1315', end: '#2d1f24' },
    cardBackground: 'rgba(45, 31, 36, 0.6)',
    cardBorder: 'rgba(249, 115, 22, 0.4)',
    textPrimary: '#fef3c7',
    textSecondary: '#fcd34d',
    accentColor: '#f97316',
    statusColors: {
      backlog: '#78716c',
      in_progress: '#f97316',
      qa: '#ec4899',
      completed: '#84cc16'
    }
  }
};

export const DEFAULT_ROADMAP_SETTINGS: RoadmapSettings = {
  theme: 'glass',
  showSuggestions: true,
  suggestionsLimit: 5,
  defaultExpanded: true,
  title: 'Development Roadmap',
  subtitle: 'Track our progress and see what we\'re working on',
  // Extended customization defaults
  useCustomColors: false,
  customBackgroundColor: '#0f172a',
  customBackgroundGradientStart: '#0f172a',
  customBackgroundGradientEnd: '#1e293b',
  useBackgroundGradient: true,
  customCardBackground: 'rgba(30, 41, 59, 0.5)',
  customCardBorder: 'rgba(56, 189, 248, 0.3)',
  customTextPrimary: '#f1f5f9',
  customTextSecondary: '#94a3b8',
  customAccentColor: '#22c55e',
  customStatusBacklog: '#64748b',
  customStatusInProgress: '#3b82f6',
  customStatusQa: '#a855f7',
  customStatusCompleted: '#22c55e',
  // Hero/Banner defaults
  showHero: false,
  heroImage: '',
  heroOverlayOpacity: 50,
  heroHeight: 'medium',
  // Card styling defaults
  cardBorderRadius: 16,
  cardShadow: 'medium',
  cardOpacity: 80,
  cardGlow: false,
  cardGlowIntensity: 50,
  cardStyle: 'full', // 'full' | 'left-accent' | 'minimal'
  // Spacing defaults
  sectionSpacing: 'normal',
  // Style presets
  stylePreset: 'default',
  // Background image defaults
  backgroundType: 'gradient',
  backgroundImage: '',
  backgroundOverlayOpacity: 70,
  // Header defaults
  showHeader: true,
  showLogo: true,
  // New customization defaults
  roadmapWidth: 'max-w-7xl',
  mainTitleSize: 'text-6xl md:text-7xl',
  versionTitleSize: 'text-3xl md:text-4xl',
  taskTitleSize: 'text-xl',
  cardPadding: 'p-10',
  glowIntensity: 50,
  borderWidth: 2,
  // Floating orbs defaults
  showFloatingOrbs: true,
  orbColor: '#22c55e',
  orbCount: 3
};

export const getTheme = (settings: RoadmapSettings): RoadmapTheme => {
  const baseTheme = ROADMAP_THEMES[settings.theme] || ROADMAP_THEMES.dark;
  
  // If using custom colors, override with custom values
  if (settings.useCustomColors) {
    return {
      name: 'Custom',
      backgroundColor: settings.customBackgroundColor || baseTheme.backgroundColor,
      backgroundGradient: settings.useBackgroundGradient ? {
        start: settings.customBackgroundGradientStart || baseTheme.backgroundGradient?.start || settings.customBackgroundColor,
        end: settings.customBackgroundGradientEnd || baseTheme.backgroundGradient?.end || settings.customBackgroundColor
      } : undefined,
      cardBackground: settings.customCardBackground || baseTheme.cardBackground,
      cardBorder: settings.customCardBorder || baseTheme.cardBorder,
      textPrimary: settings.customTextPrimary || baseTheme.textPrimary,
      textSecondary: settings.customTextSecondary || baseTheme.textSecondary,
      accentColor: settings.customAccentColor || baseTheme.accentColor,
      statusColors: {
        backlog: settings.customStatusBacklog || baseTheme.statusColors.backlog,
        in_progress: settings.customStatusInProgress || baseTheme.statusColors.in_progress,
        qa: settings.customStatusQa || baseTheme.statusColors.qa,
        completed: settings.customStatusCompleted || baseTheme.statusColors.completed
      }
    };
  }
  
  if (settings.theme === 'custom' && settings.customTheme) {
    return {
      ...baseTheme,
      ...settings.customTheme,
      statusColors: {
        ...baseTheme.statusColors,
        ...settings.customTheme.statusColors
      }
    };
  }
  
  return baseTheme;
};
