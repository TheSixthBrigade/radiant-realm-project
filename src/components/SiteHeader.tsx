import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, X, ExternalLink, Home, ShoppingBag, Map, MessageCircle, BookOpen, Info, FileText, Settings,
  User, LayoutDashboard, BarChart, Package, ShoppingCart, Heart, Star, Bell, Mail, Search,
  Grid, List, Calendar, Clock, Globe, Link as LinkIcon, Download, Upload, Users, Zap, Award,
  Coffee, Gamepad2, Music, Camera, Video, Palette, Code, Terminal, Database, Cloud
} from 'lucide-react';

// Extended icon mapping for nav links (28+ icons)
export const NAV_ICONS: Record<string, React.ElementType> = {
  home: Home,
  store: ShoppingBag,
  shop: ShoppingCart,
  roadmap: Map,
  community: MessageCircle,
  forum: Users,
  kb: BookOpen,
  docs: FileText,
  about: Info,
  tos: FileText,
  settings: Settings,
  profile: User,
  dashboard: LayoutDashboard,
  analytics: BarChart,
  products: Package,
  cart: ShoppingCart,
  heart: Heart,
  star: Star,
  bell: Bell,
  mail: Mail,
  search: Search,
  grid: Grid,
  list: List,
  calendar: Calendar,
  clock: Clock,
  globe: Globe,
  link: LinkIcon,
  download: Download,
  upload: Upload,
  users: Users,
  zap: Zap,
  award: Award,
  coffee: Coffee,
  gaming: Gamepad2,
  music: Music,
  camera: Camera,
  video: Video,
  palette: Palette,
  code: Code,
  terminal: Terminal,
  database: Database,
  cloud: Cloud,
};

export interface NavLink {
  id: string;
  label: string;
  type: 'page' | 'external';
  pageSlug?: string;
  externalUrl?: string;
  openInNewTab?: boolean;
  order: number;
  icon?: string; // Icon key from NAV_ICONS
}

export interface HeaderConfig {
  enabled: boolean;
  logoUrl?: string;
  siteName?: string;
  showSiteName: boolean;
  backgroundColor: string;
  textColor: string;
  isTransparent: boolean;
  isSticky: boolean;
  navLinks: NavLink[];
  accentColor: string;
  // Template
  templateId?: string;
  // Navigation styles - expanded to 8 options
  navStyle: 'default' | 'pills' | 'underline' | 'buttons' | 'gradient' | 'ghost' | 'outlined' | 'floating';
  navPosition: 'left' | 'center' | 'right';
  showIcons: boolean;
  pillBorderRadius: number;
  navBackgroundColor: string;
  navBorderColor: string;
  activeStyle: 'filled' | 'outline' | 'underline';
  navSpacing: 'compact' | 'normal' | 'relaxed';
  headerPadding: 'small' | 'medium' | 'large';
  // NEW: Header layout mode
  headerLayout: 'full' | 'floating-nav' | 'minimal';
  // NEW: Scroll effects
  scrollEffect: 'none' | 'fade-in' | 'blur-in' | 'slide-down';
  // NEW: Hide logo/name completely
  hideLogo: boolean;
}

export interface SiteHeaderProps {
  config: HeaderConfig;
  currentPageSlug: string;
  baseUrl: string;
  storeName: string;
  isOwner: boolean;
}

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  enabled: true,
  showSiteName: true,
  backgroundColor: '#0f172a',
  textColor: '#ffffff',
  isTransparent: false,
  isSticky: true,
  navLinks: [],
  accentColor: '#14b8a6',
  // New defaults
  navStyle: 'pills',
  navPosition: 'center',
  showIcons: true,
  pillBorderRadius: 24,
  navBackgroundColor: '#1e293b',
  navBorderColor: '#334155',
  activeStyle: 'filled',
  navSpacing: 'normal',
  headerPadding: 'medium',
  // NEW defaults
  headerLayout: 'full',
  scrollEffect: 'none',
  hideLogo: false,
};

// Helper to get icon for a link
const getIconForLink = (link: NavLink): React.ElementType | null => {
  if (link.icon && NAV_ICONS[link.icon]) {
    return NAV_ICONS[link.icon];
  }
  // Auto-detect icon based on label or slug
  const key = (link.pageSlug || link.label || '').toLowerCase();
  if (key.includes('home') || key === '') return NAV_ICONS.home;
  if (key.includes('store') || key.includes('shop')) return NAV_ICONS.store;
  if (key.includes('roadmap')) return NAV_ICONS.roadmap;
  if (key.includes('community') || key.includes('forum')) return NAV_ICONS.community;
  if (key.includes('kb') || key.includes('knowledge')) return NAV_ICONS.kb;
  if (key.includes('about')) return NAV_ICONS.about;
  if (key.includes('tos') || key.includes('terms')) return NAV_ICONS.tos;
  return null;
};

export const SiteHeader = ({ 
  config, 
  currentPageSlug, 
  baseUrl, 
  storeName,
  isOwner 
}: SiteHeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  // Handle scroll effect
  useEffect(() => {
    if (config.scrollEffect === 'none') return;
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [config.scrollEffect]);

  if (!config.enabled) return null;

  const sortedLinks = [...(config.navLinks || [])].sort((a, b) => a.order - b.order);

  const isActiveLink = (link: NavLink) => {
    if (link.type === 'external') return false;
    const linkSlug = link.pageSlug || '';
    return currentPageSlug === linkSlug;
  };

  const handleLinkClick = (link: NavLink) => {
    setMobileMenuOpen(false);
    if (link.type === 'external' && link.externalUrl) {
      if (link.openInNewTab) {
        window.open(link.externalUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = link.externalUrl;
      }
    } else if (link.type === 'page') {
      const url = link.pageSlug ? `${baseUrl}/${link.pageSlug}` : baseUrl;
      navigate(url);
    }
  };

  // Check if we should show logo/name
  const showLogoSection = !config.hideLogo && config.headerLayout !== 'floating-nav';

  // Spacing classes
  const spacingClasses = {
    compact: 'gap-1',
    normal: 'gap-2',
    relaxed: 'gap-4',
  };

  const paddingClasses = {
    small: 'py-2',
    medium: 'py-4',
    large: 'py-6',
  };

  // Get nav button styles based on config - supports 8 styles
  const getNavButtonStyle = (link: NavLink, isActive: boolean): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      transition: 'all 0.2s ease',
    };

    // Pills style - rounded pill buttons
    if (config.navStyle === 'pills') {
      return {
        ...baseStyle,
        borderRadius: `${config.pillBorderRadius || 24}px`,
        padding: '8px 16px',
        backgroundColor: isActive 
          ? config.accentColor 
          : 'transparent',
        color: isActive ? '#ffffff' : config.textColor,
        border: 'none',
      };
    }

    // Buttons style - solid rectangular buttons
    if (config.navStyle === 'buttons') {
      return {
        ...baseStyle,
        borderRadius: '8px',
        padding: '8px 16px',
        backgroundColor: isActive 
          ? `${config.accentColor}20` 
          : 'transparent',
        color: isActive ? config.accentColor : config.textColor,
        border: isActive ? `1px solid ${config.accentColor}` : '1px solid transparent',
      };
    }

    // Underline style - text with underline on active
    if (config.navStyle === 'underline') {
      return {
        ...baseStyle,
        padding: '8px 12px',
        backgroundColor: 'transparent',
        color: isActive ? config.accentColor : config.textColor,
        borderBottom: isActive ? `2px solid ${config.accentColor}` : '2px solid transparent',
        borderRadius: 0,
      };
    }

    // Gradient style - gradient background on active
    if (config.navStyle === 'gradient') {
      return {
        ...baseStyle,
        borderRadius: `${config.pillBorderRadius || 12}px`,
        padding: '8px 16px',
        background: isActive 
          ? `linear-gradient(135deg, ${config.accentColor}, ${config.accentColor}aa)` 
          : 'transparent',
        color: isActive ? '#ffffff' : config.textColor,
        border: 'none',
        boxShadow: isActive ? `0 4px 15px ${config.accentColor}40` : 'none',
      };
    }

    // Ghost style - subtle hover, minimal active state
    if (config.navStyle === 'ghost') {
      return {
        ...baseStyle,
        padding: '8px 16px',
        backgroundColor: 'transparent',
        color: isActive ? config.accentColor : config.textColor,
        borderRadius: '4px',
        opacity: isActive ? 1 : 0.8,
        fontWeight: isActive ? 600 : 400,
      };
    }

    // Outlined style - border only, no fill
    if (config.navStyle === 'outlined') {
      return {
        ...baseStyle,
        borderRadius: `${config.pillBorderRadius || 8}px`,
        padding: '8px 16px',
        backgroundColor: 'transparent',
        color: isActive ? config.accentColor : config.textColor,
        border: `1px solid ${isActive ? config.accentColor : config.navBorderColor || 'rgba(255,255,255,0.2)'}`,
        boxShadow: isActive ? `0 0 10px ${config.accentColor}40` : 'none',
      };
    }

    // Floating style - elevated cards with shadow
    if (config.navStyle === 'floating') {
      return {
        ...baseStyle,
        borderRadius: '12px',
        padding: '10px 18px',
        backgroundColor: isActive 
          ? config.accentColor 
          : config.navBackgroundColor || 'rgba(255,255,255,0.1)',
        color: isActive ? '#ffffff' : config.textColor,
        border: 'none',
        boxShadow: isActive 
          ? `0 8px 25px ${config.accentColor}50` 
          : '0 4px 15px rgba(0,0,0,0.2)',
        transform: isActive ? 'translateY(-2px)' : 'none',
      };
    }

    // Default style
    return {
      ...baseStyle,
      padding: '8px 12px',
      borderRadius: '8px',
      backgroundColor: isActive ? `${config.accentColor}20` : 'transparent',
      color: isActive ? config.accentColor : config.textColor,
    };
  };

  // Nav container style for pills style
  const getNavContainerStyle = (): React.CSSProperties => {
    if (config.navStyle === 'pills') {
      return {
        backgroundColor: config.navBackgroundColor || '#1e293b',
        borderRadius: `${(config.pillBorderRadius || 24) + 8}px`,
        padding: '6px',
        border: `1px solid ${config.navBorderColor || '#334155'}`,
      };
    }
    return {};
  };

  // Get header background based on layout mode and scroll
  const getHeaderBackground = (): string => {
    // Floating nav mode - completely transparent header
    if (config.headerLayout === 'floating-nav') {
      return 'transparent';
    }
    
    // Minimal mode - very subtle background
    if (config.headerLayout === 'minimal') {
      if (config.scrollEffect !== 'none' && scrolled) {
        return config.backgroundColor;
      }
      return 'transparent';
    }
    
    // Full mode with scroll effects
    if (config.scrollEffect !== 'none') {
      if (config.scrollEffect === 'fade-in' && !scrolled) {
        return 'transparent';
      }
      if (config.scrollEffect === 'blur-in' && !scrolled) {
        return 'transparent';
      }
    }
    
    return config.isTransparent ? 'transparent' : config.backgroundColor;
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: getHeaderBackground(),
    color: config.textColor,
    transition: 'all 0.3s ease',
  };

  // Add scroll effect classes
  const getScrollEffectClasses = (): string => {
    if (config.scrollEffect === 'none') return '';
    
    if (config.scrollEffect === 'blur-in') {
      return scrolled ? 'backdrop-blur-md' : '';
    }
    if (config.scrollEffect === 'slide-down') {
      return scrolled ? 'translate-y-0' : '-translate-y-full';
    }
    return '';
  };

  // Position classes for nav
  const positionClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  // For floating-nav mode, center the nav absolutely
  if (config.headerLayout === 'floating-nav') {
    return (
      <header 
        className={`w-full z-50 ${config.isSticky ? 'fixed top-0 left-0 right-0' : ''}`}
        style={{ backgroundColor: 'transparent' }}
      >
        <div className={`flex justify-center ${paddingClasses[config.headerPadding || 'medium']}`}>
          {/* Floating Nav Container */}
          <nav className="flex items-center">
            <div 
              className={`flex items-center ${spacingClasses[config.navSpacing || 'normal']}`}
              style={getNavContainerStyle()}
            >
              {sortedLinks.map((link) => {
                const Icon = config.showIcons ? getIconForLink(link) : null;
                const isActive = isActiveLink(link);
                
                return (
                  <button
                    key={link.id}
                    onClick={() => handleLinkClick(link)}
                    className="flex items-center gap-2 text-sm font-medium whitespace-nowrap hover:opacity-90"
                    style={getNavButtonStyle(link, isActive)}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {link.label}
                    {link.type === 'external' && (
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Mobile Menu Button - Floating */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden fixed top-4 right-4 p-2 rounded-lg bg-gray-900/80 backdrop-blur-sm hover:bg-gray-800 transition-colors z-50"
          style={{ color: config.textColor }}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mobile Navigation - Floating */}
        {mobileMenuOpen && (
          <nav 
            className="md:hidden fixed top-16 left-4 right-4 p-4 rounded-2xl space-y-2 z-50"
            style={{ 
              backgroundColor: config.navBackgroundColor || '#1e293b',
              border: `1px solid ${config.navBorderColor || '#334155'}`,
            }}
          >
            {sortedLinks.map((link) => {
              const Icon = config.showIcons ? getIconForLink(link) : null;
              const isActive = isActiveLink(link);
              
              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    color: isActive ? '#ffffff' : config.textColor,
                    backgroundColor: isActive ? config.accentColor : 'transparent',
                  }}
                >
                  {Icon && <Icon className="w-5 h-5" />}
                  {link.label}
                  {link.type === 'external' && (
                    <ExternalLink className="w-4 h-4 opacity-60 ml-auto" />
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </header>
    );
  }

  return (
    <header 
      className={`w-full z-50 ${config.isSticky ? 'sticky top-0' : ''} ${config.isTransparent || config.headerLayout === 'minimal' ? 'backdrop-blur-md' : ''} ${getScrollEffectClasses()}`}
      style={headerStyle}
    >
      <div className={`max-w-7xl mx-auto px-4 ${paddingClasses[config.headerPadding || 'medium']}`}>
        <div className="flex items-center justify-between">
          {/* Logo / Site Name - conditionally shown */}
          {showLogoSection ? (
            <Link to={baseUrl} className="flex items-center gap-3 flex-shrink-0">
              {config.logoUrl && (
                <img 
                  src={config.logoUrl} 
                  alt={config.siteName || storeName} 
                  className="h-10 w-auto object-contain"
                />
              )}
              {(config.showSiteName || !config.logoUrl) && (
                <span className="text-xl font-bold" style={{ color: config.textColor }}>
                  {config.siteName || storeName}
                </span>
              )}
            </Link>
          ) : (
            <div /> /* Empty spacer when logo is hidden */
          )}

          {/* Desktop Navigation */}
          <nav className={`hidden md:flex items-center flex-1 ${positionClasses[config.navPosition || 'center']} mx-4`}>
            <div 
              className={`flex items-center ${spacingClasses[config.navSpacing || 'normal']}`}
              style={getNavContainerStyle()}
            >
              {sortedLinks.map((link) => {
                const Icon = config.showIcons ? getIconForLink(link) : null;
                const isActive = isActiveLink(link);
                
                return (
                  <button
                    key={link.id}
                    onClick={() => handleLinkClick(link)}
                    className="flex items-center gap-2 text-sm font-medium whitespace-nowrap hover:opacity-90"
                    style={getNavButtonStyle(link, isActive)}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {link.label}
                    {link.type === 'external' && (
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Spacer for right alignment when nav is centered */}
          {config.navPosition === 'center' && <div className="hidden md:block w-10" />}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: config.textColor }}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4 space-y-2">
            {sortedLinks.map((link) => {
              const Icon = config.showIcons ? getIconForLink(link) : null;
              const isActive = isActiveLink(link);
              
              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    color: isActive ? '#ffffff' : config.textColor,
                    backgroundColor: isActive ? config.accentColor : 'transparent',
                  }}
                >
                  {Icon && <Icon className="w-5 h-5" />}
                  {link.label}
                  {link.type === 'external' && (
                    <ExternalLink className="w-4 h-4 opacity-60 ml-auto" />
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};
