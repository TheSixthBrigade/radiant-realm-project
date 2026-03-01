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

  // ── TACTICAL: pure black, monospace, outlined badges ─────────────────────
  tactical: {
    id: 'tactical',
    name: 'Tactical',
    description: 'Pure black. Monospace. Outlined status badges. Circle icons.',
    bg: '#000000',
    surface: '#0d0d0d',
    surfaceAlt: '#141414',
    border: '#2a2a2a',
    text: '#f0f0f0',
    textMuted: '#888888',
    accent: '#00cc88',
    accentAlt: '#00ffaa',
    status: { backlog: '#666666', in_progress: '#00cc88', qa: '#e8a020', completed: '#00cc88' },
    font: '"JetBrains Mono", "Fira Code", monospace',
    layout: 'tactical',
  },

  // ── CYBER: deep navy, neon cyan glow ─────────────────────────────────────
  cyber: {
    id: 'cyber',
    name: 'Cyber',
    description: 'Deep navy with neon cyan. Glowing borders. HUD-style headers.',
    bg: '#03060d',
    bgGradient: 'linear-gradient(180deg, #03060d 0%, #050a14 100%)',
    surface: '#080f1c',
    surfaceAlt: '#0d1828',
    border: '#1a3a50',
    text: '#d8f0f8',
    textMuted: '#5a8a9a',
    accent: '#00d4ff',
    accentAlt: '#00ffff',
    status: { backlog: '#3a5a6a', in_progress: '#00d4ff', qa: '#ff8c00', completed: '#00e87a' },
    font: '"JetBrains Mono", "Fira Code", monospace',
    layout: 'cyber',
  },

  // ── GHOST: pure text, ultra minimal ──────────────────────────────────────
  ghost: {
    id: 'ghost',
    name: 'Ghost',
    description: 'No cards. No borders. Just text and status dots on a dark field.',
    bg: '#0a0a0a',
    surface: '#111111',
    surfaceAlt: '#181818',
    border: '#282828',
    text: '#e0e0e0',
    textMuted: '#707070',
    accent: '#a0a0a0',
    accentAlt: '#c0c0c0',
    status: { backlog: '#606060', in_progress: '#c0c0c0', qa: '#909090', completed: '#e0e0e0' },
    font: '"Inter", system-ui, sans-serif',
    layout: 'ghost',
  },

  // ── MATRIX: green on black, terminal aesthetic ───────────────────────────
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    description: 'Green on black. Terminal output. Monospace.',
    bg: '#000000',
    surface: '#040a04',
    surfaceAlt: '#081408',
    border: '#143014',
    text: '#00e040',
    textMuted: '#2a7a2a',
    accent: '#00ff41',
    accentAlt: '#00cc33',
    status: { backlog: '#2a5a2a', in_progress: '#00cc33', qa: '#c8c800', completed: '#00ff41' },
    font: '"JetBrains Mono", "Courier New", monospace',
    layout: 'matrix',
  },

  // ── SLATE: dark slate, clean SaaS ────────────────────────────────────────
  slate: {
    id: 'slate',
    name: 'Slate',
    description: 'Dark slate. Clean SaaS product roadmap. Dense rows. Pill badges.',
    bg: '#0c0d10',
    bgGradient: 'linear-gradient(180deg, #0c0d10 0%, #0f1014 100%)',
    surface: '#14161c',
    surfaceAlt: '#1a1d26',
    border: '#252830',
    text: '#dde0ec',
    textMuted: '#6a7090',
    accent: '#6470f0',
    accentAlt: '#8490ff',
    status: { backlog: '#404560', in_progress: '#6470f0', qa: '#a855f7', completed: '#10b981' },
    font: '"Inter", "DM Sans", sans-serif',
    layout: 'slate',
  },
};

export const DEFAULT_ROADMAP_SETTINGS: RoadmapSettings = {
  theme: 'tactical',
  title: 'Development Roadmap',
  subtitle: "Track our progress and see what we're building",
  showSuggestions: true,
  suggestionsLimit: 10,
  defaultExpanded: true,
  useCustomColors: false,
  customAccentColor: '#00cc88',
  customBg: '#000000',
  customBgEnd: '#0d0d0d',
  customSurface: '#0d0d0d',
  customText: '#f0f0f0',
  customTextMuted: '#888888',
  customStatusBacklog: '#666666',
  customStatusInProgress: '#00cc88',
  customStatusQa: '#e8a020',
  customStatusCompleted: '#00cc88',
  cardOpacity: 100,
  cardBorderRadius: 0,
  sectionSpacing: 'normal',
  fontFamily: '',
  layoutVariant: 'tactical',
  backgroundType: 'solid',
  backgroundImage: '',
  backgroundOverlayOpacity: 70,
  showHeader: true,
  showLogo: true,
  cardGlow: false,
  showFloatingOrbs: false,
  orbColor: '#00cc88',
  orbCount: 0,
  cardStyle: 'full',
  roadmapWidth: 'max-w-4xl',
  mainTitleSize: 'text-4xl',
  versionTitleSize: 'text-xl',
  taskTitleSize: 'text-sm',
  cardPadding: 'p-6',
  taskCardPadding: 'p-3',
  taskCardOpacity: 100,
  cardShadow: 'none',
  cardGlowIntensity: 0,
  glowIntensity: 0,
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
  customBackgroundColor: '#000000',
  customBackgroundGradientStart: '#000000',
  customBackgroundGradientEnd: '#080808',
  useBackgroundGradient: false,
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
  const base = ROADMAP_THEMES[settings.theme] || ROADMAP_THEMES.tactical;
  if (!settings.useCustomColors) return base;
  return {
    ...base,
    bg: settings.customBg || base.bg,
    bgGradient: settings.customBgEnd
      ? `linear-gradient(135deg, ${settings.customBg} 0%, ${settings.customBgEnd} 100%)`
      : base.bgGradient,
    surface: settings.customSurface || base.surface,
    border: settings.customCardBorder || base.border,
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
