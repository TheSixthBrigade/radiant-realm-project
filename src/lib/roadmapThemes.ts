export interface RoadmapThemeLayout {
  fontFamily: string;
  cardStyle: string;        // 'full' | 'left-accent' | 'minimal'
  cardBorderRadius: number;
  cardGlow: boolean;
  cardOpacity: number;
  sectionSpacing: string;   // 'compact' | 'normal' | 'relaxed'
  roadmapWidth: string;     // tailwind max-w class
  mainTitleSize: string;
  versionTitleSize: string;
  taskTitleSize: string;
  cardPadding: string;
  borderWidth: number;
  showFloatingOrbs: boolean;
  orbCount: number;
  backgroundType: string;   // 'gradient' | 'solid'
  layoutVariant: string;    // 'stacked' | 'timeline' | 'kanban' | 'grid' | 'magazine'
}

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
  layout: RoadmapThemeLayout;
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
  cardStyle: string;
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
  // Layout options
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
  // Font
  fontFamily?: string;
  layoutVariant?: string;
}

export const ROADMAP_THEMES: Record<string, RoadmapTheme> = {
  ghost: {
    name: 'Ghost',
    backgroundColor: '#080808',
    cardBackground: '#111111',
    cardBorder: '#222222',
    textPrimary: '#ffffff',
    textSecondary: '#666666',
    accentColor: '#22c55e',
    statusColors: {
      backlog: '#333333',
      in_progress: '#22c55e',
      qa: '#f59e0b',
      completed: '#22c55e',
    },
    layout: {
      fontFamily: 'Inter, sans-serif',
      cardStyle: 'minimal',
      cardBorderRadius: 6,
      cardGlow: false,
      cardOpacity: 100,
      sectionSpacing: 'compact',
      roadmapWidth: 'max-w-4xl',
      mainTitleSize: 'text-4xl md:text-5xl',
      versionTitleSize: 'text-xl md:text-2xl',
      taskTitleSize: 'text-sm',
      cardPadding: 'p-5',
      borderWidth: 1,
      showFloatingOrbs: false,
      orbCount: 0,
      backgroundType: 'solid',
      layoutVariant: 'timeline',
    },
  },

  terminal: {
    name: 'Terminal',
    backgroundColor: '#0d0d0d',
    cardBackground: '#111111',
    cardBorder: '#2dd4bf',
    textPrimary: '#2dd4bf',
    textSecondary: '#4b5563',
    accentColor: '#2dd4bf',
    statusColors: {
      backlog: '#374151',
      in_progress: '#2dd4bf',
      qa: '#f59e0b',
      completed: '#22c55e',
    },
    layout: {
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      cardStyle: 'left-accent',
      cardBorderRadius: 4,
      cardGlow: false,
      cardOpacity: 95,
      sectionSpacing: 'compact',
      roadmapWidth: 'max-w-5xl',
      mainTitleSize: 'text-3xl md:text-4xl',
      versionTitleSize: 'text-lg md:text-xl',
      taskTitleSize: 'text-xs',
      cardPadding: 'p-5',
      borderWidth: 1,
      showFloatingOrbs: false,
      orbCount: 0,
      backgroundType: 'solid',
      layoutVariant: 'terminal',
    },
  },

  kinetic: {
    name: 'Kinetic',
    backgroundColor: '#0d1117',
    backgroundGradient: { start: '#0d1117', end: '#161b22' },
    cardBackground: 'rgba(22, 27, 34, 0.9)',
    cardBorder: 'rgba(48, 54, 61, 0.8)',
    textPrimary: '#e6edf3',
    textSecondary: '#7d8590',
    accentColor: '#2dd4bf',
    statusColors: {
      backlog: '#3b82f6',
      in_progress: '#a855f7',
      qa: '#f59e0b',
      completed: '#22c55e',
    },
    layout: {
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      cardStyle: 'left-accent',
      cardBorderRadius: 8,
      cardGlow: false,
      cardOpacity: 90,
      sectionSpacing: 'normal',
      roadmapWidth: 'max-w-6xl',
      mainTitleSize: 'text-5xl md:text-6xl',
      versionTitleSize: 'text-2xl md:text-3xl',
      taskTitleSize: 'text-base',
      cardPadding: 'p-6',
      borderWidth: 1,
      showFloatingOrbs: false,
      orbCount: 0,
      backgroundType: 'gradient',
      layoutVariant: 'stacked',
    },
  },

  slate: {
    name: 'Slate',
    backgroundColor: '#0f172a',
    cardBackground: '#1e293b',
    cardBorder: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    accentColor: '#38bdf8',
    statusColors: {
      backlog: '#475569',
      in_progress: '#38bdf8',
      qa: '#818cf8',
      completed: '#34d399',
    },
    layout: {
      fontFamily: 'Inter, sans-serif',
      cardStyle: 'full',
      cardBorderRadius: 12,
      cardGlow: false,
      cardOpacity: 85,
      sectionSpacing: 'normal',
      roadmapWidth: 'max-w-5xl',
      mainTitleSize: 'text-5xl md:text-6xl',
      versionTitleSize: 'text-2xl md:text-3xl',
      taskTitleSize: 'text-base',
      cardPadding: 'p-7',
      borderWidth: 1,
      showFloatingOrbs: false,
      orbCount: 0,
      backgroundType: 'solid',
      layoutVariant: 'grid',
    },
  },

  void: {
    name: 'Void',
    backgroundColor: '#07050f',
    backgroundGradient: { start: '#07050f', end: '#0f0a1e' },
    cardBackground: 'rgba(15, 10, 30, 0.8)',
    cardBorder: 'rgba(139, 92, 246, 0.4)',
    textPrimary: '#ede9fe',
    textSecondary: '#7c3aed',
    accentColor: '#a78bfa',
    statusColors: {
      backlog: '#4c1d95',
      in_progress: '#7c3aed',
      qa: '#db2777',
      completed: '#059669',
    },
    layout: {
      fontFamily: '"Sora", "Inter", sans-serif',
      cardStyle: 'full',
      cardBorderRadius: 16,
      cardGlow: true,
      cardOpacity: 75,
      sectionSpacing: 'relaxed',
      roadmapWidth: 'max-w-6xl',
      mainTitleSize: 'text-6xl md:text-7xl',
      versionTitleSize: 'text-3xl md:text-4xl',
      taskTitleSize: 'text-lg',
      cardPadding: 'p-8',
      borderWidth: 1,
      showFloatingOrbs: false,
      orbCount: 0,
      backgroundType: 'gradient',
      layoutVariant: 'magazine',
    },
  },

  carbon: {
    name: 'Carbon',
    backgroundColor: '#161616',
    cardBackground: '#1c1c1c',
    cardBorder: '#f97316',
    textPrimary: '#f4f4f4',
    textSecondary: '#8d8d8d',
    accentColor: '#f97316',
    statusColors: {
      backlog: '#525252',
      in_progress: '#f97316',
      qa: '#facc15',
      completed: '#22c55e',
    },
    layout: {
      fontFamily: '"DM Mono", "Courier New", monospace',
      cardStyle: 'left-accent',
      cardBorderRadius: 6,
      cardGlow: false,
      cardOpacity: 100,
      sectionSpacing: 'compact',
      roadmapWidth: 'max-w-5xl',
      mainTitleSize: 'text-4xl md:text-5xl',
      versionTitleSize: 'text-xl md:text-2xl',
      taskTitleSize: 'text-sm',
      cardPadding: 'p-6',
      borderWidth: 2,
      showFloatingOrbs: false,
      orbCount: 0,
      backgroundType: 'solid',
      layoutVariant: 'kanban',
    },
  },

  midnight: {
    name: 'Midnight',
    backgroundColor: '#020617',
    backgroundGradient: { start: '#020617', end: '#0c1445' },
    cardBackground: 'rgba(8, 20, 60, 0.6)',
    cardBorder: 'rgba(59, 130, 246, 0.3)',
    textPrimary: '#e0f2fe',
    textSecondary: '#7dd3fc',
    accentColor: '#3b82f6',
    statusColors: {
      backlog: '#1e3a5f',
      in_progress: '#3b82f6',
      qa: '#6366f1',
      completed: '#10b981',
    },
    layout: {
      fontFamily: '"Outfit", "Poppins", sans-serif',
      cardStyle: 'full',
      cardBorderRadius: 20,
      cardGlow: false,
      cardOpacity: 70,
      sectionSpacing: 'relaxed',
      roadmapWidth: 'max-w-7xl',
      mainTitleSize: 'text-6xl md:text-7xl',
      versionTitleSize: 'text-3xl md:text-4xl',
      taskTitleSize: 'text-xl',
      cardPadding: 'p-10',
      borderWidth: 1,
      showFloatingOrbs: false,
      orbCount: 0,
      backgroundType: 'gradient',
      layoutVariant: 'magazine',
    },
  },

  forge: {
    name: 'Forge',
    backgroundColor: '#0c0a09',
    backgroundGradient: { start: '#0c0a09', end: '#1c0f0a' },
    cardBackground: 'rgba(28, 15, 10, 0.9)',
    cardBorder: 'rgba(239, 68, 68, 0.5)',
    textPrimary: '#fef2f2',
    textSecondary: '#9ca3af',
    accentColor: '#ef4444',
    statusColors: {
      backlog: '#374151',
      in_progress: '#ef4444',
      qa: '#f97316',
      completed: '#22c55e',
    },
    layout: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      cardStyle: 'left-accent',
      cardBorderRadius: 8,
      cardGlow: true,
      cardOpacity: 85,
      sectionSpacing: 'normal',
      roadmapWidth: 'max-w-6xl',
      mainTitleSize: 'text-5xl md:text-6xl',
      versionTitleSize: 'text-2xl md:text-3xl',
      taskTitleSize: 'text-base',
      cardPadding: 'p-7',
      borderWidth: 2,
      showFloatingOrbs: false,
      orbCount: 0,
      backgroundType: 'gradient',
      layoutVariant: 'stacked',
    },
  },

  matrix: {
    name: 'Matrix',
    backgroundColor: '#000000',
    cardBackground: '#050505',
    cardBorder: '#00ff41',
    textPrimary: '#00ff41',
    textSecondary: '#008f11',
    accentColor: '#00ff41',
    statusColors: {
      backlog: '#003b00',
      in_progress: '#00ff41',
      qa: '#ffff00',
      completed: '#00ff41',
    },
    layout: {
      fontFamily: '"Share Tech Mono", "Courier New", monospace',
      cardStyle: 'minimal',
      cardBorderRadius: 2,
      cardGlow: true,
      cardOpacity: 95,
      sectionSpacing: 'compact',
      roadmapWidth: 'max-w-5xl',
      mainTitleSize: 'text-4xl md:text-5xl',
      versionTitleSize: 'text-xl md:text-2xl',
      taskTitleSize: 'text-xs',
      cardPadding: 'p-5',
      borderWidth: 1,
      showFloatingOrbs: false,
      orbCount: 0,
      backgroundType: 'solid',
      layoutVariant: 'terminal',
    },
  },

  obsidian: {
    name: 'Obsidian',
    backgroundColor: '#0a0a0f',
    backgroundGradient: { start: '#0a0a0f', end: '#12121a' },
    cardBackground: 'rgba(18, 18, 26, 0.85)',
    cardBorder: 'rgba(99, 102, 241, 0.3)',
    textPrimary: '#f8fafc',
    textSecondary: '#64748b',
    accentColor: '#6366f1',
    statusColors: {
      backlog: '#1e1b4b',
      in_progress: '#6366f1',
      qa: '#8b5cf6',
      completed: '#10b981',
    },
    layout: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      cardStyle: 'full',
      cardBorderRadius: 14,
      cardGlow: false,
      cardOpacity: 80,
      sectionSpacing: 'normal',
      roadmapWidth: 'max-w-6xl',
      mainTitleSize: 'text-5xl md:text-6xl',
      versionTitleSize: 'text-2xl md:text-3xl',
      taskTitleSize: 'text-base',
      cardPadding: 'p-8',
      borderWidth: 1,
      showFloatingOrbs: false,
      orbCount: 0,
      backgroundType: 'gradient',
      layoutVariant: 'grid',
    },
  },
};

export const DEFAULT_ROADMAP_SETTINGS: RoadmapSettings = {
  theme: 'kinetic',
  showSuggestions: true,
  suggestionsLimit: 5,
  defaultExpanded: true,
  title: 'Development Roadmap',
  subtitle: "Track our progress and see what we're working on",
  useCustomColors: false,
  customBackgroundColor: '#0d1117',
  customBackgroundGradientStart: '#0d1117',
  customBackgroundGradientEnd: '#161b22',
  useBackgroundGradient: true,
  customCardBackground: 'rgba(22, 27, 34, 0.9)',
  customCardBorder: 'rgba(48, 54, 61, 0.8)',
  customTextPrimary: '#e6edf3',
  customTextSecondary: '#7d8590',
  customAccentColor: '#2dd4bf',
  customStatusBacklog: '#3b82f6',
  customStatusInProgress: '#a855f7',
  customStatusQa: '#f59e0b',
  customStatusCompleted: '#22c55e',
  showHero: false,
  heroImage: '',
  heroOverlayOpacity: 50,
  heroHeight: 'medium',
  cardBorderRadius: 8,
  cardShadow: 'medium',
  cardOpacity: 90,
  taskCardOpacity: 90,
  taskCardPadding: 'p-4',
  cardGlow: false,
  cardGlowIntensity: 50,
  cardStyle: 'left-accent',
  sectionSpacing: 'normal',
  stylePreset: 'default',
  backgroundType: 'gradient',
  backgroundImage: '',
  backgroundOverlayOpacity: 70,
  showHeader: true,
  showLogo: true,
  roadmapWidth: 'max-w-6xl',
  mainTitleSize: 'text-5xl md:text-6xl',
  versionTitleSize: 'text-2xl md:text-3xl',
  taskTitleSize: 'text-base',
  cardPadding: 'p-6',
  glowIntensity: 50,
  borderWidth: 1,
  showFloatingOrbs: false,
  orbColor: '#2dd4bf',
  orbCount: 0,
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  layoutVariant: 'stacked',
};

/**
 * Apply a theme's layout + color settings onto existing RoadmapSettings.
 * Preserves user content (title, subtitle, showSuggestions, etc.)
 * but stamps all visual/layout fields from the theme.
 */
export const applyThemeToSettings = (
  themeId: string,
  current: RoadmapSettings
): RoadmapSettings => {
  const theme = ROADMAP_THEMES[themeId];
  if (!theme) return { ...current, theme: themeId };

  return {
    ...current,
    theme: themeId,
    useCustomColors: false,
    // Layout from theme
    fontFamily: theme.layout.fontFamily,
    cardStyle: theme.layout.cardStyle,
    cardBorderRadius: theme.layout.cardBorderRadius,
    cardGlow: theme.layout.cardGlow,
    cardOpacity: theme.layout.cardOpacity,
    sectionSpacing: theme.layout.sectionSpacing,
    roadmapWidth: theme.layout.roadmapWidth,
    mainTitleSize: theme.layout.mainTitleSize,
    versionTitleSize: theme.layout.versionTitleSize,
    taskTitleSize: theme.layout.taskTitleSize,
    cardPadding: theme.layout.cardPadding,
    borderWidth: theme.layout.borderWidth,
    showFloatingOrbs: theme.layout.showFloatingOrbs,
    orbCount: theme.layout.orbCount,
    backgroundType: theme.layout.backgroundType,
    layoutVariant: theme.layout.layoutVariant,
    // Colors from theme
    orbColor: theme.accentColor,
    customAccentColor: theme.accentColor,
    customBackgroundColor: theme.backgroundColor,
    customBackgroundGradientStart: theme.backgroundGradient?.start || theme.backgroundColor,
    customBackgroundGradientEnd: theme.backgroundGradient?.end || theme.backgroundColor,
    customCardBackground: theme.cardBackground,
    customCardBorder: theme.cardBorder,
    customTextPrimary: theme.textPrimary,
    customTextSecondary: theme.textSecondary,
    customStatusBacklog: theme.statusColors.backlog,
    customStatusInProgress: theme.statusColors.in_progress,
    customStatusQa: theme.statusColors.qa,
    customStatusCompleted: theme.statusColors.completed,
  };
};

export const getTheme = (settings: RoadmapSettings): RoadmapTheme => {
  const baseTheme = ROADMAP_THEMES[settings.theme] || ROADMAP_THEMES.kinetic;

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
      },
      layout: baseTheme.layout,
    };
  }

  if (settings.theme === 'custom' && settings.customTheme) {
    return {
      ...baseTheme,
      ...settings.customTheme,
      statusColors: {
        ...baseTheme.statusColors,
        ...settings.customTheme.statusColors
      },
      layout: baseTheme.layout,
    };
  }

  return baseTheme;
};
