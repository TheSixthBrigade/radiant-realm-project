import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Star, Download, Edit3, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { PageBuilderSidebar } from '@/components/PageBuilderSidebar';
import { StoreStyleEditor } from '@/components/StoreStyleEditor';
import { AnimatedGradientCanvas } from '@/components/AnimatedGradientCanvas';
import ProductCard from '@/components/ProductCard';
import { RoadmapSection } from '@/components/RoadmapSection';
import { PageManager, StorePage } from '@/components/PageManager';
import { RoadmapPage } from '@/components/RoadmapPage';
import { RoadmapDashboard } from '@/components/RoadmapDashboard';
import { CustomRoadmapGallery } from '@/components/CustomRoadmapGallery';
import { CommunityForums } from '@/components/CommunityForums';
import { AboutPage } from '@/components/AboutPage';
import { TosPage } from '@/components/TosPage';
import { setAffiliateRef, buildCheckoutUrl } from '@/lib/affiliateTracking';
import { AffiliateManager } from '@/components/AffiliateManager';
import { SiteHeader, HeaderConfig, DEFAULT_HEADER_CONFIG, NavLink } from '@/components/SiteHeader';
import { DEFAULT_ROADMAP_SETTINGS } from '@/lib/roadmapThemes';
import { DEFAULT_COMMUNITY_SETTINGS, CommunitySettings } from '@/lib/communitySettings';
import { DEFAULT_ABOUT_SETTINGS, DEFAULT_TOS_SETTINGS, AboutPageSettings, TosPageSettings } from '@/lib/pageSettings';

const DEFAULT_PAGES: StorePage[] = [
  {
    id: 'home',
    type: 'home',
    title: 'Store',
    slug: '',
    sections: [],
    isEnabled: true,
    order: 0
  }
];

const UserSite = () => {
  const { slug, pageType, productId: urlProductId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [website, setWebsite] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [sellerStripeVerified, setSellerStripeVerified] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [styleEditorOpen, setStyleEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ownerSubscriptionTier, setOwnerSubscriptionTier] = useState<string>('free');
  
  // Multi-page support
  const [storePages, setStorePages] = useState<StorePage[]>(DEFAULT_PAGES);
  const [currentPageId, setCurrentPageId] = useState<string>('home');
  const [roadmapSettings, setRoadmapSettings] = useState(DEFAULT_ROADMAP_SETTINGS);
  const [communitySettings, setCommunitySettings] = useState<CommunitySettings>(DEFAULT_COMMUNITY_SETTINGS);
  const [aboutSettings, setAboutSettings] = useState<AboutPageSettings>(DEFAULT_ABOUT_SETTINGS);
  const [tosSettings, setTosSettings] = useState<TosPageSettings>(DEFAULT_TOS_SETTINGS);
  
  // Site header configuration
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
  
  // Multi-roadmap support - selected product for roadmap view
  const [selectedRoadmapProductId, setSelectedRoadmapProductId] = useState<string | null>(null);
  
  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');
  
  const [pageSections, setPageSections] = useState<any[]>([
    { id: 'header', type: 'header', order: 0, store_name: '', show_nav: true },
    { id: 'hero', type: 'slideshow', order: 1, heading: 'Welcome to my store', subheading: 'Check out my amazing products', show_button: true, button_text: 'Shop Now', images: [] },
    { id: 'products', type: 'product_grid', order: 2, title: 'Products', columns: 4, show_all: true },
    { id: 'footer', type: 'footer', order: 3, text: 'Powered by Vectabse Marketplace', show_social: true },
  ]);
  const [currentSlide, setCurrentSlide] = useState<Record<string, number>>({});
  const [selectedCollections, setSelectedCollections] = useState<Record<string, string | null>>({});

  const [editSettings, setEditSettings] = useState({
    template: "modern",
    hero_title: "",
    hero_description: "",
    hero_bg_color: "#FFFFFF",
    hero_text_color: "#000000",
    show_avatar: true,
    font_family: "Inter",
    heading_font: "Inter",
    font_size: "medium",
    products_per_row: "4",
    card_style: "modern",
    card_border_radius: "8",
    spacing: "normal",
    page_bg_color: "#F9FAFB",
    card_bg_color: "#FFFFFF",
    text_color: "#111827",
    primary_button_bg: "#5DADE2",
    primary_button_text: "#FFFFFF",
    primary_button_border: "#5DADE2",
    primary_button_bg_hover: "#3498DB",
    primary_button_text_hover: "#FFFFFF",
    primary_button_border_hover: "#3498DB",
    button_style: "rounded",
    button_size: "medium",
    show_ratings: true,
    show_downloads: true,
    background_type: "solid",
    background_image: "",
    background_gif: "",
    background_gradient_start: "#1e3a8a",
    background_gradient_end: "#7c3aed",
    background_overlay: 0.5,
    product_layout: "grid",
    image_display: "cover",
    show_badges: true,
    show_sale_tags: true,
    show_hover_effects: true,
    // Animated gradient settings
    animated_gradient_preset: "green",
    animated_gradient_speed: 0.5,
    animated_gradient_wave_intensity: 0.7,
    animated_gradient_particles: 50,
    animated_gradient_glow: true,
    animated_gradient_overlay: 0,
    // Global background settings
    global_background_enabled: false,
    global_background_type: "gradient" as string,
    global_background_color: "#0f172a",
    global_gradient_start: "#0f172a",
    global_gradient_end: "#1e1b4b",
    global_background_image: "",
    global_background_overlay: 0.5,
  });

  useEffect(() => {
    if (slug) fetchWebsite();
  }, [slug, user]);

  // Track affiliate referral clicks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      // Store ref code using robust tracking utility
      setAffiliateRef(refCode);
      
      // Track the click
      const trackClick = async () => {
        try {
          // Increment click count for this affiliate link
          const { data: link } = await (supabase as any)
            .from('affiliate_links')
            .select('id, clicks')
            .eq('code', refCode)
            .single();
          
          if (link) {
            await (supabase as any)
              .from('affiliate_links')
              .update({ clicks: (link.clicks || 0) + 1 })
              .eq('id', link.id);
            console.log('Affiliate click tracked for code:', refCode);
          }
        } catch (e) {
          console.error('Error tracking affiliate click:', e);
        }
      };
      
      trackClick();
    }
  }, []);

  // Handle page routing based on URL param
  useEffect(() => {
    // If we have a productId in URL, we're on a roadmap product page
    if (urlProductId) {
      setCurrentPageId('roadmap');
      return;
    }
    if (!pageType) {
      setCurrentPageId('home');
      return;
    }
    const page = storePages.find(p => p.slug === pageType || p.type === pageType);
    if (page) {
      setCurrentPageId(page.id);
    } else {
      setCurrentPageId('home');
    }
  }, [pageType, storePages, urlProductId]);

  // Slideshow autoplay effect
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    pageSections.forEach(section => {
      if (section.type === 'slideshow' && section.autoplay && section.images && section.images.length > 1) {
        const duration = (section.slide_duration || 5) * 1000;
        const interval = setInterval(() => {
          setCurrentSlide(prev => ({
            ...prev,
            [section.id]: ((prev[section.id] || 0) + 1) % section.images.length
          }));
        }, duration);
        intervals.push(interval);
      }
    });

    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [pageSections]);

  const fetchWebsite = async () => {
    try {
      const { data: profiles } = await supabase.from('profiles').select('*').eq('is_creator', true);
      const profile = profiles?.find(p => {
        const profileSlug = p.display_name?.toLowerCase().replace(/\s+/g, '-');
        return profileSlug === slug || p.user_id === slug;
      });

      if (!profile) throw new Error('Not found');
      if (user && user.id === profile.user_id) setIsOwner(true);

      // Check if seller has verified Stripe
      const hasStripe = profile.stripe_connect_account_id && (profile.stripe_connect_status === 'connected' || profile.stripe_connect_status === 'complete');
      setSellerStripeVerified(hasStripe);

      // Fetch subscription tier for roadmap access
      const { data: subData } = await supabase
        .from('developer_subscriptions')
        .select('tier')
        .eq('developer_id', profile.user_id)
        .single();
      
      // Check if user is john/john-cheetah (for testing) or has paid tier
      const displayName = profile.display_name?.toLowerCase() || '';
      const profileSlug = displayName.replace(/\s+/g, '-');
      const isTestUser = profileSlug === 'john-cheetah' || displayName === 'john-cheetah' || slug === 'john-cheetah' || slug === 'john' || displayName === 'john';
      const tier = subData?.tier || 'free';
      setOwnerSubscriptionTier(isTestUser ? 'pro' : tier);

      const websiteSettings = (profile as any).website_settings || {};

      setWebsite({
        user_id: profile.user_id,
        profiles: {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio
        },
        website_settings: websiteSettings
      });

      setEditSettings({
        template: websiteSettings.template || "modern",
        hero_title: websiteSettings.hero_title || profile.display_name + "'s Store",
        hero_description: websiteSettings.hero_description || profile.bio || 'Check out my amazing digital products!',
        hero_bg_color: websiteSettings.hero_bg_color || "#FFFFFF",
        hero_text_color: websiteSettings.hero_text_color || "#000000",
        show_avatar: websiteSettings.show_avatar !== false,
        font_family: websiteSettings.font_family || "Inter",
        heading_font: websiteSettings.heading_font || "Inter",
        font_size: websiteSettings.font_size || "medium",
        products_per_row: websiteSettings.products_per_row || "4",
        card_style: websiteSettings.card_style || "modern",
        card_border_radius: websiteSettings.card_border_radius || "8",
        spacing: websiteSettings.spacing || "normal",
        page_bg_color: websiteSettings.page_bg_color || "#F9FAFB",
        card_bg_color: websiteSettings.card_bg_color || "#FFFFFF",
        text_color: websiteSettings.text_color || "#111827",
        primary_button_bg: websiteSettings.primary_button_bg || '#5DADE2',
        primary_button_text: websiteSettings.primary_button_text || '#FFFFFF',
        primary_button_border: websiteSettings.primary_button_border || '#5DADE2',
        primary_button_bg_hover: websiteSettings.primary_button_bg_hover || '#3498DB',
        primary_button_text_hover: websiteSettings.primary_button_text_hover || '#FFFFFF',
        primary_button_border_hover: websiteSettings.primary_button_border_hover || '#3498DB',
        button_style: websiteSettings.button_style || "rounded",
        button_size: websiteSettings.button_size || "medium",
        show_ratings: websiteSettings.show_ratings !== false,
        show_downloads: websiteSettings.show_downloads !== false,
        background_type: websiteSettings.background_type || "solid",
        background_image: websiteSettings.background_image || "",
        background_gif: websiteSettings.background_gif || "",
        background_gradient_start: websiteSettings.background_gradient_start || "#1e3a8a",
        background_gradient_end: websiteSettings.background_gradient_end || "#7c3aed",
        background_overlay: websiteSettings.background_overlay || 0.5,
        product_layout: websiteSettings.product_layout || "grid",
        image_display: websiteSettings.image_display || "cover",
        show_badges: websiteSettings.show_badges !== false,
        show_sale_tags: websiteSettings.show_sale_tags !== false,
        show_hover_effects: websiteSettings.show_hover_effects !== false,
        // Animated gradient settings
        animated_gradient_preset: websiteSettings.animated_gradient_preset || "green",
        animated_gradient_speed: websiteSettings.animated_gradient_speed || 0.5,
        animated_gradient_wave_intensity: websiteSettings.animated_gradient_wave_intensity || 0.7,
        animated_gradient_particles: websiteSettings.animated_gradient_particles || 50,
        animated_gradient_glow: websiteSettings.animated_gradient_glow !== false,
        animated_gradient_overlay: websiteSettings.animated_gradient_overlay || 0,
        // Global background settings
        global_background_enabled: websiteSettings.global_background_enabled || false,
        global_background_type: websiteSettings.global_background_type || "gradient",
        global_background_color: websiteSettings.global_background_color || "#0f172a",
        global_gradient_start: websiteSettings.global_gradient_start || "#0f172a",
        global_gradient_end: websiteSettings.global_gradient_end || "#1e1b4b",
        global_background_image: websiteSettings.global_background_image || "",
        global_background_overlay: websiteSettings.global_background_overlay || 0.5,
      });

      // Load saved page sections if they exist
      if (websiteSettings.page_sections && Array.isArray(websiteSettings.page_sections)) {
        setPageSections(websiteSettings.page_sections);
      }

      // Load multi-page settings
      if (websiteSettings.store_pages && Array.isArray(websiteSettings.store_pages)) {
        setStorePages(websiteSettings.store_pages);
      }
      if (websiteSettings.roadmap_settings) {
        setRoadmapSettings({ ...DEFAULT_ROADMAP_SETTINGS, ...websiteSettings.roadmap_settings });
      }
      if (websiteSettings.community_settings) {
        setCommunitySettings({ ...DEFAULT_COMMUNITY_SETTINGS, ...websiteSettings.community_settings });
      }
      if (websiteSettings.about_settings) {
        setAboutSettings({ ...DEFAULT_ABOUT_SETTINGS, ...websiteSettings.about_settings });
      }
      if (websiteSettings.tos_settings) {
        setTosSettings({ ...DEFAULT_TOS_SETTINGS, ...websiteSettings.tos_settings });
      }

      // Load header configuration
      if (websiteSettings.header_config) {
        setHeaderConfig({ ...DEFAULT_HEADER_CONFIG, ...websiteSettings.header_config });
      } else {
        // Generate default nav links from enabled pages
        const enabledPages = (websiteSettings.store_pages || DEFAULT_PAGES).filter((p: StorePage) => p.isEnabled);
        const defaultNavLinks: NavLink[] = enabledPages.map((page: StorePage, index: number) => ({
          id: `nav-${page.id}`,
          label: page.title,
          type: 'page' as const,
          pageSlug: page.slug,
          order: index,
        }));
        setHeaderConfig({ ...DEFAULT_HEADER_CONFIG, navLinks: defaultNavLinks, siteName: profile.display_name });
      }

      const { data: productsData } = await supabase.from('products').select('*').eq('creator_id', profile.user_id).order('created_at', { ascending: false });
      setProducts(productsData || []);
    } catch (error) {
      toast.error('Website not found');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          website_settings: {
            ...editSettings,
            page_sections: pageSections,
            store_pages: storePages as any,
            roadmap_settings: roadmapSettings as any,
            community_settings: communitySettings as any,
            about_settings: aboutSettings as any,
            tos_settings: tosSettings as any,
            header_config: headerConfig as any
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', website.user_id);

      if (error) throw error;

      toast.success("Changes saved! Refreshing...");
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error("Failed to save changes");
      setSaving(false);
    }
  };

  const handlePurchase = (productId: string) => {
    if (!sellerStripeVerified) {
      toast.error("This seller hasn't set up Stripe yet. Purchases are not available.");
      return;
    }
    // Navigate to checkout page with product ID and affiliate ref using robust utility
    window.location.href = buildCheckoutUrl(productId);
  };

  if (loading) return <div className='min-h-screen flex items-center justify-center'><div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600'></div></div>;
  if (!website) return <div className='min-h-screen flex items-center justify-center'><div className='text-center'><h1 className='text-4xl font-bold mb-4'>Website Not Found</h1></div></div>;

  const fontSizeMap = {
    small: { base: "14px", heading: "28px" },
    medium: { base: "16px", heading: "32px" },
    large: { base: "18px", heading: "36px" },
  };

  const buttonSizeMap = {
    small: "py-2 px-4 text-sm",
    medium: "py-3 px-6 text-base",
    large: "py-4 px-8 text-lg",
  };

  const spacingMap = {
    compact: "gap-4",
    normal: "gap-6",
    relaxed: "gap-8",
  };

  const gridColsMap = {
    "2": "md:grid-cols-2",
    "3": "md:grid-cols-2 lg:grid-cols-3",
    "4": "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  const fontSize = fontSizeMap[editSettings.font_size as keyof typeof fontSizeMap];
  const buttonSize = buttonSizeMap[editSettings.button_size as keyof typeof buttonSizeMap];
  const spacing = spacingMap[editSettings.spacing as keyof typeof spacingMap];
  const gridCols = gridColsMap[editSettings.products_per_row as keyof typeof gridColsMap];

  // Background styling
  let backgroundStyle: any = { backgroundColor: editSettings.page_bg_color };
  const useAnimatedGradient = editSettings.background_type === 'animated_gradient';

  if (editSettings.background_type === 'gradient') {
    backgroundStyle = {
      background: `linear-gradient(135deg, ${editSettings.background_gradient_start} 0%, ${editSettings.background_gradient_end} 100%)`
    };
  } else if (editSettings.background_type === 'image' && editSettings.background_image) {
    backgroundStyle = {
      backgroundImage: `linear-gradient(rgba(0,0,0,${editSettings.background_overlay}), rgba(0,0,0,${editSettings.background_overlay})), url(${editSettings.background_image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    };
  } else if (editSettings.background_type === 'gif' && editSettings.background_gif) {
    backgroundStyle = {
      backgroundImage: `linear-gradient(rgba(0,0,0,${editSettings.background_overlay}), rgba(0,0,0,${editSettings.background_overlay})), url(${editSettings.background_gif})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    };
  } else if (useAnimatedGradient) {
    // For animated gradient, we use transparent background and render the canvas
    backgroundStyle = { backgroundColor: 'transparent' };
  }

  return (
    <>
      {/* Animated Gradient Background */}
      {useAnimatedGradient && (
        <AnimatedGradientCanvas
          preset={editSettings.animated_gradient_preset as any || 'green'}
          speed={editSettings.animated_gradient_speed || 0.5}
          waveIntensity={editSettings.animated_gradient_wave_intensity || 0.7}
          particleCount={editSettings.animated_gradient_particles || 50}
          showParticles={(editSettings.animated_gradient_particles || 50) > 0}
          showGlow={editSettings.animated_gradient_glow !== false}
          overlayOpacity={editSettings.animated_gradient_overlay || 0}
        />
      )}
      
      {/* Fixed Background Layer (for non-animated backgrounds) */}
      {!useAnimatedGradient && (
        <div className='fixed inset-0 -z-10' style={backgroundStyle} />
      )}
      
      <div className='min-h-screen relative' style={{ fontFamily: editSettings.font_family, fontSize: fontSize.base, color: editSettings.text_color }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap');
        .primary-btn { background-color: ${editSettings.primary_button_bg}; color: ${editSettings.primary_button_text}; border: 2px solid ${editSettings.primary_button_border}; transition: all 0.3s ease; border-radius: ${editSettings.button_style === 'pill' ? '9999px' : editSettings.button_style === 'square' ? '0' : '6px'}; }
        .primary-btn:hover { background-color: ${editSettings.primary_button_bg_hover}; color: ${editSettings.primary_button_text_hover}; border-color: ${editSettings.primary_button_border_hover}; transform: translateY(-2px); }
        .product-card { transition: transform 0.3s ease, box-shadow 0.3s ease; background-color: ${editSettings.card_bg_color}; border-radius: ${editSettings.card_border_radius}px; }
        .product-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15); }
        h1, h2, h3 { font-family: ${editSettings.heading_font}; }
      `}</style>

      {/* Site Header - displays on all pages */}
      <SiteHeader
        config={headerConfig}
        currentPageSlug={pageType || ''}
        baseUrl={`/site/${slug}`}
        storeName={website.profiles?.display_name || 'Store'}
        isOwner={isOwner}
      />

      {/* Editor button - LEFT side for ALL pages (home and roadmap) */}
      {isOwner && !editorOpen && (
        <button onClick={() => setEditorOpen(true)} className='fixed left-0 top-1/2 -translate-y-1/2 bg-green-600 text-white p-3 rounded-r-lg shadow-lg z-50 hover:bg-green-700'>
          <Edit3 className='w-5 h-5' />
        </button>
      )}

      {/* PageBuilderSidebar - LEFT side for both home and roadmap pages */}
      <PageBuilderSidebar
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        sections={currentPageId === 'roadmap' || pageType === 'roadmap' || currentPageId === 'community' || pageType === 'community' || currentPageId === 'about' || pageType === 'about' || currentPageId === 'tos' || pageType === 'tos' ? [] : pageSections}
        roadmapSettings={currentPageId === 'roadmap' || pageType === 'roadmap' ? roadmapSettings : undefined}
        onRoadmapSettingsChange={currentPageId === 'roadmap' || pageType === 'roadmap' ? setRoadmapSettings : undefined}
        isRoadmapMode={currentPageId === 'roadmap' || pageType === 'roadmap'}
        isCommunityMode={currentPageId === 'community' || pageType === 'community'}
        communitySettings={currentPageId === 'community' || pageType === 'community' ? communitySettings : undefined}
        onCommunitySettingsChange={currentPageId === 'community' || pageType === 'community' ? setCommunitySettings : undefined}
        isAboutMode={currentPageId === 'about' || pageType === 'about'}
        aboutSettings={currentPageId === 'about' || pageType === 'about' ? aboutSettings : undefined}
        onAboutSettingsChange={currentPageId === 'about' || pageType === 'about' ? setAboutSettings : undefined}
        isTosMode={currentPageId === 'tos' || pageType === 'tos'}
        tosSettings={currentPageId === 'tos' || pageType === 'tos' ? tosSettings : undefined}
        onTosSettingsChange={currentPageId === 'tos' || pageType === 'tos' ? setTosSettings : undefined}
        // Page manager props
        pages={storePages}
        currentPageId={currentPageId}
        onPageChange={(pageId) => {
          setCurrentPageId(pageId);
          const page = storePages.find(p => p.id === pageId);
          if (page) {
            navigate(`/site/${slug}${page.slug ? `/${page.slug}` : ''}`);
          }
        }}
        onAddPage={(type) => {
          const PAGE_DEFAULTS: Record<string, { title: string; slug: string }> = {
            home: { title: 'Marketplace', slug: '' },
            about: { title: 'About', slug: 'about' },
            tos: { title: 'Terms of Service', slug: 'tos' },
            roadmap: { title: 'Roadmap', slug: 'roadmap' },
            community: { title: 'Community Forums', slug: 'community' },
          };
          const defaults = PAGE_DEFAULTS[type] || { title: type, slug: type };
          const newPage: StorePage = {
            id: `page-${Date.now()}`,
            type,
            title: defaults.title,
            slug: defaults.slug,
            sections: [],
            isEnabled: true,
            order: storePages.length,
          };
          setStorePages([...storePages, newPage]);
        }}
        onDeletePage={(pageId) => {
          setStorePages(storePages.filter(p => p.id !== pageId));
          if (currentPageId === pageId) {
            setCurrentPageId('home');
            navigate(`/site/${slug}`);
          }
        }}
        onUpdatePage={(updatedPage) => {
          setStorePages(storePages.map(p => p.id === updatedPage.id ? updatedPage : p));
        }}
        onReorderPages={(reorderedPages) => {
          setStorePages(reorderedPages);
        }}
        subscriptionTier={ownerSubscriptionTier}
        onAddSection={(type) => {
          const newSection = {
            id: `section-${Date.now()}`,
            type,
            order: pageSections.length,
            // Default values
            heading: type === 'slideshow' ? 'Welcome to my store' : '',
            title: type === 'product_grid' ? 'Products' : type === 'featured_products' ? 'Featured Products' : '',
            columns: 4,
            show_all: true,
          };
          setPageSections([...pageSections, newSection]);
          toast.success('Section added!');
        }}
        onUpdateSection={(updated) => {
          setPageSections(pageSections.map(s => s.id === updated.id ? updated : s));
        }}
        onDeleteSection={(id) => {
          setPageSections(pageSections.filter(s => s.id !== id));
          toast.success('Section deleted!');
        }}
        onReorderSections={(reordered) => {
          setPageSections(reordered);
        }}
        onOpenStyleEditor={() => {
          setStyleEditorOpen(true);
        }}
        headerConfig={headerConfig}
        onHeaderConfigChange={setHeaderConfig}
        saving={saving}
        onSave={handleSave}
      />

      <StoreStyleEditor
        isOpen={styleEditorOpen}
        onClose={() => setStyleEditorOpen(false)}
        settings={editSettings}
        onSettingsChange={setEditSettings}
        onSave={async () => {
          await handleSave();
          setStyleEditorOpen(false);
        }}
        saving={saving}
      />

      {/* Check if we're on the roadmap page - render outside editor container */}
      {currentPageId === 'roadmap' || pageType === 'roadmap' ? (
        // Check subscription tier - only Pro, Pro+, Enterprise can use roadmap
        ['pro', 'pro_plus', 'enterprise'].includes(ownerSubscriptionTier) ? (
          <div className={isOwner && editorOpen ? 'ml-[340px] pl-4 transition-all' : ''}>
            {/* Check if viewing specific product roadmap or dashboard */}
            {selectedRoadmapProductId || urlProductId ? (
              <RoadmapPage 
                creatorId={website.user_id} 
                isOwner={isOwner}
                settings={roadmapSettings}
                storeName={website.profiles?.display_name}
                storeLogo={pageSections.find(s => s.type === 'header')?.settings?.logo || pageSections.find(s => s.type === 'header')?.logo_url}
                productId={selectedRoadmapProductId || urlProductId}
                storeSlug={slug}
                globalBackground={{
                  enabled: editSettings.global_background_enabled,
                  type: editSettings.global_background_type as 'solid' | 'gradient' | 'image',
                  color: editSettings.global_background_color,
                  gradientStart: editSettings.global_gradient_start,
                  gradientEnd: editSettings.global_gradient_end,
                  image: editSettings.global_background_image,
                  overlay: editSettings.global_background_overlay
                }}
                onBack={() => {
                  setSelectedRoadmapProductId(null);
                  navigate(`/site/${slug}/roadmap`);
                }}
              />
            ) : (
              <RoadmapDashboard
                creatorId={website.user_id}
                isOwner={isOwner}
                storeName={website.profiles?.display_name}
                storeLogo={pageSections.find(s => s.type === 'header')?.settings?.logo || pageSections.find(s => s.type === 'header')?.logo_url}
                storeSlug={slug}
                onSelectRoadmap={(productId) => {
                  setSelectedRoadmapProductId(productId);
                  navigate(`/site/${slug}/roadmap/${productId}`);
                }}
              />
            )}
          </div>
        ) : (
          // Show upgrade prompt for free users
          <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
            <div className="text-center max-w-lg mx-auto p-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Roadmap is a Pro Feature</h1>
              <p className="text-gray-400 mb-8">
                {isOwner 
                  ? "Upgrade to Pro, Pro+, or Enterprise to unlock the Roadmap feature and share your development progress with your community."
                  : "This store owner needs to upgrade to Pro to enable the Roadmap feature."
                }
              </p>
              {isOwner && (
                <Button 
                  onClick={() => navigate('/dashboard/developer')}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-full"
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </div>
        )
      ) : (currentPageId === 'about' || pageType === 'about') ? (
        // About Page
        <div className={isOwner && editorOpen ? 'ml-[340px] pl-4 transition-all' : ''}>
          <AboutPage 
            settings={aboutSettings}
            storeName={website.profiles?.display_name}
          />
        </div>
      ) : (currentPageId === 'tos' || pageType === 'tos') ? (
        // Terms of Service Page
        <div className={isOwner && editorOpen ? 'ml-[340px] pl-4 transition-all' : ''}>
          <TosPage 
            settings={tosSettings}
            storeName={website.profiles?.display_name}
          />
        </div>
      ) : (currentPageId === 'affiliate' || pageType === 'affiliate') ? (
        // Affiliate Program Page
        <div className={isOwner && editorOpen ? 'ml-[340px] pl-4 transition-all' : ''}>
          <div className="min-h-screen py-12 px-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
            <div className="max-w-4xl mx-auto">
              <AffiliateManager 
                mode="affiliate"
                storeId={website.user_id}
                storeUsername={slug}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={isOwner && editorOpen ? 'ml-64 transition-all' : ''}>
          {currentPageId === 'community' || pageType === 'community' ? (
          // Community Forums Page - Pro feature
          ['pro', 'pro_plus', 'enterprise'].includes(ownerSubscriptionTier) ? (
            <div className={isOwner && editorOpen ? 'ml-[340px] pl-4 transition-all' : ''}>
              <CommunityForums 
                creatorId={website.user_id}
                isOwner={isOwner}
                accentColor={communitySettings.accentColor || "#14b8a6"}
                settings={communitySettings}
              />
            </div>
          ) : (
            // Show upgrade prompt for free users
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
              <div className="text-center max-w-lg mx-auto p-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Community Forums is a Pro Feature</h1>
                <p className="text-gray-400 mb-8">
                  {isOwner 
                    ? "Upgrade to Pro, Pro+, or Enterprise to unlock Community Forums and engage with your customers."
                    : "This store owner needs to upgrade to Pro to enable Community Forums."
                  }
                </p>
                {isOwner && (
                  <Button 
                    onClick={() => navigate('/dashboard/developer')}
                    className="px-8 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold rounded-full"
                  >
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </div>
          )
        ) : (
        <>
        {pageSections.sort((a, b) => a.order - b.order).map((section) => {
          // Header Section
          if (section.type === 'header') {
            const logoUrl = section.settings?.logo || section.logo_url;
            const logoHeight = section.settings?.logoHeight || 80;
            const isTransparent = section.settings?.transparent === true;
            const useBlur = section.settings?.blur !== false;
            const headerBgColor = section.settings?.headerBgColor || '#ffffff';
            const textColor = section.settings?.textColor || '#000000';
            const isSticky = section.settings?.sticky === true;
            const showAnnouncement = section.settings?.showAnnouncement === true;
            const announcementText = section.settings?.announcementText || '';
            const announcementBgColor = section.settings?.announcementBgColor || '#3b82f6';
            const customLinks = section.settings?.customLinks || [
              { label: 'Shop', url: '#products' },
              { label: 'About', url: '#about' },
              { label: 'Contact', url: '#contact' }
            ];
            
            return (
              <div key={section.id}>
                {/* Announcement Bar */}
                {showAnnouncement && announcementText && (
                  <div 
                    className='py-2 px-6 text-center text-white text-sm'
                    style={{ backgroundColor: announcementBgColor }}
                  >
                    {announcementText}
                  </div>
                )}
                
                {/* Header */}
                <div 
                  className={`py-4 px-6 ${isSticky ? 'sticky top-0 z-50' : ''} ${isTransparent && useBlur ? 'backdrop-blur-md' : ''} ${!isTransparent ? 'border-b' : ''}`}
                  style={{ 
                    backgroundColor: isTransparent ? 'transparent' : headerBgColor,
                    color: textColor
                  }}
                >
                  <div className='max-w-7xl mx-auto flex items-center justify-between'>
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        style={{ height: `${logoHeight}px` }}
                        className='object-contain' 
                      />
                    ) : (
                      <h1 className='text-2xl font-bold' style={{ color: textColor }}>
                        {section.store_name || website.profiles?.display_name + "'s Store"}
                      </h1>
                    )}
                    {(section.settings?.showNav !== false) && (
                      <nav className='flex gap-6'>
                        {customLinks.map((link: any, idx: number) => (
                          <a 
                            key={idx}
                            href={link.url} 
                            className='hover:opacity-70 transition-opacity'
                            style={{ color: textColor }}
                          >
                            {link.label}
                          </a>
                        ))}
                      </nav>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // Slideshow Section
          if (section.type === 'slideshow') {
            const slides = section.settings?.slides || section.images || [];
            const hasSlides = slides.length > 0;
            const slideIndex = currentSlide[section.id] || 0;
            
            // Get all slideshow settings
            const slideHeight = section.settings?.slideHeight === 'small' ? 'min-h-[300px]' :
                               section.settings?.slideHeight === 'large' ? 'min-h-[700px]' :
                               section.settings?.slideHeight === 'full' ? 'min-h-screen' : 'min-h-[500px]';
            const overlayOpacity = (section.settings?.overlayOpacity || 50) / 100;
            const overlayColor = section.settings?.overlayColor || '#000000';
            const textAlign = section.settings?.textAlign || 'center';
            const contentPosition = section.settings?.contentPosition === 'top' ? 'items-start pt-20' :
                                   section.settings?.contentPosition === 'bottom' ? 'items-end pb-20' : 'items-center';
            const textColor = section.settings?.textColor || '#ffffff';
            const showButton = section.settings?.showButton !== false;
            const buttonText = section.settings?.buttonText || 'Shop Now';
            const buttonLink = section.settings?.buttonLink || '#products';
            const heading = section.settings?.heading || section.heading || 'Welcome to my store';
            const subheading = section.settings?.subheading || section.subheading || 'Check out my amazing products';
            const showArrows = section.settings?.showArrows !== false;
            const showDots = section.settings?.showDots !== false;

            return (
              <div
                key={section.id}
                className={`px-6 text-${textAlign} relative overflow-hidden group flex ${contentPosition} ${slideHeight}`}
                style={{
                  backgroundColor: !hasSlides ? editSettings.hero_bg_color : 'transparent',
                }}
              >
                {/* Background slides with crossfade */}
                {hasSlides && slides.map((img: string, index: number) => (
                  <div
                    key={index}
                    className='absolute inset-0 transition-opacity duration-1000 ease-in-out'
                    style={{
                      backgroundImage: `linear-gradient(${overlayColor}${Math.round(overlayOpacity * 255).toString(16).padStart(2, '0')}, ${overlayColor}${Math.round(overlayOpacity * 255).toString(16).padStart(2, '0')}), url(${img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: index === slideIndex ? 1 : 0,
                      zIndex: index === slideIndex ? 1 : 0
                    }}
                  />
                ))}
                
                <div className='max-w-4xl mx-auto relative z-10 w-full py-12'>
                  <h1 
                    style={{ fontSize: fontSize.heading, color: textColor }} 
                    className='font-bold mb-4'
                  >
                    {heading}
                  </h1>
                  <p className='text-xl mb-8' style={{ color: textColor }}>
                    {subheading}
                  </p>
                  {showButton && (
                    <a href={buttonLink}>
                      <Button className='primary-btn text-lg px-8 py-4'>
                        {buttonText}
                      </Button>
                    </a>
                  )}
                </div>

                {/* Navigation arrows */}
                {showArrows && hasSlides && slides.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentSlide({ ...currentSlide, [section.id]: slideIndex === 0 ? slides.length - 1 : slideIndex - 1 })}
                      className='absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100'
                      aria-label="Previous slide"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentSlide({ ...currentSlide, [section.id]: (slideIndex + 1) % slides.length })}
                      className='absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100'
                      aria-label="Next slide"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Slide indicators */}
                {showDots && hasSlides && slides.length > 1 && (
                  <div className='absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10'>
                    {slides.map((_: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide({ ...currentSlide, [section.id]: index })}
                        style={{
                          boxShadow: index === slideIndex 
                            ? '0 0 20px rgba(255, 255, 255, 0.9), 0 0 40px rgba(255, 255, 255, 0.6)' 
                            : '0 0 10px rgba(255, 255, 255, 0.8)'
                        }}
                        className={`h-4 rounded-full transition-all duration-300 ${
                          index === slideIndex 
                            ? 'bg-white w-12' 
                            : 'bg-white w-4 hover:bg-white hover:scale-125'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Featured Products Section
          if (section.type === 'featured_products') {
            // Use selected products if available, otherwise fall back to featured products
            const selectedProductIds = section.settings?.selectedProducts || [];
            const featuredProducts = selectedProductIds.length > 0
              ? products.filter(p => selectedProductIds.includes(p.id))
              : products.filter(p => p.featured).slice(0, section.count || 4);
            
            return (
              <div key={section.id} className='py-12 px-6 bg-gray-100 dark:bg-gray-900'>
                <div className='max-w-7xl mx-auto'>
                  <h2 style={{ fontSize: fontSize.heading }} className='font-bold mb-8'>{section.settings?.title || section.title || 'Featured Products'}</h2>
                  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${section.count || 4} ${spacing}`}>
                    {featuredProducts.map(product => (
                      <div key={product.id} className='group cursor-pointer relative overflow-hidden rounded-lg aspect-[4/3]' onClick={() => handlePurchase(product.id)}>
                        {/* Payhip-style hover reveal: Image fills entire card */}
                        <img 
                          src={product.image_url || "/placeholder.svg"} 
                          alt={product.title}
                          className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                        />
                        
                        {/* Dark overlay on hover */}
                        <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                        
                        {/* Title and price reveal on hover */}
                        {section.show_prices !== false && (
                          <div className='absolute inset-0 flex flex-col items-center justify-center p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                            <h3 className='text-white text-xl font-bold text-center mb-3 line-clamp-2'>{product.title}</h3>
                            <div className='text-white text-2xl font-bold'>${product.price.toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Product Grid Section
          if (section.type === 'product_grid') {
            // Sort products based on settings
            const sortBy = section.settings?.sortBy || 'newest';
            let sortedProducts = [...products];
            
            if (sortBy === 'oldest') {
              sortedProducts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            } else if (sortBy === 'price-low') {
              sortedProducts.sort((a, b) => a.price - b.price);
            } else if (sortBy === 'price-high') {
              sortedProducts.sort((a, b) => b.price - a.price);
            } else if (sortBy === 'popular') {
              sortedProducts.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
            } else {
              // newest (default)
              sortedProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }
            
            // Get all settings with defaults
            const cardStyle = section.settings?.cardStyle || 'standard';
            const gridColsClass = section.settings?.productsPerRow === '2' ? 'md:grid-cols-2' : 
                                 section.settings?.productsPerRow === '3' ? 'md:grid-cols-2 lg:grid-cols-3' : 
                                 section.settings?.productsPerRow === '4' ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 
                                 section.settings?.productsPerRow === '5' ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' :
                                 section.settings?.productsPerRow === '6' ? 'md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6' :
                                 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
            
            const cardSpacing = section.settings?.cardSpacing === 'compact' ? 'gap-4' :
                               section.settings?.cardSpacing === 'relaxed' ? 'gap-8' :
                               section.settings?.cardSpacing === 'spacious' ? 'gap-12' : 'gap-6';
            
            const borderRadius = section.settings?.borderRadius || 8;
            const cardBgColor = section.settings?.cardBgColor || '#ffffff';
            const textColor = section.settings?.textColor || '#000000';
            const priceColor = section.settings?.priceColor || '#2563eb';
            const hoverOverlayColor = section.settings?.hoverOverlayColor || '#000000';
            const hoverOverlayOpacity = (section.settings?.hoverOverlayOpacity || 60) / 100;
            const showPrices = section.settings?.showPrices !== false;
            const showRatings = section.settings?.showRatings !== false;
            const showDownloads = section.settings?.showDownloads === true;
            const showBadges = section.settings?.showBadges !== false;
            const hoverEffect = section.settings?.hoverEffect || 'lift';
            const imageAspect = section.settings?.imageAspect === 'portrait' ? 'aspect-[3/4]' :
                               section.settings?.imageAspect === 'landscape' ? 'aspect-[4/3]' :
                               section.settings?.imageAspect === 'wide' ? 'aspect-[16/9]' :
                               section.settings?.imageAspect === 'auto' ? '' : 'aspect-square';
            const imageFit = section.settings?.imageFit === 'contain' ? 'object-contain' : 'object-cover';
            
            return (
              <div key={section.id} className='py-12 px-6'>
                <div className='max-w-7xl mx-auto'>
                  {section.settings?.title && (
                    <h2 style={{ fontSize: fontSize.heading, color: textColor }} className='font-bold mb-2'>
                      {section.settings.title}
                    </h2>
                  )}
                  {section.settings?.description && (
                    <p style={{ color: textColor }} className='mb-8 opacity-80'>{section.settings.description}</p>
                  )}
                  {products.length === 0 ? (
                    <div className='text-center py-16 rounded-lg' style={{ backgroundColor: cardBgColor }}>
                      <p className='text-lg' style={{ color: textColor }}>No products available yet.</p>
                    </div>
                  ) : (
                    <div className={`grid grid-cols-1 ${gridColsClass} ${cardSpacing}`}>
                      {sortedProducts.slice(0, section.settings?.maxProducts || 12).map(product => (
                        <div 
                          key={product.id} 
                          className={`group cursor-pointer relative overflow-hidden ${imageAspect} transition-all duration-300 ${
                            hoverEffect === 'lift' ? 'hover:-translate-y-2' :
                            hoverEffect === 'tilt' ? 'hover:rotate-1' :
                            hoverEffect === 'glow' ? 'hover:shadow-2xl hover:shadow-blue-500/50' : ''
                          }`}
                          style={{ 
                            borderRadius: `${borderRadius}px`,
                            backgroundColor: cardBgColor
                          }}
                          onClick={() => handlePurchase(product.id)}
                        >
                          {/* Product Image */}
                          <img 
                            src={product.image_url || "/placeholder.svg"} 
                            alt={product.title}
                            className={`w-full h-full ${imageFit} transition-transform duration-500 ${
                              hoverEffect === 'zoom' ? 'group-hover:scale-110' : ''
                            }`}
                          />
                          
                          {/* Badges */}
                          {showBadges && product.is_new && (
                            <div className='absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded'>
                              NEW
                            </div>
                          )}
                          
                          {/* Card Style: Hover Reveal (Payhip style) */}
                          {cardStyle === 'hover-reveal' && (
                            <>
                              <div 
                                className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
                                style={{ backgroundColor: `${hoverOverlayColor}${Math.round(hoverOverlayOpacity * 255).toString(16).padStart(2, '0')}` }}
                              />
                              <div className='absolute inset-0 flex flex-col items-center justify-center p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                                <h3 className='text-white text-xl font-bold text-center mb-3 line-clamp-2'>{product.title}</h3>
                                {showPrices && (
                                  <div className='text-white text-2xl font-bold'>${product.price.toFixed(2)}</div>
                                )}
                              </div>
                            </>
                          )}
                          
                          {/* Card Style: Standard */}
                          {cardStyle === 'standard' && (
                            <div className='absolute bottom-0 left-0 right-0 p-4' style={{ backgroundColor: cardBgColor }}>
                              <h3 className='font-bold text-lg mb-2 line-clamp-2' style={{ color: textColor }}>{product.title}</h3>
                              {showPrices && (
                                <div className='text-xl font-bold' style={{ color: priceColor }}>${product.price.toFixed(2)}</div>
                              )}
                            </div>
                          )}
                          
                          {/* Card Style: Minimal */}
                          {cardStyle === 'minimal' && (
                            <div className='absolute bottom-0 left-0 right-0 p-3 bg-white/90 backdrop-blur-sm'>
                              <div className='flex justify-between items-center'>
                                <h3 className='font-semibold text-sm line-clamp-1' style={{ color: textColor }}>{product.title}</h3>
                                {showPrices && (
                                  <div className='font-bold' style={{ color: priceColor }}>${product.price.toFixed(2)}</div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Card Style: Gaming/Cyber */}
                          {cardStyle === 'gaming' && (
                            <>
                              <div className='absolute inset-0 border-2 border-cyan-500/0 group-hover:border-cyan-500 transition-all duration-300 pointer-events-none' style={{ borderRadius: `${borderRadius}px` }} />
                              <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 pb-4'>
                                <div className='px-4'>
                                  <h3 className='text-cyan-400 font-bold text-lg mb-2 line-clamp-2'>{product.title}</h3>
                                  {showPrices && (
                                    <div className='text-white text-xl font-bold'>${product.price.toFixed(2)}</div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                          
                          {/* Card Style: Compact */}
                          {cardStyle === 'compact' && (
                            <div className='absolute bottom-2 left-2 right-2 p-2 rounded' style={{ backgroundColor: `${cardBgColor}ee` }}>
                              <h3 className='font-semibold text-xs line-clamp-1' style={{ color: textColor }}>{product.title}</h3>
                              {showPrices && (
                                <div className='text-sm font-bold' style={{ color: priceColor }}>${product.price.toFixed(2)}</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Collections Section
          if (section.type === 'collections') {
            const collections = section.settings?.collections || [];
            const selectedCollection = selectedCollections[section.id] || null;
            
            // Filter products based on selected collection
            const filteredProducts = selectedCollection
              ? products.filter(p => {
                  const collection = collections.find((c: any) => c.id === selectedCollection);
                  return collection?.productIds?.includes(p.id);
                })
              : products;

            return (
              <div key={section.id} className='py-12 px-6'>
                <div className='max-w-7xl mx-auto'>
                  <h2 style={{ fontSize: fontSize.heading }} className='font-bold mb-6'>{section.settings?.title || 'Browse Collections'}</h2>
                  
                  {/* Collection Tabs - Payhip Style */}
                  {collections.length > 0 && (
                    <div className='mb-8'>
                      <div className='flex gap-2 overflow-x-auto scrollbar-hide pb-2'>
                        <button
                          onClick={() => setSelectedCollections({ ...selectedCollections, [section.id]: null })}
                          className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                            selectedCollection === null
                              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          All Products
                        </button>
                        {collections.filter((c: any) => c.isVisible).map((collection: any) => (
                          <button
                            key={collection.id}
                            onClick={() => setSelectedCollections({ ...selectedCollections, [section.id]: collection.id })}
                            className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                              selectedCollection === collection.id
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {collection.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products Grid */}
                  {filteredProducts.length === 0 ? (
                    <div className='text-center py-16 bg-white dark:bg-gray-800 rounded-lg'>
                      <p className='text-lg'>No products in this collection yet.</p>
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                      {filteredProducts.map(product => (
                        <div key={product.id} className='group cursor-pointer relative overflow-hidden rounded-lg aspect-[4/3]' onClick={() => handlePurchase(product.id)}>
                          {/* Payhip-style hover reveal: Image fills entire card */}
                          <img 
                            src={product.image_url || "/placeholder.svg"} 
                            alt={product.title}
                            className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                          />
                          
                          {/* Dark overlay on hover */}
                          <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                          
                          {/* Title and price reveal on hover */}
                          <div className='absolute inset-0 flex flex-col items-center justify-center p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                            <h3 className='text-white text-xl font-bold text-center mb-3 line-clamp-2'>{product.title}</h3>
                            <div className='text-white text-2xl font-bold'>${product.price.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Image With Text Section
          if (section.type === 'image_with_text') {
            return (
              <div key={section.id} className='py-12 px-6'>
                <div className='max-w-7xl mx-auto'>
                  <div className={`grid md:grid-cols-2 gap-8 items-center ${section.image_position === 'right' ? 'md:flex-row-reverse' : ''}`}>
                    <div className={section.image_position === 'right' ? 'md:order-2' : ''}>
                      {section.image_url && <img src={section.image_url} alt={section.heading} className='w-full rounded-lg shadow-lg' />}
                    </div>
                    <div className={section.image_position === 'right' ? 'md:order-1' : ''}>
                      <h2 className='text-3xl font-bold mb-4'>{section.heading}</h2>
                      <p className='text-lg opacity-80'>{section.text}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Gallery Section
          if (section.type === 'gallery') {
            const images = section.settings?.images || section.images || [];
            const cols = section.settings?.columns || section.columns || 3;
            const title = section.settings?.title || section.title;
            return (
              <div key={section.id} className='py-12 px-6'>
                <div className='max-w-7xl mx-auto'>
                  {title && <h2 className='text-3xl font-bold mb-8'>{title}</h2>}
                  <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-4`}>
                    {images.map((img: string, idx: number) => (
                      <div key={idx} className='aspect-square overflow-hidden rounded-lg'>
                        <img src={img} alt={`Gallery ${idx + 1}`} className='w-full h-full object-cover hover:scale-110 transition-transform duration-300' />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Single Image Section
          if (section.type === 'image') {
            return (
              <div key={section.id} className='py-8 px-6'>
                <div className='max-w-7xl mx-auto'>
                  {section.link_url ? (
                    <a href={section.link_url} target='_blank' rel='noopener noreferrer'>
                      <img src={section.image_url} alt={section.alt_text || 'Banner'} className='w-full rounded-lg shadow-lg' />
                    </a>
                  ) : (
                    <img src={section.image_url} alt={section.alt_text || 'Banner'} className='w-full rounded-lg shadow-lg' />
                  )}
                </div>
              </div>
            );
          }

          // Text Section
          if (section.type === 'text') {
            const heading = section.settings?.heading || section.heading;
            const content = section.settings?.content || section.content;
            const alignment = section.settings?.alignment || section.alignment || 'left';
            return (
              <div key={section.id} className='py-12 px-6'>
                <div className='max-w-4xl mx-auto' style={{ textAlign: alignment as any }}>
                  {heading && <h2 className='text-3xl font-bold mb-6'>{heading}</h2>}
                  <div className='text-lg whitespace-pre-wrap'>{content}</div>
                </div>
              </div>
            );
          }

          // Video Section
          if (section.type === 'video') {
            const videoUrl = section.settings?.video_url || section.video_url || '';
            const autoplay = section.settings?.autoplay || section.autoplay;
            const title = section.settings?.title || section.title;
            
            const getEmbedUrl = (url: string) => {
              if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const videoId = url.includes('youtu.be') ? url.split('/').pop() : new URL(url).searchParams.get('v');
                return `https://www.youtube.com/embed/${videoId}${autoplay ? '?autoplay=1' : ''}`;
              }
              if (url.includes('vimeo.com')) {
                const videoId = url.split('/').pop();
                return `https://player.vimeo.com/video/${videoId}${autoplay ? '?autoplay=1' : ''}`;
              }
              return url;
            };

            return (
              <div key={section.id} className='py-12 px-6'>
                <div className='max-w-5xl mx-auto'>
                  {title && <h2 className='text-3xl font-bold mb-6 text-center'>{title}</h2>}
                  <div className='aspect-video rounded-lg overflow-hidden shadow-2xl'>
                    <iframe
                      src={getEmbedUrl(videoUrl)}
                      className='w-full h-full'
                      allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            );
          }

          // Testimonials Section
          if (section.type === 'testimonials') {
            // Get testimonials from settings (array) or legacy format (JSON string)
            let testimonials = [];
            if (section.settings?.testimonials && Array.isArray(section.settings.testimonials)) {
              testimonials = section.settings.testimonials;
            } else if (section.testimonials) {
              try {
                testimonials = JSON.parse(section.testimonials);
              } catch (e) {
                testimonials = [];
              }
            }
            
            const title = section.settings?.title || section.title || 'What Our Customers Say';

            return (
              <div key={section.id} className='py-12 px-6 bg-gray-50 dark:bg-gray-900'>
                <div className='max-w-7xl mx-auto'>
                  {title && <h2 className='text-3xl font-bold mb-12 text-center'>{title}</h2>}
                  <div className='grid md:grid-cols-3 gap-8'>
                    {testimonials.map((testimonial: any, idx: number) => (
                      <div key={idx} className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg'>
                        <div className='flex gap-1 mb-4'>
                          {[...Array(testimonial.rating || 5)].map((_, i) => (
                            <Star key={i} className='w-5 h-5 text-yellow-500 fill-current' />
                          ))}
                        </div>
                        <p className='mb-4 italic'>"{testimonial.text}"</p>
                        <p className='font-bold'>{testimonial.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Contact Us Section
          if (section.type === 'contact_us') {
            const heading = section.settings?.heading || section.heading || 'Get In Touch';
            const showPhone = section.settings?.show_phone !== false && section.show_phone !== false;
            const buttonText = section.settings?.button_text || section.button_text || 'Send Message';
            const buttonColor = section.settings?.button_color || '#84cc16';
            const buttonTextColor = section.settings?.button_text_color || '#000000';
            const backgroundColor = section.settings?.background_color || 'transparent';
            const inputBgColor = section.settings?.input_bg_color || '#1f2937';
            const recipientEmail = section.settings?.recipient_email || '';
            
            const handleContactSubmit = async (e: React.FormEvent) => {
              e.preventDefault();
              if (!contactForm.name || !contactForm.email || !contactForm.message) {
                setContactError('Please fill in all required fields');
                return;
              }
              
              if (!recipientEmail) {
                setContactError('Contact form not configured. Please set a recipient email.');
                return;
              }
              
              setContactSubmitting(true);
              setContactError('');
              
              try {
                // Send email via edge function
                const { error } = await (supabase as any).functions.invoke('send-contact-email', {
                  body: {
                    to: recipientEmail,
                    from_name: contactForm.name,
                    from_email: contactForm.email,
                    phone: contactForm.phone,
                    message: contactForm.message,
                    store_name: website?.profiles?.display_name || 'Store'
                  }
                });
                
                if (error) throw error;
                
                setContactSuccess(true);
                setContactForm({ name: '', email: '', phone: '', message: '' });
                setTimeout(() => setContactSuccess(false), 5000);
              } catch (err) {
                console.error('Contact form error:', err);
                setContactError('Failed to send message. Please try again.');
              } finally {
                setContactSubmitting(false);
              }
            };
            
            return (
              <div key={section.id} className='py-12 px-6' style={{ backgroundColor }}>
                <div className='max-w-2xl mx-auto'>
                  <h2 className='text-3xl font-bold mb-8 text-center'>{heading}</h2>
                  {contactSuccess && (
                    <div className='mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400 text-center'>
                      Message sent successfully! We'll get back to you soon.
                    </div>
                  )}
                  {contactError && (
                    <div className='mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-center'>
                      {contactError}
                    </div>
                  )}
                  <form className='space-y-4' onSubmit={handleContactSubmit}>
                    <div>
                      <label className='block mb-2 font-medium'>Name</label>
                      <Input 
                        placeholder='Your name' 
                        className='w-full' 
                        style={{ backgroundColor: inputBgColor }}
                        value={contactForm.name}
                        onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className='block mb-2 font-medium'>Email</label>
                      <Input 
                        type='email' 
                        placeholder='your@email.com' 
                        className='w-full' 
                        style={{ backgroundColor: inputBgColor }}
                        value={contactForm.email}
                        onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    {showPhone && (
                      <div>
                        <label className='block mb-2 font-medium'>Phone</label>
                        <Input 
                          type='tel' 
                          placeholder='Your phone number' 
                          className='w-full' 
                          style={{ backgroundColor: inputBgColor }}
                          value={contactForm.phone}
                          onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    )}
                    <div>
                      <label className='block mb-2 font-medium'>Message</label>
                      <Textarea 
                        placeholder='Your message...' 
                        rows={5} 
                        className='w-full' 
                        style={{ backgroundColor: inputBgColor }}
                        value={contactForm.message}
                        onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        required
                      />
                    </div>
                    <Button 
                      type='submit' 
                      className='w-full font-semibold'
                      style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                      disabled={contactSubmitting}
                    >
                      {contactSubmitting ? 'Sending...' : buttonText}
                    </Button>
                  </form>
                </div>
              </div>
            );
          }

          // Newsletter Section
          if (section.type === 'newsletter') {
            return (
              <div key={section.id} className='py-12 px-6 bg-green-600 text-white'>
                <div className='max-w-3xl mx-auto text-center'>
                  <h2 className='text-3xl font-bold mb-4'>{section.heading || 'Subscribe to Our Newsletter'}</h2>
                  <p className='text-lg mb-8 opacity-90'>{section.description}</p>
                  <div className='flex gap-4 max-w-md mx-auto'>
                    <Input type='email' placeholder='Enter your email' className='flex-1 bg-white text-black' />
                    <Button className='bg-white text-green-600 hover:bg-gray-100 font-bold px-8'>
                      {section.button_text || 'Subscribe'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          // Featured Product Section (Single Product Highlight)
          if (section.type === 'featured_product') {
            const featuredProduct = products.find(p => p.featured) || products[0];
            if (!featuredProduct) return null;
            
            return (
              <div key={section.id} className='py-16 px-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800'>
                <div className='max-w-6xl mx-auto'>
                  <div className='grid md:grid-cols-2 gap-12 items-center'>
                    <div className='aspect-square rounded-2xl overflow-hidden shadow-2xl'>
                      <img src={featuredProduct.image_url} alt={featuredProduct.title} className='w-full h-full object-cover' />
                    </div>
                    <div>
                      <div className='inline-block px-4 py-1 bg-yellow-400 text-black text-sm font-bold rounded-full mb-4'>FEATURED</div>
                      <h2 className='text-4xl font-bold mb-4'>{featuredProduct.title}</h2>
                      <p className='text-lg mb-6 opacity-80'>{featuredProduct.description}</p>
                      <div className='text-5xl font-bold mb-8'>${featuredProduct.price.toFixed(2)}</div>
                      <Button onClick={() => handlePurchase(featuredProduct.id)} className={`primary-btn ${buttonSize}`}>
                        <ShoppingCart className='w-5 h-5 mr-2' />Buy Now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Featured Collection Section
          if (section.type === 'featured_collection') {
            const collectionProducts = products.filter(p => p.featured).slice(0, 3);
            return (
              <div key={section.id} className='py-12 px-6'>
                <div className='max-w-7xl mx-auto'>
                  <h2 style={{ fontSize: fontSize.heading }} className='font-bold mb-8 text-center'>{section.title || 'Featured Collection'}</h2>
                  <div className='grid md:grid-cols-3 gap-6'>
                    {collectionProducts.map(product => (
                      <div key={product.id} className='group cursor-pointer relative overflow-hidden rounded-lg aspect-[4/3]' onClick={() => handlePurchase(product.id)}>
                        {/* Payhip-style hover reveal: Image fills entire card */}
                        <img 
                          src={product.image_url || "/placeholder.svg"} 
                          alt={product.title}
                          className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                        />
                        
                        {/* Featured badge */}
                        <div className='absolute top-3 left-3 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded z-10'>FEATURED</div>
                        
                        {/* Dark overlay on hover */}
                        <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                        
                        {/* Title and price reveal on hover */}
                        <div className='absolute inset-0 flex flex-col items-center justify-center p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                          <h3 className='text-white text-xl font-bold text-center mb-3 line-clamp-2'>{product.title}</h3>
                          <div className='text-white text-2xl font-bold'>${product.price.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Featured Collection List Section
          if (section.type === 'featured_collection_list') {
            const collections = [
              { name: 'New Arrivals', products: products.slice(0, 4) },
              { name: 'Best Sellers', products: products.filter(p => p.featured).slice(0, 4) },
              { name: 'On Sale', products: products.slice(0, 4) }
            ];
            
            return (
              <div key={section.id} className='py-12 px-6'>
                <div className='max-w-7xl mx-auto space-y-12'>
                  {collections.map((collection, idx) => (
                    <div key={idx}>
                      <div className='flex items-center justify-between mb-6'>
                        <h2 className='text-3xl font-bold'>{collection.name}</h2>
                        <a href='#' className='text-green-600 hover:underline'>View All →</a>
                      </div>
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        {collection.products.map(product => (
                          <div key={product.id} className='group cursor-pointer relative overflow-hidden rounded-lg aspect-[4/3]' onClick={() => handlePurchase(product.id)}>
                            {/* Payhip-style hover reveal: Image fills entire card */}
                            <img 
                              src={product.image_url || "/placeholder.svg"} 
                              alt={product.title}
                              className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                            />
                            
                            {/* Dark overlay on hover */}
                            <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                            
                            {/* Title and price reveal on hover */}
                            <div className='absolute inset-0 flex flex-col items-center justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                              <h3 className='text-white text-base font-bold text-center mb-2 line-clamp-2'>{product.title}</h3>
                              <div className='text-white text-lg font-bold'>${product.price.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Basic List Section
          if (section.type === 'basic_list') {
            const listItems = section.items || ['Item 1', 'Item 2', 'Item 3'];
            return (
              <div key={section.id} className='py-12 px-6'>
                <div className='max-w-4xl mx-auto'>
                  {section.title && <h2 className='text-3xl font-bold mb-8'>{section.title}</h2>}
                  <ul className='space-y-4'>
                    {listItems.map((item: string, idx: number) => (
                      <li key={idx} className='flex items-start gap-3'>
                        <span className='text-green-600 text-xl'>✓</span>
                        <span className='text-lg'>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          }

          // Slider List Section (Horizontal Scrolling)
          if (section.type === 'slider_list') {
            return (
              <div key={section.id} className='py-12 px-6 bg-gray-50 dark:bg-gray-900'>
                <div className='max-w-7xl mx-auto'>
                  {section.title && <h2 className='text-3xl font-bold mb-8'>{section.title}</h2>}
                  <div className='flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory'>
                    {products.slice(0, 8).map(product => (
                      <div key={product.id} className='flex-none w-64 snap-start group cursor-pointer relative overflow-hidden rounded-lg aspect-[4/3]' onClick={() => handlePurchase(product.id)}>
                        {/* Payhip-style hover reveal: Image fills entire card */}
                        <img 
                          src={product.image_url || "/placeholder.svg"} 
                          alt={product.title}
                          className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                        />
                        
                        {/* Dark overlay on hover */}
                        <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                        
                        {/* Title and price reveal on hover */}
                        <div className='absolute inset-0 flex flex-col items-center justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                          <h3 className='text-white text-lg font-bold text-center mb-2 line-clamp-2'>{product.title}</h3>
                          <div className='text-white text-xl font-bold'>${product.price.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Logo List Section
          if (section.type === 'logo_list') {
            const logos = section.logos || [
              'https://via.placeholder.com/150x60?text=Brand+1',
              'https://via.placeholder.com/150x60?text=Brand+2',
              'https://via.placeholder.com/150x60?text=Brand+3',
              'https://via.placeholder.com/150x60?text=Brand+4',
              'https://via.placeholder.com/150x60?text=Brand+5',
              'https://via.placeholder.com/150x60?text=Brand+6'
            ];
            
            return (
              <div key={section.id} className='py-12 px-6 bg-gray-100 dark:bg-gray-800'>
                <div className='max-w-7xl mx-auto'>
                  {section.title && <h2 className='text-2xl font-bold mb-8 text-center opacity-60'>{section.title || 'Trusted By'}</h2>}
                  <div className='grid grid-cols-3 md:grid-cols-6 gap-8 items-center'>
                    {logos.map((logo: string, idx: number) => (
                      <div key={idx} className='flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity'>
                        <img src={logo} alt={`Logo ${idx + 1}`} className='max-h-12 w-auto grayscale hover:grayscale-0 transition-all' />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Featured Blog Posts Section
          if (section.type === 'featured_blog_posts') {
            const blogPosts = [
              { title: 'Getting Started Guide', excerpt: 'Learn how to make the most of our products...', image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop', date: 'Jan 15, 2024' },
              { title: 'Tips and Tricks', excerpt: 'Discover advanced features and hidden gems...', image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop', date: 'Jan 10, 2024' },
              { title: 'Customer Success Stories', excerpt: 'See how others are using our products...', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop', date: 'Jan 5, 2024' }
            ];
            
            return (
              <div key={section.id} className='py-12 px-6'>
                <div className='max-w-7xl mx-auto'>
                  <h2 className='text-3xl font-bold mb-8'>{section.title || 'Latest Posts'}</h2>
                  <div className='grid md:grid-cols-3 gap-8'>
                    {blogPosts.map((post, idx) => (
                      <article key={idx} className='bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow'>
                        <img src={post.image} alt={post.title} className='w-full h-48 object-cover' />
                        <div className='p-6'>
                          <div className='text-sm text-gray-500 mb-2'>{post.date}</div>
                          <h3 className='text-xl font-bold mb-3'>{post.title}</h3>
                          <p className='text-gray-600 dark:text-gray-400 mb-4'>{post.excerpt}</p>
                          <a href='#' className='text-green-600 hover:underline font-semibold'>Read More →</a>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            );
          }



          // Roadmap Gallery Section - Pro Only
          if (section.type === 'roadmap_gallery') {
            // Check if owner has Pro access
            if (!['pro', 'pro_plus', 'enterprise'].includes(ownerSubscriptionTier)) {
              return (
                <div key={section.id} className="py-16 px-4 sm:px-6 text-center">
                  <div className="max-w-md mx-auto p-8 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Roadmap Gallery is a Pro Feature</h3>
                    <p className="text-gray-400 text-sm">
                      Upgrade to Pro, Pro+, or Enterprise to display your product roadmaps.
                    </p>
                  </div>
                </div>
              );
            }

            // Get customization settings
            const backgroundColor = section.settings?.backgroundColor || '#0f172a';
            const backgroundOpacity = section.settings?.backgroundOpacity ?? 100;
            const gradientStyle = section.settings?.gradientStyle || 'none';
            const cardBackgroundColor = section.settings?.cardBackgroundColor || '#1e293b';
            const cardBorderColor = section.settings?.cardBorderColor || '#3b82f6';
            const cardOpacity = section.settings?.cardOpacity ?? 100;
            const cardBorderRadius = section.settings?.cardBorderRadius || 'rounded-2xl';
            const cardsPerRow = section.settings?.cardsPerRow || 'auto';
            const sectionPadding = section.settings?.sectionPadding || 'py-16';

            // Convert hex to rgba for transparency - MOVED BEFORE USAGE
            const hexToRgba = (hex: string, opacity: number) => {
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
            };

            // Debug: Log the settings to see what colors are being used
            console.log('Roadmap Gallery Settings:', {
              cardBackgroundColor,
              cardBorderColor,
              cardOpacity,
              backgroundColor,
              backgroundOpacity,
              hexToRgbaResult: hexToRgba(cardBackgroundColor, cardOpacity),
              section: section.settings
            });

            // Gradient styles
            const gradientStyles = {
              'none': 'transparent',
              'purple-blue': 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))',
              'blue-cyan': 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(6, 182, 212, 0.3))',
              'purple-pink': 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3))',
              'dark-gradient': 'linear-gradient(135deg, rgba(0, 0, 0, 0.5), rgba(30, 41, 59, 0.5))'
            };

            // Grid classes based on cards per row
            const gridClasses = {
              'auto': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
              '1': 'grid-cols-1',
              '2': 'grid-cols-1 md:grid-cols-2',
              '3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
              '4': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            };

            const cardGlow = section.settings?.cardGlow || false;
            const showBackgroundOrbs = section.settings?.showBackgroundOrbs !== false;

            return (
              <div 
                key={section.id} 
                className={`${sectionPadding} px-4 sm:px-6 relative overflow-hidden`}
                style={{
                  backgroundColor: hexToRgba(backgroundColor, backgroundOpacity),
                  backgroundImage: gradientStyles[gradientStyle as keyof typeof gradientStyles]
                }}
              >
                {/* Background Effects - Conditional Orbs */}
                {showBackgroundOrbs && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
                  </div>
                )}

                <div className="max-w-6xl mx-auto relative z-10">
                  {/* Header */}
                  <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                      {section.settings?.title || 'Product Roadmaps'}
                    </h2>
                    <p className="text-slate-400 text-lg">
                      {section.settings?.subtitle || 'Track our development progress across all products'}
                    </p>
                  </div>

                  {/* Custom Roadmap Dashboard */}
                  <CustomRoadmapGallery
                    creatorId={website.user_id}
                    isOwner={isOwner}
                    storeName={website.profiles?.display_name}
                    storeLogo={pageSections.find(s => s.type === 'header')?.settings?.logo || pageSections.find(s => s.type === 'header')?.logo_url}
                    storeSlug={slug}
                    onSelectRoadmap={(productId) => {
                      navigate(`/site/${slug}/roadmap/${productId}`);
                    }}
                    customStyles={{
                      cardBackgroundColor: hexToRgba(cardBackgroundColor, cardOpacity),
                      cardBorderColor,
                      cardBorderRadius,
                      gridClasses: gridClasses[cardsPerRow as keyof typeof gridClasses],
                      cardGlow
                    }}
                  />
                </div>
              </div>
            );
          }

          // Footer Section
          if (section.type === 'footer') {
            const isTransparent = section.settings?.transparent === true;
            const footerBgColor = section.settings?.bgColor || '#f1f5f9';
            const textColor = section.settings?.textColor || '#64748b';
            const storeName = section.settings?.storeName || website.profiles?.display_name || 'My Store';
            const socialLinks = section.settings?.socialLinks || [
              { platform: 'Discord', url: '' },
              { platform: 'YouTube', url: '' },
              { platform: 'Twitter', url: '' }
            ];
            
            return (
              <div 
                key={section.id} 
                className='py-12 px-6 text-center border-t'
                style={{ 
                  backgroundColor: isTransparent ? 'transparent' : footerBgColor,
                  color: textColor
                }}
              >
                <div className='max-w-4xl mx-auto'>
                  {/* Store Name */}
                  <h3 className='text-2xl font-bold mb-6' style={{ color: textColor }}>
                    {storeName}
                  </h3>
                  
                  {/* Social Links */}
                  {section.settings?.showSocial !== false && (
                    <div className='flex justify-center gap-6 mb-8'>
                      {socialLinks.map((link: any, idx: number) => (
                        link.url && (
                          <a 
                            key={idx}
                            href={link.url} 
                            target='_blank'
                            rel='noopener noreferrer'
                            className='hover:opacity-70 transition-opacity text-lg'
                            style={{ color: textColor }}
                          >
                            {link.platform}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                  
                  {/* Powered by text */}
                  <p className='text-sm opacity-60' style={{ color: textColor }}>
                    Powered by Luzon Marketplace
                  </p>
                </div>
              </div>
            );
          }

          return null;
        })}
        </>
        )}
        </div>
      )}
    </div>
    </>
  );
};

export default UserSite;
