export interface RoadmapTheme {
  id: string;
  name: string;
  description: string;
  bg: string;
  bgGradient?: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentAlt: string;
  status: { backlog: string; in_progress: string; qa: string; completed: string };
  font: string;
  layout: string;
}

export interface RoadmapSettings {
  theme: string;
  title: string;
  subtitle: string;
  showSuggestions: boolean;
  suggestionsLimit: number;
  defaultExpanded: boolean;
  useCustomColors: boolean;
  customAccentColor: string;
  customBg: string;
  customBgEnd: string;
  customSurface: string;
  customText: string;
  customTextMuted: string;
  customStatusBacklog: string;
  customStatusInProgress: string;
  customStatusQa: string;
  customStatusCompleted: string;
  cardOpacity: number;
  cardBorderRadius: number;
  sectionSpacing: string;
  fontFamily: string;
  layoutVariant: string;
  backgroundType: string;
  backgroundImage: string;
  backgroundOverlayOpacity: number;
  showHeader: boolean;
  showLogo: boolean;
  cardGlow: boolean;
  showFloatingOrbs: boolean;
  orbColor: string;
  orbCount: number;
  cardStyle: string;
  roadmapWidth: string;
  mainTitleSize: string;
  versionTitleSize: string;
  taskTitleSize: string;
  cardPadding: string;
  taskCardPadding: string;
  taskCardOpacity: number;
  cardShadow: string;
  cardGlowIntensity: number;
  glowIntensity: number;
  borderWidth: number;
  stylePreset: string;
  showHero: boolean;
  heroImage: string;
  heroOverlayOpacity: number;
  heroHeight: string;
  customCardBackground: string;
  customCardBorder: string;
  customTextPrimary: string;
  customTextSecondary: string;
  customBackgroundColor: string;
  customBackgroundGradientStart: string;
  customBackgroundGradientEnd: string;
  useBackgroundGradient: boolean;
}

export const ROADMAP_THEMES: Record<string, RoadmapTheme> = {

  ghost: {
    id: 'ghost',
    name: 'Ghost',
    description: 'Pure typography, no cards. Clean changelog aesthetic.',
    bg: '#0a0a0a',
    surface: '#111',
    surfaceAlt: '#161616',
    border: '#222',
    text: '#f0f0f0',
    textMuted: '#555',
    accent: '#e5e5e5',
    accentAlt: '#666',
    status: { backlog: '#444', in_progress: '#a3a3a3', qa: '#737373', completed: '#d4d4d4' },
    font: 'Inter, system-ui, sans-serif',
    layout: 'ghost',
  },

  kanban: {
    id: 'kanban',
    name: 'Kanban',
    description: 'True board layout — tasks as chips in status columns.',
    bg: '#0c0c10',
    bgGradient: 'linear-gradient(160deg, #0c0c10 0%, #10101a 100%)',
    surface: '#16161f',
    surfaceAlt: '#1c1c28',
    border: '#252535',
    text: '#d4d4e8',
    textMuted: '#555570',
    accent: '#6366f1',
    accentAlt: '#818cf8',
    status: { backlog: '#3f3f5a', in_progress: '#6366f1', qa: '#a16207', completed: '#166534' },
    font: '"Inter", sans-serif',
    layout: 'kanban',
  },

  timeline: {
    id: 'timeline',
    name: 'Timeline',
    description: 'Alternating entries on a vertical spine with connectors.',
    bg: '#080b12',
    bgGradient: 'linear-gradient(180deg, #080b12 0%, #0a0e1a 100%)',
    surface: 'rgba(20,28,50,0.6)',
    surfaceAlt: 'rgba(25,35,60,0.5)',
    border: 'rgba(99,102,241,0.15)',
    text: '#c8d3e8',
    textMuted: '#3d4f6e',
    accent: '#6366f1',
    accentAlt: '#818cf8',
    status: { backlog: '#1e2a40', in_progress: '#6366f1', qa: '#7c3aed', completed: '#065f46' },
    font: '"Outfit", "Inter", sans-serif',
    layout: 'timeline',
  },

  terminal: {
    id: 'terminal',
    name: 'Terminal',
    description: 'Fake CLI output. Monospace, scanlines, no cards at all.',
    bg: '#000',
    surface: '#0a0a0a',
    surfaceAlt: '#0f0f0f',
    border: '#1a1a1a',
    text: '#00cc33',
    textMuted: '#005c17',
    accent: '#00cc33',
    accentAlt: '#00ff41',
    status: { backlog: '#1a2e1a', in_progress: '#00cc33', qa: '#cccc00', completed: '#00cc33' },
    font: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
    layout: 'terminal',
  },

  spotlight: {
    id: 'spotlight',
    name: 'Spotlight',
    description: 'One version at a time. Full-width hero with prev/next nav.',
    bg: '#050505',
    bgGradient: 'radial-gradient(ellipse at 50% 0%, #150a25 0%, #050505 60%)',
    surface: '#0d0d0d',
    surfaceAlt: '#121212',
    border: '#1c1c1c',
    text: '#e8e8e8',
    textMuted: '#4a4a4a',
    accent: '#7c3aed',
    accentAlt: '#9d5cf6',
    status: { backlog: '#1c1c1c', in_progress: '#7c3aed', qa: '#92400e', completed: '#14532d' },
    font: '"Sora", "Inter", sans-serif',
    layout: 'spotlight',
  },

  bento: {
    id: 'bento',
    name: 'Bento',
    description: 'CSS grid mosaic — each version tile a different size.',
    bg: '#07090f',
    bgGradient: 'linear-gradient(135deg, #07090f 0%, #0b0f1a 100%)',
    surface: 'rgba(255,255,255,0.03)',
    surfaceAlt: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.07)',
    text: '#d1d5db',
    textMuted: '#374151',
    accent: '#0891b2',
    accentAlt: '#06b6d4',
    status: { backlog: '#1e2a3a', in_progress: '#0e4f6a', qa: '#78350f', completed: '#064e3b' },
    font: '"Plus Jakarta Sans", "Inter", sans-serif',
    layout: 'bento',
  },

  glass: {
    id: 'glass',
    name: 'Glass',
    description: 'Frosted panels floating on a deep gradient mesh.',
    bg: '#030712',
    bgGradient: 'radial-gradient(ellipse at 20% 50%, #1e1b4b 0%, #030712 50%), radial-gradient(ellipse at 80% 20%, #0c2a4e 0%, transparent 50%)',
    surface: 'rgba(255,255,255,0.04)',
    surfaceAlt: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.09)',
    text: '#e2e8f0',
    textMuted: '#475569',
    accent: '#6366f1',
    accentAlt: '#818cf8',
    status: { backlog: 'rgba(71,85,105,0.7)', in_progress: '#4338ca', qa: '#6d28d9', completed: '#065f46' },
    font: '"Inter", sans-serif',
    layout: 'glass',
  },

  brutalist: {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Raw aesthetic. Thick borders, zero radius, heavy uppercase.',
    bg: '#0a0a0a',
    surface: '#111',
    surfaceAlt: '#0a0a0a',
    border: '#e5e5e5',
    text: '#e5e5e5',
    textMuted: '#737373',
    accent: '#e5e5e5',
    accentAlt: '#a3a3a3',
    status: { backlog: '#404040', in_progress: '#e5e5e5', qa: '#a3a3a3', completed: '#737373' },
    font: '"Space Grotesk", "Arial Black", sans-serif',
    layout: 'brutalist',
  },

  accordion: {
    id: 'accordion',
    name: 'Accordion',
    description: 'Animated expand/collapse with progress bars and stats.',
    bg: '#09090b',
    bgGradient: 'linear-gradient(180deg, #09090b 0%, #0f0f12 100%)',
    surface: '#18181b',
    surfaceAlt: '#1f1f23',
    border: '#27272a',
    text: '#f4f4f5',
    textMuted: '#52525b',
    accent: '#d97706',
    accentAlt: '#f59e0b',
    status: { backlog: '#3f3f46', in_progress: '#b45309', qa: '#92400e', completed: '#14532d' },
    font: '"DM Sans", "Inter", sans-serif',
    layout: 'accordion',
  },

  orbit: {
    id: 'orbit',
    name: 'Orbit',
    description: 'Radial layout — versions orbit a glowing center hub.',
    bg: '#02040a',
    bgGradient: 'radial-gradient(ellipse at center, #080f20 0%, #02040a 70%)',
    surface: 'rgba(14,22,48,0.8)',
    surfaceAlt: 'rgba(18,28,58,0.6)',
    border: 'rgba(99,102,241,0.15)',
    text: '#c8d3e8',
    textMuted: '#2d3a52',
    accent: '#6366f1',
    accentAlt: '#818cf8',
    status: { backlog: '#1e2a40', in_progress: '#4338ca', qa: '#5b21b6', completed: '#065f46' },
    font: '"Exo 2", "Inter", sans-serif',
    layout: 'orbit',
  },

  newspaper: {
    id: 'newspaper',
    name: 'Newspaper',
    description: 'Editorial columns layout. Typographic hierarchy, no cards.',
    bg: '#0d0d0d',
    surface: '#111',
    surfaceAlt: '#141414',
    border: '#2a2a2a',
    text: '#d4d0c8',
    textMuted: '#5a5650',
    accent: '#c8b89a',
    accentAlt: '#a89880',
    status: { backlog: '#3a3530', in_progress: '#8a7a60', qa: '#6a5a40', completed: '#4a5a3a' },
    font: '"Playfair Display", "Georgia", serif',
    layout: 'newspaper',
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-sparse. Large numbers, huge whitespace, no decoration.',
    bg: '#0a0a0a',
    surface: '#0f0f0f',
    surfaceAlt: '#141414',
    border: '#1a1a1a',
    text: '#e8e8e8',
    textMuted: '#3a3a3a',
    accent: '#e8e8e8',
    accentAlt: '#888',
    status: { backlog: '#2a2a2a', in_progress: '#888', qa: '#666', completed: '#aaa' },
    font: '"DM Mono", "JetBrains Mono", monospace',
    layout: 'minimal',
  },

  sidebar: {
    id: 'sidebar',
    name: 'Sidebar',
    description: 'Fixed left nav of versions, right panel shows tasks.',
    bg: '#080a0f',
    bgGradient: 'linear-gradient(135deg, #080a0f 0%, #0c0f18 100%)',
    surface: '#0f1219',
    surfaceAlt: '#141820',
    border: '#1e2330',
    text: '#c8d0e0',
    textMuted: '#3a4255',
    accent: '#5b7fa6',
    accentAlt: '#7a9fc6',
    status: { backlog: '#1e2a3a', in_progress: '#2a4a6a', qa: '#3a2a5a', completed: '#1a3a2a' },
    font: '"Inter", sans-serif',
    layout: 'sidebar',
  },

  table: {
    id: 'table',
    name: 'Table',
    description: 'Spreadsheet-style rows with inline status badges.',
    bg: '#080a0c',
    surface: '#0d1014',
    surfaceAlt: '#111518',
    border: '#1a1f26',
    text: '#c0c8d4',
    textMuted: '#3a4250',
    accent: '#4a7a9b',
    accentAlt: '#6a9abb',
    status: { backlog: '#1e2a38', in_progress: '#1a3a5a', qa: '#2a1a4a', completed: '#0a2a1a' },
    font: '"IBM Plex Mono", "JetBrains Mono", monospace',
    layout: 'table',
  },

  cards3d: {
    id: 'cards3d',
    name: 'Cards 3D',
    description: 'Stacked cards with depth shadows and layered perspective.',
    bg: '#060810',
    bgGradient: 'linear-gradient(160deg, #060810 0%, #0a0c18 100%)',
    surface: '#0f1220',
    surfaceAlt: '#141828',
    border: '#1e2438',
    text: '#c4cce0',
    textMuted: '#3a4260',
    accent: '#4a5a8a',
    accentAlt: '#6a7aaa',
    status: { backlog: '#1e2a40', in_progress: '#2a3a6a', qa: '#3a2a5a', completed: '#1a3a2a' },
    font: '"Outfit", "Inter", sans-serif',
    layout: 'cards3d',
  },
};

export const DEFAULT_ROADMAP_SETTINGS: RoadmapSettings = {
  theme: 'ghost',
  title: 'Development Roadmap',
  subtitle: "Track our progress and see what we're building",
  showSuggestions: true,
  suggestionsLimit: 10,
  defaultExpanded: true,
  useCustomColors: false,
  customAccentColor: '#6366f1',
  customBg: '#0c0c10',
  customBgEnd: '#10101a',
  customSurface: '#16161f',
  customText: '#d4d4e8',
  customTextMuted: '#555570',
  customStatusBacklog: '#3f3f5a',
  customStatusInProgress: '#6366f1',
  customStatusQa: '#a16207',
  customStatusCompleted: '#166534',
  cardOpacity: 90,
  cardBorderRadius: 12,
  sectionSpacing: 'normal',
  fontFamily: '',
  layoutVariant: 'ghost',
  backgroundType: 'gradient',
  backgroundImage: '',
  backgroundOverlayOpacity: 70,
  showHeader: true,
  showLogo: true,
  cardGlow: false,
  showFloatingOrbs: false,
  orbColor: '#6366f1',
  orbCount: 0,
  cardStyle: 'full',
  roadmapWidth: 'max-w-5xl',
  mainTitleSize: 'text-5xl',
  versionTitleSize: 'text-2xl',
  taskTitleSize: 'text-sm',
  cardPadding: 'p-6',
  taskCardPadding: 'p-3',
  taskCardOpacity: 90,
  cardShadow: 'medium',
  cardGlowIntensity: 50,
  glowIntensity: 50,
  borderWidth: 1,
  stylePreset: 'default',
  showHero: false,
  heroImage: '',
  heroOverlayOpacity: 50,
  heroHeight: 'medium',
  customCardBackground: '',
  customCardBorder: '',
  customTextPrimary: '',
  customTextSecondary: '',
  customBackgroundColor: '#0c0c10',
  customBackgroundGradientStart: '#0c0c10',
  customBackgroundGradientEnd: '#10101a',
  useBackgroundGradient: true,
};

export const applyThemeToSettings = (themeId: string, current: RoadmapSettings): RoadmapSettings => {
  const theme = ROADMAP_THEMES[themeId];
  if (!theme) return { ...current, theme: themeId };
  return {
    ...current,
    theme: themeId,
    layoutVariant: theme.layout,
    useCustomColors: false,
    fontFamily: theme.font,
  };
};

export const getTheme = (settings: RoadmapSettings): RoadmapTheme => {
  const base = ROADMAP_THEMES[settings.theme] || ROADMAP_THEMES.ghost;
  if (!settings.useCustomColors) return base;
  return {
    ...base,
    bg: settings.customBg || base.bg,
    bgGradient: settings.customBgEnd ? `linear-gradient(135deg, ${settings.customBg} 0%, ${settings.customBgEnd} 100%)` : base.bgGradient,
    surface: settings.customSurface || base.surface,
    text: settings.customText || base.text,
    textMuted: settings.customTextMuted || base.textMuted,
    accent: settings.customAccentColor || base.accent,
    status: {
      backlog: settings.customStatusBacklog || base.status.backlog,
      in_progress: settings.customStatusInProgress || base.status.in_progress,
      qa: settings.customStatusQa || base.status.qa,
      completed: settings.customStatusCompleted || base.status.completed,
    },
  };
};
