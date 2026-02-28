export interface RoadmapThemeLayout {
  fontFamily: string;
  cardStyle: string;
  cardBorderRadius: number;
  cardGlow: boolean;
  cardOpacity: number;
  sectionSpacing: string;
  roadmapWidth: string;
  mainTitleSize: string;
  versionTitleSize: string;
  taskTitleSize: string;
  cardPadding: string;
  borderWidth: number;
  showFloatingOrbs: boolean;
  orbCount: number;
  backgroundType: string;
  layoutVariant: string;
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
  showHero: boolean;
  heroImage: string;
  heroOverlayOpacity: number;
  heroHeight: string;
  cardBorderRadius: number;
  cardShadow: string;
  cardOpacity: number;
  taskCardOpacity: number;
  taskCardPadding: string;
  cardGlow: boolean;
  cardGlowIntensity: number;
  cardStyle: string;
  sectionSpacing: string;
  stylePreset: string;
  backgroundType: string;
  backgroundImage: string;
  backgroundOverlayOpacity: number;
  showHeader: boolean;
  showLogo: boolean;
  roadmapWidth: string;
  mainTitleSize: string;
  versionTitleSize: string;
  taskTitleSize: string;
  cardPadding: string;
  glowIntensity: number;
  borderWidth: number;
  showFloatingOrbs: boolean;
  orbColor: string;
  orbCount: number;
  fontFamily?: string;
  layoutVariant?: string;
}

export const ROADMAP_THEMES: Record<string, RoadmapTheme> = {
  // ── ORIGINAL 10 ──────────────────────────────────────────────────────────
  ghost: {
    name: 'Ghost',
    backgroundColor: '#080808',
    cardBackground: '#111111',
    cardBorder: '#222222',
    textPrimary: '#ffffff',
    textSecondary: '#666666',
    accentColor: '#22c55e',
    statusColors: { backlog: '#333333', in_progress: '#22c55e', qa: '#f59e0b', completed: '#22c55e' },
    layout: { fontFamily: 'Inter, sans-serif', cardStyle: 'minimal', cardBorderRadius: 6, cardGlow: false, cardOpacity: 100, sectionSpacing: 'compact', roadmapWidth: 'max-w-4xl', mainTitleSize: 'text-4xl md:text-5xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'timeline' },
  },
  terminal: {
    name: 'Terminal',
    backgroundColor: '#0d0d0d',
    cardBackground: '#111111',
    cardBorder: '#2dd4bf',
    textPrimary: '#2dd4bf',
    textSecondary: '#4b5563',
    accentColor: '#2dd4bf',
    statusColors: { backlog: '#374151', in_progress: '#2dd4bf', qa: '#f59e0b', completed: '#22c55e' },
    layout: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', cardStyle: 'left-accent', cardBorderRadius: 4, cardGlow: false, cardOpacity: 95, sectionSpacing: 'compact', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-3xl md:text-4xl', versionTitleSize: 'text-lg md:text-xl', taskTitleSize: 'text-xs', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'terminal' },
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
    statusColors: { backlog: '#3b82f6', in_progress: '#a855f7', qa: '#f59e0b', completed: '#22c55e' },
    layout: { fontFamily: '"JetBrains Mono", "Fira Code", monospace', cardStyle: 'left-accent', cardBorderRadius: 8, cardGlow: false, cardOpacity: 90, sectionSpacing: 'normal', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-base', cardPadding: 'p-6', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'stacked' },
  },
  slate: {
    name: 'Slate',
    backgroundColor: '#0f172a',
    cardBackground: '#1e293b',
    cardBorder: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    accentColor: '#38bdf8',
    statusColors: { backlog: '#475569', in_progress: '#38bdf8', qa: '#818cf8', completed: '#34d399' },
    layout: { fontFamily: 'Inter, sans-serif', cardStyle: 'full', cardBorderRadius: 12, cardGlow: false, cardOpacity: 85, sectionSpacing: 'normal', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-base', cardPadding: 'p-7', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'grid' },
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
    statusColors: { backlog: '#4c1d95', in_progress: '#7c3aed', qa: '#db2777', completed: '#059669' },
    layout: { fontFamily: '"Sora", "Inter", sans-serif', cardStyle: 'full', cardBorderRadius: 16, cardGlow: true, cardOpacity: 75, sectionSpacing: 'relaxed', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-6xl md:text-7xl', versionTitleSize: 'text-3xl md:text-4xl', taskTitleSize: 'text-lg', cardPadding: 'p-8', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'magazine' },
  },
  carbon: {
    name: 'Carbon',
    backgroundColor: '#161616',
    cardBackground: '#1c1c1c',
    cardBorder: '#f97316',
    textPrimary: '#f4f4f4',
    textSecondary: '#8d8d8d',
    accentColor: '#f97316',
    statusColors: { backlog: '#525252', in_progress: '#f97316', qa: '#facc15', completed: '#22c55e' },
    layout: { fontFamily: '"DM Mono", "Courier New", monospace', cardStyle: 'left-accent', cardBorderRadius: 6, cardGlow: false, cardOpacity: 100, sectionSpacing: 'compact', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-4xl md:text-5xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-sm', cardPadding: 'p-6', borderWidth: 2, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'kanban' },
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
    statusColors: { backlog: '#1e3a5f', in_progress: '#3b82f6', qa: '#6366f1', completed: '#10b981' },
    layout: { fontFamily: '"Outfit", "Poppins", sans-serif', cardStyle: 'full', cardBorderRadius: 20, cardGlow: false, cardOpacity: 70, sectionSpacing: 'relaxed', roadmapWidth: 'max-w-7xl', mainTitleSize: 'text-6xl md:text-7xl', versionTitleSize: 'text-3xl md:text-4xl', taskTitleSize: 'text-xl', cardPadding: 'p-10', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'magazine' },
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
    statusColors: { backlog: '#374151', in_progress: '#ef4444', qa: '#f97316', completed: '#22c55e' },
    layout: { fontFamily: '"DM Sans", "Inter", sans-serif', cardStyle: 'left-accent', cardBorderRadius: 8, cardGlow: true, cardOpacity: 85, sectionSpacing: 'normal', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-base', cardPadding: 'p-7', borderWidth: 2, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'stacked' },
  },
  matrix: {
    name: 'Matrix',
    backgroundColor: '#000000',
    cardBackground: '#050505',
    cardBorder: '#00ff41',
    textPrimary: '#00ff41',
    textSecondary: '#008f11',
    accentColor: '#00ff41',
    statusColors: { backlog: '#003b00', in_progress: '#00ff41', qa: '#ffff00', completed: '#00ff41' },
    layout: { fontFamily: '"Share Tech Mono", "Courier New", monospace', cardStyle: 'minimal', cardBorderRadius: 2, cardGlow: true, cardOpacity: 95, sectionSpacing: 'compact', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-4xl md:text-5xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-xs', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'terminal' },
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
    statusColors: { backlog: '#1e1b4b', in_progress: '#6366f1', qa: '#8b5cf6', completed: '#10b981' },
    layout: { fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', cardStyle: 'full', cardBorderRadius: 14, cardGlow: false, cardOpacity: 80, sectionSpacing: 'normal', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-base', cardPadding: 'p-8', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'grid' },
  },

  // ── NEW 30 THEMES ─────────────────────────────────────────────────────────

  // BENTO layout themes
  neon: {
    name: 'Neon',
    backgroundColor: '#050510',
    backgroundGradient: { start: '#050510', end: '#0a0520' },
    cardBackground: 'rgba(10, 5, 30, 0.9)',
    cardBorder: 'rgba(236, 72, 153, 0.5)',
    textPrimary: '#fdf4ff',
    textSecondary: '#a855f7',
    accentColor: '#ec4899',
    statusColors: { backlog: '#4a044e', in_progress: '#ec4899', qa: '#a855f7', completed: '#06b6d4' },
    layout: { fontFamily: '"Orbitron", "Inter", sans-serif', cardStyle: 'full', cardBorderRadius: 12, cardGlow: true, cardOpacity: 85, sectionSpacing: 'normal', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-sm', cardPadding: 'p-6', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'bento' },
  },
  aurora: {
    name: 'Aurora',
    backgroundColor: '#020c1b',
    backgroundGradient: { start: '#020c1b', end: '#071428' },
    cardBackground: 'rgba(5, 20, 45, 0.8)',
    cardBorder: 'rgba(16, 185, 129, 0.35)',
    textPrimary: '#ecfdf5',
    textSecondary: '#6ee7b7',
    accentColor: '#10b981',
    statusColors: { backlog: '#064e3b', in_progress: '#10b981', qa: '#06b6d4', completed: '#34d399' },
    layout: { fontFamily: '"Nunito", "Inter", sans-serif', cardStyle: 'full', cardBorderRadius: 18, cardGlow: true, cardOpacity: 80, sectionSpacing: 'relaxed', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-base', cardPadding: 'p-7', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'bento' },
  },

  // BRUTALIST layout themes
  brutalist: {
    name: 'Brutalist',
    backgroundColor: '#0a0a0a',
    cardBackground: '#111111',
    cardBorder: '#ffffff',
    textPrimary: '#ffffff',
    textSecondary: '#888888',
    accentColor: '#ffff00',
    statusColors: { backlog: '#333333', in_progress: '#ffff00', qa: '#ff6600', completed: '#00ff00' },
    layout: { fontFamily: '"Space Grotesk", "Inter", sans-serif', cardStyle: 'full', cardBorderRadius: 0, cardGlow: false, cardOpacity: 100, sectionSpacing: 'compact', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-6xl md:text-8xl', versionTitleSize: 'text-3xl md:text-4xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 3, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'brutalist' },
  },
  concrete: {
    name: 'Concrete',
    backgroundColor: '#111111',
    cardBackground: '#1a1a1a',
    cardBorder: '#ff3333',
    textPrimary: '#eeeeee',
    textSecondary: '#777777',
    accentColor: '#ff3333',
    statusColors: { backlog: '#444444', in_progress: '#ff3333', qa: '#ff9900', completed: '#33ff33' },
    layout: { fontFamily: '"IBM Plex Mono", monospace', cardStyle: 'minimal', cardBorderRadius: 0, cardGlow: false, cardOpacity: 100, sectionSpacing: 'compact', roadmapWidth: 'max-w-4xl', mainTitleSize: 'text-5xl md:text-7xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-xs', cardPadding: 'p-4', borderWidth: 2, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'brutalist' },
  },

  // GLASS layout themes
  glass: {
    name: 'Glass',
    backgroundColor: '#0a0f1e',
    backgroundGradient: { start: '#0a0f1e', end: '#111827' },
    cardBackground: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    textPrimary: '#f0f4ff',
    textSecondary: '#94a3b8',
    accentColor: '#818cf8',
    statusColors: { backlog: 'rgba(100,116,139,0.8)', in_progress: '#818cf8', qa: '#c084fc', completed: '#34d399' },
    layout: { fontFamily: '"Inter", sans-serif', cardStyle: 'full', cardBorderRadius: 20, cardGlow: false, cardOpacity: 60, sectionSpacing: 'normal', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-sm', cardPadding: 'p-6', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'glass' },
  },
  frost: {
    name: 'Frost',
    backgroundColor: '#060d1f',
    backgroundGradient: { start: '#060d1f', end: '#0d1a35' },
    cardBackground: 'rgba(148, 163, 184, 0.07)',
    cardBorder: 'rgba(148, 163, 184, 0.15)',
    textPrimary: '#e2e8f0',
    textSecondary: '#64748b',
    accentColor: '#38bdf8',
    statusColors: { backlog: 'rgba(71,85,105,0.9)', in_progress: '#38bdf8', qa: '#818cf8', completed: '#2dd4bf' },
    layout: { fontFamily: '"Manrope", "Inter", sans-serif', cardStyle: 'full', cardBorderRadius: 24, cardGlow: false, cardOpacity: 55, sectionSpacing: 'relaxed', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-sm', cardPadding: 'p-7', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'glass' },
  },

  // MINIMAL LIST layout themes
  clean: {
    name: 'Clean',
    backgroundColor: '#0c0c0c',
    cardBackground: '#141414',
    cardBorder: '#2a2a2a',
    textPrimary: '#f5f5f5',
    textSecondary: '#555555',
    accentColor: '#d4d4d4',
    statusColors: { backlog: '#3a3a3a', in_progress: '#d4d4d4', qa: '#a3a3a3', completed: '#737373' },
    layout: { fontFamily: '"Inter", sans-serif', cardStyle: 'minimal', cardBorderRadius: 4, cardGlow: false, cardOpacity: 100, sectionSpacing: 'relaxed', roadmapWidth: 'max-w-3xl', mainTitleSize: 'text-4xl md:text-5xl', versionTitleSize: 'text-lg md:text-xl', taskTitleSize: 'text-sm', cardPadding: 'p-4', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'minimal_list' },
  },
  mono: {
    name: 'Mono',
    backgroundColor: '#080808',
    cardBackground: '#0f0f0f',
    cardBorder: '#1f1f1f',
    textPrimary: '#e5e5e5',
    textSecondary: '#404040',
    accentColor: '#737373',
    statusColors: { backlog: '#262626', in_progress: '#737373', qa: '#525252', completed: '#404040' },
    layout: { fontFamily: '"IBM Plex Mono", monospace', cardStyle: 'minimal', cardBorderRadius: 2, cardGlow: false, cardOpacity: 100, sectionSpacing: 'relaxed', roadmapWidth: 'max-w-3xl', mainTitleSize: 'text-3xl md:text-4xl', versionTitleSize: 'text-base md:text-lg', taskTitleSize: 'text-xs', cardPadding: 'p-3', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'minimal_list' },
  },

  // SIDEBAR layout themes
  sidebar_dark: {
    name: 'Sidebar Dark',
    backgroundColor: '#0d0d0d',
    cardBackground: '#161616',
    cardBorder: '#2a2a2a',
    textPrimary: '#f0f0f0',
    textSecondary: '#666666',
    accentColor: '#7c3aed',
    statusColors: { backlog: '#374151', in_progress: '#7c3aed', qa: '#db2777', completed: '#059669' },
    layout: { fontFamily: '"Inter", sans-serif', cardStyle: 'left-accent', cardBorderRadius: 8, cardGlow: false, cardOpacity: 95, sectionSpacing: 'normal', roadmapWidth: 'max-w-7xl', mainTitleSize: 'text-4xl md:text-5xl', versionTitleSize: 'text-lg md:text-xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'sidebar' },
  },
  sidebar_ocean: {
    name: 'Sidebar Ocean',
    backgroundColor: '#040d1a',
    backgroundGradient: { start: '#040d1a', end: '#071428' },
    cardBackground: 'rgba(7, 20, 40, 0.95)',
    cardBorder: 'rgba(14, 165, 233, 0.25)',
    textPrimary: '#e0f2fe',
    textSecondary: '#38bdf8',
    accentColor: '#0ea5e9',
    statusColors: { backlog: '#0c4a6e', in_progress: '#0ea5e9', qa: '#6366f1', completed: '#10b981' },
    layout: { fontFamily: '"Outfit", sans-serif', cardStyle: 'full', cardBorderRadius: 10, cardGlow: false, cardOpacity: 90, sectionSpacing: 'normal', roadmapWidth: 'max-w-7xl', mainTitleSize: 'text-4xl md:text-5xl', versionTitleSize: 'text-lg md:text-xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'sidebar' },
  },

  // PROGRESS layout themes
  progress_dark: {
    name: 'Progress',
    backgroundColor: '#0a0a0a',
    cardBackground: '#141414',
    cardBorder: '#222222',
    textPrimary: '#ffffff',
    textSecondary: '#555555',
    accentColor: '#22c55e',
    statusColors: { backlog: '#374151', in_progress: '#22c55e', qa: '#f59e0b', completed: '#22c55e' },
    layout: { fontFamily: '"Inter", sans-serif', cardStyle: 'full', cardBorderRadius: 10, cardGlow: false, cardOpacity: 100, sectionSpacing: 'normal', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-4xl md:text-5xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-sm', cardPadding: 'p-6', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'progress' },
  },
  progress_violet: {
    name: 'Progress Violet',
    backgroundColor: '#07050f',
    backgroundGradient: { start: '#07050f', end: '#0f0a1e' },
    cardBackground: 'rgba(15, 10, 30, 0.9)',
    cardBorder: 'rgba(139, 92, 246, 0.3)',
    textPrimary: '#ede9fe',
    textSecondary: '#7c3aed',
    accentColor: '#8b5cf6',
    statusColors: { backlog: '#2e1065', in_progress: '#8b5cf6', qa: '#ec4899', completed: '#10b981' },
    layout: { fontFamily: '"Plus Jakarta Sans", sans-serif', cardStyle: 'full', cardBorderRadius: 14, cardGlow: true, cardOpacity: 80, sectionSpacing: 'normal', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-sm', cardPadding: 'p-6', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'progress' },
  },

  // SPOTLIGHT layout themes
  spotlight: {
    name: 'Spotlight',
    backgroundColor: '#050505',
    cardBackground: '#0f0f0f',
    cardBorder: '#1a1a1a',
    textPrimary: '#ffffff',
    textSecondary: '#555555',
    accentColor: '#facc15',
    statusColors: { backlog: '#292524', in_progress: '#facc15', qa: '#fb923c', completed: '#4ade80' },
    layout: { fontFamily: '"Sora", "Inter", sans-serif', cardStyle: 'full', cardBorderRadius: 16, cardGlow: true, cardOpacity: 95, sectionSpacing: 'relaxed', roadmapWidth: 'max-w-4xl', mainTitleSize: 'text-6xl md:text-7xl', versionTitleSize: 'text-3xl md:text-4xl', taskTitleSize: 'text-base', cardPadding: 'p-8', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'spotlight' },
  },
  spotlight_crimson: {
    name: 'Spotlight Crimson',
    backgroundColor: '#0a0000',
    backgroundGradient: { start: '#0a0000', end: '#1a0505' },
    cardBackground: 'rgba(20, 5, 5, 0.95)',
    cardBorder: 'rgba(239, 68, 68, 0.3)',
    textPrimary: '#fff1f2',
    textSecondary: '#9f1239',
    accentColor: '#f43f5e',
    statusColors: { backlog: '#450a0a', in_progress: '#f43f5e', qa: '#fb923c', completed: '#4ade80' },
    layout: { fontFamily: '"DM Sans", sans-serif', cardStyle: 'full', cardBorderRadius: 20, cardGlow: true, cardOpacity: 90, sectionSpacing: 'relaxed', roadmapWidth: 'max-w-4xl', mainTitleSize: 'text-6xl md:text-7xl', versionTitleSize: 'text-3xl md:text-4xl', taskTitleSize: 'text-base', cardPadding: 'p-8', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'spotlight' },
  },

  // RETRO layout themes
  retro: {
    name: 'Retro',
    backgroundColor: '#0d0208',
    cardBackground: '#1a0410',
    cardBorder: '#ff00ff',
    textPrimary: '#ff00ff',
    textSecondary: '#880088',
    accentColor: '#ff00ff',
    statusColors: { backlog: '#330033', in_progress: '#ff00ff', qa: '#ffff00', completed: '#00ff00' },
    layout: { fontFamily: '"Press Start 2P", "Courier New", monospace', cardStyle: 'full', cardBorderRadius: 0, cardGlow: true, cardOpacity: 95, sectionSpacing: 'compact', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-3xl md:text-4xl', versionTitleSize: 'text-lg md:text-xl', taskTitleSize: 'text-xs', cardPadding: 'p-5', borderWidth: 2, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'retro' },
  },
  arcade: {
    name: 'Arcade',
    backgroundColor: '#000011',
    cardBackground: '#000022',
    cardBorder: '#00ffff',
    textPrimary: '#00ffff',
    textSecondary: '#005555',
    accentColor: '#00ffff',
    statusColors: { backlog: '#001133', in_progress: '#00ffff', qa: '#ff6600', completed: '#00ff00' },
    layout: { fontFamily: '"VT323", "Courier New", monospace', cardStyle: 'minimal', cardBorderRadius: 0, cardGlow: true, cardOpacity: 100, sectionSpacing: 'compact', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-4xl md:text-5xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'retro' },
  },

  // NEWSPAPER layout themes
  newspaper: {
    name: 'Newspaper',
    backgroundColor: '#0c0c0c',
    cardBackground: '#111111',
    cardBorder: '#2a2a2a',
    textPrimary: '#e8e8e8',
    textSecondary: '#666666',
    accentColor: '#d4af37',
    statusColors: { backlog: '#333333', in_progress: '#d4af37', qa: '#c0a020', completed: '#888888' },
    layout: { fontFamily: '"Playfair Display", "Georgia", serif', cardStyle: 'full', cardBorderRadius: 2, cardGlow: false, cardOpacity: 100, sectionSpacing: 'compact', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-5xl md:text-7xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'newspaper' },
  },
  broadsheet: {
    name: 'Broadsheet',
    backgroundColor: '#080808',
    cardBackground: '#0f0f0f',
    cardBorder: '#1e1e1e',
    textPrimary: '#d4d4d4',
    textSecondary: '#525252',
    accentColor: '#a16207',
    statusColors: { backlog: '#292524', in_progress: '#a16207', qa: '#854d0e', completed: '#4d7c0f' },
    layout: { fontFamily: '"Merriweather", "Georgia", serif', cardStyle: 'minimal', cardBorderRadius: 0, cardGlow: false, cardOpacity: 100, sectionSpacing: 'normal', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'newspaper' },
  },

  // More STACKED variants
  ember: {
    name: 'Ember',
    backgroundColor: '#0a0500',
    backgroundGradient: { start: '#0a0500', end: '#1a0a00' },
    cardBackground: 'rgba(30, 15, 0, 0.9)',
    cardBorder: 'rgba(251, 146, 60, 0.4)',
    textPrimary: '#fff7ed',
    textSecondary: '#9a3412',
    accentColor: '#fb923c',
    statusColors: { backlog: '#431407', in_progress: '#fb923c', qa: '#fbbf24', completed: '#4ade80' },
    layout: { fontFamily: '"DM Sans", sans-serif', cardStyle: 'left-accent', cardBorderRadius: 10, cardGlow: true, cardOpacity: 88, sectionSpacing: 'normal', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-sm', cardPadding: 'p-6', borderWidth: 2, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'stacked' },
  },
  cobalt: {
    name: 'Cobalt',
    backgroundColor: '#000814',
    backgroundGradient: { start: '#000814', end: '#001233' },
    cardBackground: 'rgba(0, 18, 51, 0.85)',
    cardBorder: 'rgba(0, 119, 255, 0.4)',
    textPrimary: '#caf0f8',
    textSecondary: '#0077ff',
    accentColor: '#0096ff',
    statusColors: { backlog: '#023e8a', in_progress: '#0096ff', qa: '#48cae4', completed: '#00b4d8' },
    layout: { fontFamily: '"Outfit", sans-serif', cardStyle: 'left-accent', cardBorderRadius: 8, cardGlow: false, cardOpacity: 85, sectionSpacing: 'normal', roadmapWidth: 'max-w-5xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-2xl md:text-3xl', taskTitleSize: 'text-sm', cardPadding: 'p-6', borderWidth: 2, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'stacked' },
  },

  // More GRID variants
  grid_neon: {
    name: 'Grid Neon',
    backgroundColor: '#030712',
    backgroundGradient: { start: '#030712', end: '#0a0f1e' },
    cardBackground: 'rgba(10, 15, 30, 0.9)',
    cardBorder: 'rgba(34, 211, 238, 0.3)',
    textPrimary: '#ecfeff',
    textSecondary: '#22d3ee',
    accentColor: '#22d3ee',
    statusColors: { backlog: '#164e63', in_progress: '#22d3ee', qa: '#818cf8', completed: '#34d399' },
    layout: { fontFamily: '"JetBrains Mono", monospace', cardStyle: 'full', cardBorderRadius: 10, cardGlow: true, cardOpacity: 85, sectionSpacing: 'normal', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-sm', cardPadding: 'p-6', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'grid' },
  },
  grid_rose: {
    name: 'Grid Rose',
    backgroundColor: '#0a0005',
    backgroundGradient: { start: '#0a0005', end: '#1a000f' },
    cardBackground: 'rgba(20, 0, 10, 0.9)',
    cardBorder: 'rgba(244, 63, 94, 0.3)',
    textPrimary: '#fff1f2',
    textSecondary: '#9f1239',
    accentColor: '#f43f5e',
    statusColors: { backlog: '#4c0519', in_progress: '#f43f5e', qa: '#fb923c', completed: '#4ade80' },
    layout: { fontFamily: '"Plus Jakarta Sans", sans-serif', cardStyle: 'full', cardBorderRadius: 14, cardGlow: false, cardOpacity: 85, sectionSpacing: 'normal', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-sm', cardPadding: 'p-6', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'grid' },
  },

  // More KANBAN variants
  kanban_slate: {
    name: 'Kanban Slate',
    backgroundColor: '#0f172a',
    cardBackground: '#1e293b',
    cardBorder: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#64748b',
    accentColor: '#38bdf8',
    statusColors: { backlog: '#334155', in_progress: '#38bdf8', qa: '#818cf8', completed: '#34d399' },
    layout: { fontFamily: '"Inter", sans-serif', cardStyle: 'full', cardBorderRadius: 10, cardGlow: false, cardOpacity: 90, sectionSpacing: 'compact', roadmapWidth: 'max-w-7xl', mainTitleSize: 'text-4xl md:text-5xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'kanban' },
  },
  kanban_amber: {
    name: 'Kanban Amber',
    backgroundColor: '#0c0800',
    backgroundGradient: { start: '#0c0800', end: '#1a1000' },
    cardBackground: 'rgba(26, 16, 0, 0.95)',
    cardBorder: 'rgba(245, 158, 11, 0.4)',
    textPrimary: '#fffbeb',
    textSecondary: '#92400e',
    accentColor: '#f59e0b',
    statusColors: { backlog: '#451a03', in_progress: '#f59e0b', qa: '#fb923c', completed: '#4ade80' },
    layout: { fontFamily: '"DM Mono", monospace', cardStyle: 'left-accent', cardBorderRadius: 6, cardGlow: false, cardOpacity: 95, sectionSpacing: 'compact', roadmapWidth: 'max-w-7xl', mainTitleSize: 'text-4xl md:text-5xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 2, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'kanban' },
  },

  // More TIMELINE variants
  timeline_gold: {
    name: 'Timeline Gold',
    backgroundColor: '#0a0800',
    backgroundGradient: { start: '#0a0800', end: '#141000' },
    cardBackground: 'rgba(20, 16, 0, 0.9)',
    cardBorder: 'rgba(212, 175, 55, 0.4)',
    textPrimary: '#fefce8',
    textSecondary: '#854d0e',
    accentColor: '#d4af37',
    statusColors: { backlog: '#422006', in_progress: '#d4af37', qa: '#fb923c', completed: '#4ade80' },
    layout: { fontFamily: '"Playfair Display", serif', cardStyle: 'full', cardBorderRadius: 8, cardGlow: false, cardOpacity: 90, sectionSpacing: 'normal', roadmapWidth: 'max-w-4xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'timeline' },
  },
  timeline_mint: {
    name: 'Timeline Mint',
    backgroundColor: '#020f0a',
    backgroundGradient: { start: '#020f0a', end: '#041a10' },
    cardBackground: 'rgba(4, 26, 16, 0.9)',
    cardBorder: 'rgba(52, 211, 153, 0.35)',
    textPrimary: '#ecfdf5',
    textSecondary: '#065f46',
    accentColor: '#34d399',
    statusColors: { backlog: '#064e3b', in_progress: '#34d399', qa: '#06b6d4', completed: '#4ade80' },
    layout: { fontFamily: '"Nunito", sans-serif', cardStyle: 'left-accent', cardBorderRadius: 10, cardGlow: false, cardOpacity: 88, sectionSpacing: 'normal', roadmapWidth: 'max-w-4xl', mainTitleSize: 'text-5xl md:text-6xl', versionTitleSize: 'text-xl md:text-2xl', taskTitleSize: 'text-sm', cardPadding: 'p-5', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'timeline' },
  },

  // More MAGAZINE variants
  magazine_dark: {
    name: 'Magazine Dark',
    backgroundColor: '#050505',
    cardBackground: '#0d0d0d',
    cardBorder: '#1a1a1a',
    textPrimary: '#f5f5f5',
    textSecondary: '#525252',
    accentColor: '#a3a3a3',
    statusColors: { backlog: '#262626', in_progress: '#a3a3a3', qa: '#737373', completed: '#525252' },
    layout: { fontFamily: '"Sora", sans-serif', cardStyle: 'full', cardBorderRadius: 16, cardGlow: false, cardOpacity: 100, sectionSpacing: 'relaxed', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-6xl md:text-7xl', versionTitleSize: 'text-3xl md:text-4xl', taskTitleSize: 'text-base', cardPadding: 'p-8', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'solid', layoutVariant: 'magazine' },
  },
  magazine_teal: {
    name: 'Magazine Teal',
    backgroundColor: '#020c0c',
    backgroundGradient: { start: '#020c0c', end: '#041818' },
    cardBackground: 'rgba(4, 24, 24, 0.9)',
    cardBorder: 'rgba(20, 184, 166, 0.3)',
    textPrimary: '#f0fdfa',
    textSecondary: '#0f766e',
    accentColor: '#14b8a6',
    statusColors: { backlog: '#134e4a', in_progress: '#14b8a6', qa: '#06b6d4', completed: '#4ade80' },
    layout: { fontFamily: '"Outfit", sans-serif', cardStyle: 'full', cardBorderRadius: 20, cardGlow: false, cardOpacity: 85, sectionSpacing: 'relaxed', roadmapWidth: 'max-w-6xl', mainTitleSize: 'text-6xl md:text-7xl', versionTitleSize: 'text-3xl md:text-4xl', taskTitleSize: 'text-base', cardPadding: 'p-8', borderWidth: 1, showFloatingOrbs: false, orbCount: 0, backgroundType: 'gradient', layoutVariant: 'magazine' },
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

export const applyThemeToSettings = (themeId: string, current: RoadmapSettings): RoadmapSettings => {
  const theme = ROADMAP_THEMES[themeId];
  if (!theme) return { ...current, theme: themeId };
  return {
    ...current,
    theme: themeId,
    useCustomColors: false,
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
        end: settings.customBackgroundGradientEnd || baseTheme.backgroundGradient?.end || settings.customBackgroundColor,
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
        completed: settings.customStatusCompleted || baseTheme.statusColors.completed,
      },
      layout: baseTheme.layout,
    };
  }
  if (settings.theme === 'custom' && settings.customTheme) {
    return { ...baseTheme, ...settings.customTheme, statusColors: { ...baseTheme.statusColors, ...settings.customTheme.statusColors }, layout: baseTheme.layout };
  }
  return baseTheme;
};
