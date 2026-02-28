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
    status: { backlog: '#444', in_progress: '#a3e635', qa: '#fb923c', completed: '#4ade80' },
    font: 'Inter, system-ui, sans-serif',
    layout: 'ghost',
  },

  kanban: {
    id: 'kanban',
    name: 'Kanban',
    description: 'True board layout — tasks as sticky chips in status columns.',
    bg: '#0f0f13',
    bgGradient: 'linear-gradient(160deg, #0f0f13 0%, #13111a 100%)',
    surface: '#1a1825',
    surfaceAlt: '#201e2e',
    border: '#2d2a3e',
    text: '#e8e4ff',
    textMuted: '#6b6585',
    accent: '#7c6af7',
    accentAlt: '#a78bfa',
    status: { backlog: '#4b5563', in_progress: '#7c6af7', qa: '#f59e0b', completed: '#10b981' },
    font: '"Inter", sans-serif',
    layout: 'kanban',
  },

  timeline: {
    id: 'timeline',
    name: 'Timeline',
    description: 'Alternating left/right entries on an animated glowing spine.',
    bg: '#020617',
    bgGradient: 'linear-gradient(180deg, #020617 0%, #050d2e 100%)',
    surface: 'rgba(14,22,60,0.7)',
    surfaceAlt: 'rgba(20,30,80,0.5)',
    border: 'rgba(59,130,246,0.2)',
    text: '#e0f2fe',
    textMuted: '#4a7fa5',
    accent: '#3b82f6',
    accentAlt: '#60a5fa',
    status: { backlog: '#1e3a5f', in_progress: '#3b82f6', qa: '#8b5cf6', completed: '#10b981' },
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
    text: '#00ff41',
    textMuted: '#006b1a',
    accent: '#00ff41',
    accentAlt: '#39ff14',
    status: { backlog: '#1a3a1a', in_progress: '#00ff41', qa: '#ffff00', completed: '#00ff41' },
    font: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
    layout: 'terminal',
  },

  spotlight: {
    id: 'spotlight',
    name: 'Spotlight',
    description: 'One version at a time. Full-width hero with animated glow ring.',
    bg: '#050505',
    bgGradient: 'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #050505 60%)',
    surface: '#0f0f0f',
    surfaceAlt: '#141414',
    border: '#1f1f1f',
    text: '#ffffff',
    textMuted: '#555',
    accent: '#a855f7',
    accentAlt: '#c084fc',
    status: { backlog: '#292524', in_progress: '#a855f7', qa: '#f59e0b', completed: '#4ade80' },
    font: '"Sora", "Inter", sans-serif',
    layout: 'spotlight',
  },

  bento: {
    id: 'bento',
    name: 'Bento',
    description: 'CSS grid mosaic — each version tile a different size and shape.',
    bg: '#080c14',
    bgGradient: 'linear-gradient(135deg, #080c14 0%, #0d1220 100%)',
    surface: 'rgba(255,255,255,0.04)',
    surfaceAlt: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.08)',
    text: '#f1f5f9',
    textMuted: '#475569',
    accent: '#06b6d4',
    accentAlt: '#22d3ee',
    status: { backlog: '#1e3a5f', in_progress: '#06b6d4', qa: '#f59e0b', completed: '#10b981' },
    font: '"Plus Jakarta Sans", "Inter", sans-serif',
    layout: 'bento',
  },

  glass: {
    id: 'glass',
    name: 'Glass',
    description: 'Frosted panels floating on an animated gradient mesh.',
    bg: '#030712',
    bgGradient: 'radial-gradient(ellipse at 20% 50%, #1e1b4b 0%, #030712 50%), radial-gradient(ellipse at 80% 20%, #0c4a6e 0%, transparent 50%)',
    surface: 'rgba(255,255,255,0.05)',
    surfaceAlt: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.1)',
    text: '#f8fafc',
    textMuted: '#64748b',
    accent: '#818cf8',
    accentAlt: '#a5b4fc',
    status: { backlog: 'rgba(100,116,139,0.8)', in_progress: '#818cf8', qa: '#c084fc', completed: '#34d399' },
    font: '"Inter", sans-serif',
    layout: 'glass',
  },

  brutalist: {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Raw HTML aesthetic. Thick borders, no radius, heavy uppercase.',
    bg: '#0a0a0a',
    surface: '#111',
    surfaceAlt: '#0a0a0a',
    border: '#fff',
    text: '#fff',
    textMuted: '#888',
    accent: '#ff0',
    accentAlt: '#f00',
    status: { backlog: '#333', in_progress: '#ff0', qa: '#f90', completed: '#0f0' },
    font: '"Space Grotesk", "Arial Black", sans-serif',
    layout: 'brutalist',
  },

  accordion: {
    id: 'accordion',
    name: 'Accordion',
    description: 'Smooth animated expand/collapse with progress bars and stats.',
    bg: '#09090b',
    bgGradient: 'linear-gradient(180deg, #09090b 0%, #0f0f12 100%)',
    surface: '#18181b',
    surfaceAlt: '#1f1f23',
    border: '#27272a',
    text: '#fafafa',
    textMuted: '#52525b',
    accent: '#f97316',
    accentAlt: '#fb923c',
    status: { backlog: '#3f3f46', in_progress: '#f97316', qa: '#eab308', completed: '#22c55e' },
    font: '"DM Sans", "Inter", sans-serif',
    layout: 'accordion',
  },

  orbit: {
    id: 'orbit',
    name: 'Orbit',
    description: 'Radial layout — versions orbit a glowing center hub.',
    bg: '#02040a',
    bgGradient: 'radial-gradient(ellipse at center, #0a0f1e 0%, #02040a 70%)',
    surface: 'rgba(16,24,48,0.8)',
    surfaceAlt: 'rgba(20,30,60,0.6)',
    border: 'rgba(56,189,248,0.15)',
    text: '#e0f2fe',
    textMuted: '#334155',
    accent: '#38bdf8',
    accentAlt: '#7dd3fc',
    status: { backlog: '#1e3a5f', in_progress: '#38bdf8', qa: '#818cf8', completed: '#34d399' },
    font: '"Exo 2", "Inter", sans-serif',
    layout: 'orbit',
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
  customAccentColor: '#7c6af7',
  customBg: '#0f0f13',
  customBgEnd: '#13111a',
  customSurface: '#1a1825',
  customText: '#e8e4ff',
  customTextMuted: '#6b6585',
  customStatusBacklog: '#4b5563',
  customStatusInProgress: '#7c6af7',
  customStatusQa: '#f59e0b',
  customStatusCompleted: '#10b981',
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
  orbColor: '#7c6af7',
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
  customBackgroundColor: '#0f0f13',
  customBackgroundGradientStart: '#0f0f13',
  customBackgroundGradientEnd: '#13111a',
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
