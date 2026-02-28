import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { X, Plus, ChevronRight, Settings, Home, Image, Grid, Layout as LayoutIcon, Type, Palette, ChevronDown, ChevronUp, Trash2, GripVertical, Sparkles, FileText, Users, Heart, Target, Navigation } from "lucide-react";
import { ProductPickerModal } from "./ProductPickerModal";
import { CollectionManager } from "./CollectionManager";
import { ImageUploadZone } from "./ImageUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { RoadmapSettings, ROADMAP_THEMES, applyThemeToSettings } from "@/lib/roadmapThemes";
import { PageManager, StorePage } from "./PageManager";
import { CommunitySettings, DEFAULT_COMMUNITY_SETTINGS } from "@/lib/communitySettings";
import { AboutPageSettings, TosPageSettings, DEFAULT_ABOUT_SETTINGS, DEFAULT_TOS_SETTINGS } from "@/lib/pageSettings";
import { HeaderConfig, DEFAULT_HEADER_CONFIG, NAV_ICONS } from "./SiteHeader";

interface PageBuilderSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sections: any[];
  onAddSection: (type: string) => void;
  onUpdateSection: (section: any) => void;
  onDeleteSection: (id: string) => void;
  onReorderSections: (sections: any[]) => void;
  onOpenStyleEditor: () => void;
  saving: boolean;
  onSave: () => void;
  settings?: any;
  onSettingsChange?: (settings: any) => void;
  // Roadmap-specific props
  isRoadmapMode?: boolean;
  roadmapSettings?: RoadmapSettings;
  onRoadmapSettingsChange?: (settings: RoadmapSettings) => void;
  // Community-specific props
  isCommunityMode?: boolean;
  communitySettings?: CommunitySettings;
  onCommunitySettingsChange?: (settings: CommunitySettings) => void;
  // About page props
  isAboutMode?: boolean;
  aboutSettings?: AboutPageSettings;
  onAboutSettingsChange?: (settings: AboutPageSettings) => void;
  // TOS page props
  isTosMode?: boolean;
  tosSettings?: TosPageSettings;
  onTosSettingsChange?: (settings: TosPageSettings) => void;
  // Site Header props
  headerConfig?: HeaderConfig;
  onHeaderConfigChange?: (config: HeaderConfig) => void;
  // Page manager props
  pages?: StorePage[];
  currentPageId?: string;
  onPageChange?: (pageId: string) => void;
  onAddPage?: (type: StorePage['type']) => void;
  onDeletePage?: (pageId: string) => void;
  onUpdatePage?: (page: StorePage) => void;
  onReorderPages?: (pages: StorePage[]) => void;
  subscriptionTier?: string;
}

export const PageBuilderSidebar = ({ 
  isOpen, 
  onClose, 
  sections, 
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onReorderSections,
  onOpenStyleEditor,
  saving,
  onSave,
  settings = {},
  onSettingsChange = () => {},
  // Roadmap-specific props
  isRoadmapMode = false,
  roadmapSettings,
  onRoadmapSettingsChange = () => {},
  // Community-specific props
  isCommunityMode = false,
  communitySettings,
  onCommunitySettingsChange = () => {},
  // About page props
  isAboutMode = false,
  aboutSettings,
  onAboutSettingsChange = () => {},
  // TOS page props
  isTosMode = false,
  tosSettings,
  onTosSettingsChange = () => {},
  // Site Header props
  headerConfig,
  onHeaderConfigChange = () => {},
  // Page manager props
  pages = [],
  currentPageId = 'home',
  onPageChange = () => {},
  onAddPage = () => {},
  onDeletePage = () => {},
  onUpdatePage = () => {},
  onReorderPages = () => {},
  subscriptionTier = 'free'
}: PageBuilderSidebarProps) => {
  const [_editingSection, setEditingSection] = useState<any>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedSubsection, setExpandedSubsection] = useState<string | null>(null);
  const [expandedSubsections, setExpandedSubsections] = useState<Record<string, boolean>>({});
  const [showAddSectionMenu, setShowAddSectionMenu] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [currentSection, setCurrentSection] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pages' | 'sections' | 'style' | 'settings'>('sections');

  // Toggle subsection for footer and other complex sections
  const toggleSubsection = (key: string) => {
    setExpandedSubsections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Fetch products for collection manager
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, title, image_url")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  if (!isOpen) return null;

  const sectionIcons: Record<string, any> = {
    header: LayoutIcon,
    hero: Image,
    slideshow: Image,
    featured_products: Grid,
    product_grid: Grid,
    collections: Grid,
    about: Type,
    newsletter: Type,
    testimonials: Type,
    footer: LayoutIcon,
    text: Type,
    video: Image,
    gallery: Grid,
    contact_us: Type,
    image: Image,
    image_with_text: Image,
  };

  const sectionNames: Record<string, string> = {
    header: "Header",
    hero: "Hero Banner",
    slideshow: "Slideshow",
    featured_products: "Featured Products",
    product_grid: "Product Grid",
    collections: "Collections",
    about: "About Section",
    newsletter: "Newsletter Signup",
    testimonials: "Testimonials",
    footer: "Footer",
    text: "Text Block",
    video: "Video",
    gallery: "Gallery",
    contact_us: "Contact Form",
    image: "Image",
    image_with_text: "Image with Text",
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  // Section editing inline
  const renderSectionEditor = (section: any) => {
    if (expandedSection !== section.id) return null;

    return (
      <div className="p-3 bg-gray-800 border-t border-gray-700 space-y-3">
        {/* Header Section Settings */}
        {section.type === 'header' && (
          <>
            {/* Store Logo Section - Collapsible */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'header-logo' ? null : 'header-logo')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Store Logo</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'header-logo' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'header-logo' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                <div>
                  <ImageUploadZone
                    value={section.settings?.logo || ''}
                    onChange={(url) => onUpdateSection({ ...section, settings: { ...section.settings, logo: url }})}
                    label=""
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Logo Height (px)</Label>
                  <Input
                    type="number"
                    min="30"
                    max="300"
                    value={section.settings?.logoHeight || 80}
                    onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, logoHeight: parseInt(e.target.value) }})}
                    className="bg-gray-900 border-gray-700 text-white mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 60-100px</p>
                </div>
                </div>
              )}
            </div>

            {/* Navigation Links Section - Collapsible */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'header-nav' ? null : 'header-nav')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Navigation Links</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'header-nav' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'header-nav' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-300">Show Navigation</Label>
                  <Switch
                    checked={section.settings?.showNav !== false}
                    onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showNav: checked }})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-300">Show Search</Label>
                  <Switch
                    checked={section.settings?.showSearch !== false}
                    onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showSearch: checked }})}
                  />
                </div>
                </div>
              )}
            </div>

            {/* Header Settings Section - Collapsible */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'header-settings' ? null : 'header-settings')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Header Settings</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'header-settings' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'header-settings' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                <div>
                  <Label className="text-xs text-gray-300">Navigation Style</Label>
                  <Select 
                    value={section.settings?.navStyle || 'horizontal'} 
                    onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, navStyle: value }})}
                  >
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                      <SelectItem value="centered">Centered</SelectItem>
                      <SelectItem value="split">Split</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-300">Transparent Background</Label>
                  <Switch
                    checked={section.settings?.transparent === true}
                    onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, transparent: checked }})}
                  />
                </div>
                {section.settings?.transparent && (
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Blur Effect</Label>
                    <Switch
                      checked={section.settings?.blur !== false}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, blur: checked }})}
                    />
                  </div>
                )}
                {!section.settings?.transparent && (
                  <div>
                    <Label className="text-xs text-gray-300">Background Color</Label>
                    <Input
                      type="color"
                      value={section.settings?.headerBgColor || '#ffffff'}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, headerBgColor: e.target.value }})}
                      className="bg-gray-900 border-gray-700 h-10 mt-1"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-xs text-gray-300">Text & Link Color</Label>
                  <Input
                    type="color"
                    value={section.settings?.textColor || '#000000'}
                    onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, textColor: e.target.value }})}
                    className="bg-gray-900 border-gray-700 h-10 mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Applies to logo text and navigation links</p>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-300">Sticky Header</Label>
                  <Switch
                    checked={section.settings?.sticky === true}
                    onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, sticky: checked }})}
                  />
                </div>
                </div>
              )}
            </div>

            {/* Custom Navigation Links - Collapsible */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'header-links' ? null : 'header-links')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Custom Links</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'header-links' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'header-links' && (
                <div className="p-3 space-y-2 bg-gray-800/50">
                {(section.settings?.customLinks || [{ label: 'Shop', url: '#' }, { label: 'About', url: '#' }, { label: 'Contact', url: '#' }]).map((link: any, index: number) => (
                  <div key={index} className="p-2 bg-gray-800 rounded space-y-2">
                    <Input
                      placeholder="Link Text"
                      value={link.label}
                      onChange={(e) => {
                        const links = [...(section.settings?.customLinks || [{ label: 'Shop', url: '#' }, { label: 'About', url: '#' }, { label: 'Contact', url: '#' }])];
                        links[index] = { ...links[index], label: e.target.value };
                        onUpdateSection({ ...section, settings: { ...section.settings, customLinks: links }});
                      }}
                      className="bg-gray-900 border-gray-700 text-white text-xs"
                    />
                    <Input
                      placeholder="URL (e.g., #products or https://...)"
                      value={link.url}
                      onChange={(e) => {
                        const links = [...(section.settings?.customLinks || [{ label: 'Shop', url: '#' }, { label: 'About', url: '#' }, { label: 'Contact', url: '#' }])];
                        links[index] = { ...links[index], url: e.target.value };
                        onUpdateSection({ ...section, settings: { ...section.settings, customLinks: links }});
                      }}
                      className="bg-gray-900 border-gray-700 text-white text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const links = (section.settings?.customLinks || [{ label: 'Shop', url: '#' }, { label: 'About', url: '#' }, { label: 'Contact', url: '#' }]).filter((_: any, i: number) => i !== index);
                        onUpdateSection({ ...section, settings: { ...section.settings, customLinks: links }});
                      }}
                      className="w-full text-red-400 hover:text-red-300 text-xs"
                    >
                      Remove Link
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  onClick={() => {
                    const links = [...(section.settings?.customLinks || [{ label: 'Shop', url: '#' }, { label: 'About', url: '#' }, { label: 'Contact', url: '#' }]), { label: 'New Link', url: '#' }];
                    onUpdateSection({ ...section, settings: { ...section.settings, customLinks: links }});
                  }}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-xs"
                >
                  + Add Link
                </Button>
                </div>
              )}
            </div>

            {/* Announcement Bar Section - Collapsible */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'header-announcement' ? null : 'header-announcement')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Announcement Bar</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'header-announcement' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'header-announcement' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-300">Show Announcement</Label>
                  <Switch
                    checked={section.settings?.showAnnouncement === true}
                    onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showAnnouncement: checked }})}
                  />
                </div>
                {section.settings?.showAnnouncement && (
                  <>
                    <div>
                      <Label className="text-xs text-gray-300">Announcement Text</Label>
                      <Input
                        value={section.settings?.announcementText || ''}
                        onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, announcementText: e.target.value }})}
                        placeholder="Free shipping on orders over $50!"
                        className="bg-gray-900 border-gray-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-300">Bar Color</Label>
                      <Input
                        type="color"
                        value={section.settings?.announcementBgColor || '#3b82f6'}
                        onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, announcementBgColor: e.target.value }})}
                        className="bg-gray-900 border-gray-700 h-10 mt-1"
                      />
                    </div>
                  </>
                )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Hero Section Settings */}
        {section.type === 'hero' && (
          <>
            <div>
              <Label className="text-xs text-gray-300">Title</Label>
              <Input
                value={section.settings?.title || ''}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, title: e.target.value }})}
                placeholder="Welcome to our store"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Subtitle</Label>
              <Textarea
                value={section.settings?.subtitle || ''}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, subtitle: e.target.value }})}
                placeholder="Discover amazing products..."
                rows={2}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300 mb-2 block">Background Image</Label>
              <ImageUploadZone
                label="Upload Hero Background"
                value={section.settings?.backgroundImage || ''}
                onChange={(url) => onUpdateSection({ ...section, settings: { ...section.settings, backgroundImage: url }})}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Button Text</Label>
              <Input
                value={section.settings?.buttonText || 'Shop Now'}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, buttonText: e.target.value }})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Height</Label>
              <Select 
                value={section.settings?.height || 'medium'} 
                onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, height: value }})}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (300px)</SelectItem>
                  <SelectItem value="medium">Medium (500px)</SelectItem>
                  <SelectItem value="large">Large (700px)</SelectItem>
                  <SelectItem value="fullscreen">Full Screen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Slideshow Section Settings */}
        {section.type === 'slideshow' && (
          <>
            {/* Slides/Items Subsection */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'slideshow-items' ? null : 'slideshow-items')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Slides</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'slideshow-items' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'slideshow-items' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                  <ImageUploadZone
                    value=""
                    onChange={() => {}}
                    label="Slide Images"
                    multiple
                    values={section.settings?.slides || []}
                    onMultipleChange={(urls) => onUpdateSection({ ...section, settings: { ...section.settings, slides: urls }})}
                  />
                  <p className="text-xs text-gray-400">Add multiple images for your slideshow</p>
                </div>
              )}
            </div>

            {/* Layout & Style Subsection */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'slideshow-layout' ? null : 'slideshow-layout')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Layout & Style</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'slideshow-layout' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'slideshow-layout' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                  <div>
                    <Label className="text-xs text-gray-300">Slide Height</Label>
                    <Select 
                      value={section.settings?.slideHeight || 'medium'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, slideHeight: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (300px)</SelectItem>
                        <SelectItem value="medium">Medium (500px)</SelectItem>
                        <SelectItem value="large">Large (700px)</SelectItem>
                        <SelectItem value="full">Full Screen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Overlay Opacity (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={section.settings?.overlayOpacity || 50}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, overlayOpacity: parseInt(e.target.value) }})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Overlay Color</Label>
                    <Input
                      type="color"
                      value={section.settings?.overlayColor || '#000000'}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, overlayColor: e.target.value }})}
                      className="bg-gray-900 border-gray-700 h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Text Alignment</Label>
                    <Select 
                      value={section.settings?.textAlign || 'center'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, textAlign: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Content Position</Label>
                    <Select 
                      value={section.settings?.contentPosition || 'center'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, contentPosition: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Behavior Subsection */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'slideshow-behavior' ? null : 'slideshow-behavior')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Behavior</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'slideshow-behavior' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'slideshow-behavior' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Auto-play</Label>
                    <Switch
                      checked={section.settings?.autoplay !== false}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, autoplay: checked }})}
                    />
                  </div>
                  {section.settings?.autoplay !== false && (
                    <div>
                      <Label className="text-xs text-gray-300">Slide Duration (seconds)</Label>
                      <Input
                        type="number"
                        min="2"
                        max="10"
                        value={section.settings?.slideDuration || 5}
                        onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, slideDuration: parseInt(e.target.value) }})}
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-300">Transition Type</Label>
                    <Select 
                      value={section.settings?.transitionType || 'fade'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, transitionType: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fade">Fade</SelectItem>
                        <SelectItem value="slide">Slide</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Controls Layout</Label>
                    <Select 
                      value={section.settings?.controlsLayout || 'standard'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, controlsLayout: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Show Arrows</Label>
                    <Switch
                      checked={section.settings?.showArrows !== false}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showArrows: checked }})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Show Dots</Label>
                    <Switch
                      checked={section.settings?.showDots !== false}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showDots: checked }})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Pause on Hover</Label>
                    <Switch
                      checked={section.settings?.pauseOnHover === true}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, pauseOnHover: checked }})}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Text Content Subsection */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'slideshow-text' ? null : 'slideshow-text')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Text Content</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'slideshow-text' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'slideshow-text' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                  <div>
                    <Label className="text-xs text-gray-300">Heading</Label>
                    <Input
                      value={section.settings?.heading || ''}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, heading: e.target.value }})}
                      placeholder="Welcome to my store"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Subheading</Label>
                    <Textarea
                      value={section.settings?.subheading || ''}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, subheading: e.target.value }})}
                      placeholder="Check out my amazing products"
                      rows={2}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Heading Size</Label>
                    <Select 
                      value={section.settings?.headingSize || 'h1'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, headingSize: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h1">Heading 1 (Largest)</SelectItem>
                        <SelectItem value="h2">Heading 2</SelectItem>
                        <SelectItem value="h3">Heading 3</SelectItem>
                        <SelectItem value="h4">Heading 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Text Color</Label>
                    <Input
                      type="color"
                      value={section.settings?.textColor || '#ffffff'}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, textColor: e.target.value }})}
                      className="bg-gray-900 border-gray-700 h-10"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Button Settings Subsection */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'slideshow-button' ? null : 'slideshow-button')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Button Settings</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'slideshow-button' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'slideshow-button' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Show Button</Label>
                    <Switch
                      checked={section.settings?.showButton !== false}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showButton: checked }})}
                    />
                  </div>
                  {section.settings?.showButton !== false && (
                    <>
                      <div>
                        <Label className="text-xs text-gray-300">Button Text</Label>
                        <Input
                          value={section.settings?.buttonText || 'Shop Now'}
                          onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, buttonText: e.target.value }})}
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-300">Button Link</Label>
                        <Input
                          value={section.settings?.buttonLink || '#products'}
                          onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, buttonLink: e.target.value }})}
                          placeholder="#products or https://..."
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-300">Button Style</Label>
                        <Select 
                          value={section.settings?.buttonStyle || 'primary'} 
                          onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, buttonStyle: value }})}
                        >
                          <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                            <SelectItem value="outline">Outline</SelectItem>
                            <SelectItem value="ghost">Ghost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-300">Button Size</Label>
                        <Select 
                          value={section.settings?.buttonSize || 'medium'} 
                          onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, buttonSize: value }})}
                        >
                          <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Product Grid Section Settings */}
        {(section.type === 'product_grid' || section.type === 'featured_products') && (
          <>
            {/* Content Subsection */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'products-content' ? null : 'products-content')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Content</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'products-content' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'products-content' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                  <div>
                    <Label className="text-xs text-gray-300">Section Title</Label>
                    <Input
                      value={section.settings?.title || 'Products'}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, title: e.target.value }})}
                      placeholder="Products"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Section Description</Label>
                    <Textarea
                      value={section.settings?.description || ''}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, description: e.target.value }})}
                      placeholder="Browse our collection..."
                      rows={2}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  {section.type === 'featured_products' && (
                    <div>
                      <Label className="text-xs text-gray-300 mb-2 block">Select Products</Label>
                      <Button
                        onClick={() => {
                          setCurrentSection(section);
                          setShowProductPicker(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
                      >
                        Choose Products ({section.settings?.selectedProducts?.length || 0} selected)
                      </Button>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-300">Max Products to Show</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={section.settings?.maxProducts || 12}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, maxProducts: parseInt(e.target.value) }})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Sort By</Label>
                    <Select 
                      value={section.settings?.sortBy || 'newest'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, sortBy: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="popular">Most Popular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Layout & Style Subsection */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'products-layout' ? null : 'products-layout')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Layout & Style</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'products-layout' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'products-layout' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                  <div>
                    <Label className="text-xs text-gray-300">Products Per Row</Label>
                    <Select 
                      value={section.settings?.productsPerRow || '4'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, productsPerRow: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Products</SelectItem>
                        <SelectItem value="3">3 Products</SelectItem>
                        <SelectItem value="4">4 Products</SelectItem>
                        <SelectItem value="5">5 Products</SelectItem>
                        <SelectItem value="6">6 Products</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Card Style</Label>
                    <Select 
                      value={section.settings?.cardStyle || 'standard'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, cardStyle: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="hover-reveal">Hover Reveal (Payhip Style)</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="gaming">Gaming/Cyber</SelectItem>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="elevated">Elevated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Card Spacing</Label>
                    <Select 
                      value={section.settings?.cardSpacing || 'normal'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, cardSpacing: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact (16px)</SelectItem>
                        <SelectItem value="normal">Normal (24px)</SelectItem>
                        <SelectItem value="relaxed">Relaxed (32px)</SelectItem>
                        <SelectItem value="spacious">Spacious (48px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Image Aspect Ratio</Label>
                    <Select 
                      value={section.settings?.imageAspect || 'square'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, imageAspect: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">Square (1:1)</SelectItem>
                        <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                        <SelectItem value="landscape">Landscape (4:3)</SelectItem>
                        <SelectItem value="wide">Wide (16:9)</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Image Fit</Label>
                    <Select 
                      value={section.settings?.imageFit || 'cover'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, imageFit: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover (Fill)</SelectItem>
                        <SelectItem value="contain">Contain (Fit)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Border Radius (px)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={section.settings?.borderRadius || 8}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, borderRadius: parseInt(e.target.value) }})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Show Shadow</Label>
                    <Switch
                      checked={section.settings?.showShadow !== false}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showShadow: checked }})}
                    />
                  </div>
                  {section.settings?.showShadow !== false && (
                    <div>
                      <Label className="text-xs text-gray-300">Shadow Intensity</Label>
                      <Select 
                        value={section.settings?.shadowIntensity || 'medium'} 
                        onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, shadowIntensity: value }})}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="strong">Strong</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Display Options Subsection */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'products-display' ? null : 'products-display')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Display Options</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'products-display' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'products-display' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Show Prices</Label>
                    <Switch
                      checked={section.settings?.showPrices !== false}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showPrices: checked }})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Show Ratings</Label>
                    <Switch
                      checked={section.settings?.showRatings !== false}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showRatings: checked }})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Show Downloads</Label>
                    <Switch
                      checked={section.settings?.showDownloads === true}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showDownloads: checked }})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Show Badges (New, Sale)</Label>
                    <Switch
                      checked={section.settings?.showBadges !== false}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showBadges: checked }})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Show Quick View</Label>
                    <Switch
                      checked={section.settings?.showQuickView === true}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showQuickView: checked }})}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Hover Effect</Label>
                    <Select 
                      value={section.settings?.hoverEffect || 'lift'} 
                      onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, hoverEffect: value }})}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="lift">Lift Up</SelectItem>
                        <SelectItem value="zoom">Zoom Image</SelectItem>
                        <SelectItem value="tilt">Tilt 3D</SelectItem>
                        <SelectItem value="glow">Glow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Colors Subsection */}
            <div className="border-b border-gray-700 mb-2">
              <button
                onClick={() => setExpandedSubsection(expandedSubsection === 'products-colors' ? null : 'products-colors')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-white">Colors</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSubsection === 'products-colors' ? 'rotate-90' : ''}`} />
              </button>
              {expandedSubsection === 'products-colors' && (
                <div className="p-3 space-y-3 bg-gray-800/50">
                  <div>
                    <Label className="text-xs text-gray-300">Card Background</Label>
                    <Input
                      type="color"
                      value={section.settings?.cardBgColor || '#ffffff'}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, cardBgColor: e.target.value }})}
                      className="bg-gray-900 border-gray-700 h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Text Color</Label>
                    <Input
                      type="color"
                      value={section.settings?.textColor || '#000000'}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, textColor: e.target.value }})}
                      className="bg-gray-900 border-gray-700 h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Price Color</Label>
                    <Input
                      type="color"
                      value={section.settings?.priceColor || '#2563eb'}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, priceColor: e.target.value }})}
                      className="bg-gray-900 border-gray-700 h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Button Color</Label>
                    <Input
                      type="color"
                      value={section.settings?.buttonColor || '#3b82f6'}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, buttonColor: e.target.value }})}
                      className="bg-gray-900 border-gray-700 h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Hover Overlay Color</Label>
                    <Input
                      type="color"
                      value={section.settings?.hoverOverlayColor || '#000000'}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, hoverOverlayColor: e.target.value }})}
                      className="bg-gray-900 border-gray-700 h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Hover Overlay Opacity (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={section.settings?.hoverOverlayOpacity || 60}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, hoverOverlayOpacity: parseInt(e.target.value) }})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}



        {/* Collections Section Settings */}
        {section.type === 'collections' && (
          <>
            <div>
              <Label className="text-xs text-gray-300">Section Title</Label>
              <Input
                value={section.settings?.title || 'Browse Collections'}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, title: e.target.value }})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Card Style</Label>
              <Select 
                value={section.settings?.cardStyle || 'standard'} 
                onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, cardStyle: value }})}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="hover-reveal">Hover Reveal (Payhip Style)</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="gaming">Gaming/Cyber</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CollectionManager
              collections={section.settings?.collections || []}
              products={products}
              onChange={(collections) =>
                onUpdateSection({
                  ...section,
                  settings: { ...section.settings, collections },
                })
              }
            />
          </>
        )}

        {/* About Section Settings */}
        {section.type === 'about' && (
          <>
            <div>
              <Label className="text-xs text-gray-300">Section Title</Label>
              <Input
                value={section.settings?.title || 'About Us'}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, title: e.target.value }})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Content</Label>
              <Textarea
                value={section.settings?.content || ''}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, content: e.target.value }})}
                placeholder="Tell your story..."
                rows={4}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300 mb-2 block">Image</Label>
              <ImageUploadZone
                label="Upload About Image"
                value={section.settings?.image || ''}
                onChange={(url) => onUpdateSection({ ...section, settings: { ...section.settings, image: url }})}
              />
            </div>
          </>
        )}

        {/* Newsletter Section Settings */}
        {section.type === 'newsletter' && (
          <>
            <div>
              <Label className="text-xs text-gray-300">Title</Label>
              <Input
                value={section.settings?.title || 'Stay Updated'}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, title: e.target.value }})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Subtitle</Label>
              <Input
                value={section.settings?.subtitle || 'Get notified about new products'}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, subtitle: e.target.value }})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Button Text</Label>
              <Input
                value={section.settings?.buttonText || 'Subscribe'}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, buttonText: e.target.value }})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </>
        )}

        {/* Text Section Settings */}
        {section.type === 'text' && (
          <>
            <div>
              <Label className="text-xs text-gray-300">Heading</Label>
              <Input
                value={section.settings?.heading || ''}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, heading: e.target.value }})}
                placeholder="Section heading (optional)"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Content</Label>
              <Textarea
                value={section.settings?.content || ''}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, content: e.target.value }})}
                placeholder="Your text content..."
                rows={6}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Text Alignment</Label>
              <Select 
                value={section.settings?.alignment || 'left'} 
                onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, alignment: value }})}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Video Section Settings */}
        {section.type === 'video' && (
          <>
            <div>
              <Label className="text-xs text-gray-300">Section Title</Label>
              <Input
                value={section.settings?.title || ''}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, title: e.target.value }})}
                placeholder="Video title (optional)"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Video URL</Label>
              <Input
                value={section.settings?.video_url || ''}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, video_url: e.target.value }})}
                placeholder="YouTube or Vimeo URL"
                className="bg-gray-900 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Supports YouTube and Vimeo links</p>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-300">Autoplay</Label>
              <Switch
                checked={section.settings?.autoplay === true}
                onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, autoplay: checked }})}
              />
            </div>
          </>
        )}

        {/* Gallery Section Settings */}
        {section.type === 'gallery' && (
          <>
            <div>
              <Label className="text-xs text-gray-300">Section Title</Label>
              <Input
                value={section.settings?.title || ''}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, title: e.target.value }})}
                placeholder="Gallery title (optional)"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Columns</Label>
              <Select 
                value={section.settings?.columns?.toString() || '3'} 
                onValueChange={(value) => onUpdateSection({ ...section, settings: { ...section.settings, columns: parseInt(value) }})}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <ImageUploadZone
                value=""
                onChange={() => {}}
                label="Gallery Images"
                multiple
                values={section.settings?.images || []}
                onMultipleChange={(urls) => onUpdateSection({ ...section, settings: { ...section.settings, images: urls }})}
              />
            </div>
          </>
        )}

        {/* Testimonials Section Settings */}
        {section.type === 'testimonials' && (
          <>
            <div>
              <Label className="text-xs text-gray-300">Section Title</Label>
              <Input
                value={section.settings?.title || 'What Our Customers Say'}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, title: e.target.value }})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-xs text-gray-300">Testimonials</Label>
              {(section.settings?.testimonials || []).map((testimonial: any, index: number) => (
                <div key={index} className="p-3 bg-gray-800 rounded space-y-2">
                  <Input
                    placeholder="Customer name"
                    value={testimonial.name || ''}
                    onChange={(e) => {
                      const testimonials = [...(section.settings?.testimonials || [])];
                      testimonials[index] = { ...testimonials[index], name: e.target.value };
                      onUpdateSection({ ...section, settings: { ...section.settings, testimonials }});
                    }}
                    className="bg-gray-900 border-gray-700 text-white text-xs"
                  />
                  <Textarea
                    placeholder="Testimonial text..."
                    value={testimonial.text || ''}
                    onChange={(e) => {
                      const testimonials = [...(section.settings?.testimonials || [])];
                      testimonials[index] = { ...testimonials[index], text: e.target.value };
                      onUpdateSection({ ...section, settings: { ...section.settings, testimonials }});
                    }}
                    rows={2}
                    className="bg-gray-900 border-gray-700 text-white text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-400">Rating:</Label>
                    <Select 
                      value={testimonial.rating?.toString() || '5'} 
                      onValueChange={(value) => {
                        const testimonials = [...(section.settings?.testimonials || [])];
                        testimonials[index] = { ...testimonials[index], rating: parseInt(value) };
                        onUpdateSection({ ...section, settings: { ...section.settings, testimonials }});
                      }}
                    >
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 â­</SelectItem>
                        <SelectItem value="4">4 â­</SelectItem>
                        <SelectItem value="3">3 â­</SelectItem>
                        <SelectItem value="2">2 â­</SelectItem>
                        <SelectItem value="1">1 â­</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const testimonials = (section.settings?.testimonials || []).filter((_: any, i: number) => i !== index);
                      onUpdateSection({ ...section, settings: { ...section.settings, testimonials }});
                    }}
                    className="w-full text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                onClick={() => {
                  const testimonials = [...(section.settings?.testimonials || []), { name: '', text: '', rating: 5 }];
                  onUpdateSection({ ...section, settings: { ...section.settings, testimonials }});
                }}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-xs"
              >
                + Add Testimonial
              </Button>
            </div>
          </>
        )}

        {/* Contact Form Section Settings */}
        {section.type === 'contact_us' && (
          <>
            <div>
              <Label className="text-xs text-gray-300">Heading</Label>
              <Input
                value={section.settings?.heading || 'Get In Touch'}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, heading: e.target.value }})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-300">Show Phone Field</Label>
              <Switch
                checked={section.settings?.show_phone !== false}
                onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, show_phone: checked }})}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Submit Button Text</Label>
              <Input
                value={section.settings?.button_text || 'Send Message'}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, button_text: e.target.value }})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </>
        )}

        {/* Footer Section Settings */}
        {section.type === 'footer' && (
          <>
            {/* Appearance Subsection */}
            <div className="border-b border-gray-700 pb-3">
              <button
                onClick={() => toggleSubsection('footer-appearance')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-200 hover:text-white transition-colors"
              >
                <span>Appearance</span>
                {expandedSubsections['footer-appearance'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSubsections['footer-appearance'] && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Transparent Background</Label>
                    <Switch
                      checked={section.settings?.transparent === true}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, transparent: checked }})}
                    />
                  </div>
                  {!section.settings?.transparent && (
                    <div>
                      <Label className="text-xs text-gray-300">Background Color</Label>
                      <Input
                        type="color"
                        value={section.settings?.bgColor || '#f1f5f9'}
                        onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, bgColor: e.target.value }})}
                        className="h-10 bg-gray-900 border-gray-700"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-300">Text Color</Label>
                    <Input
                      type="color"
                      value={section.settings?.textColor || '#64748b'}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, textColor: e.target.value }})}
                      className="h-10 bg-gray-900 border-gray-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Content Subsection */}
            <div className="border-b border-gray-700 pb-3">
              <button
                onClick={() => toggleSubsection('footer-content')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-200 hover:text-white transition-colors"
              >
                <span>Content</span>
                {expandedSubsections['footer-content'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSubsections['footer-content'] && (
                <div className="mt-3 space-y-3">
                  <div>
                    <Label className="text-xs text-gray-300">Store Name</Label>
                    <Input
                      value={section.settings?.storeName || ''}
                      onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, storeName: e.target.value }})}
                      placeholder="Your Store Name"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Social Links Subsection */}
            <div className="border-b border-gray-700 pb-3">
              <button
                onClick={() => toggleSubsection('footer-social')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-200 hover:text-white transition-colors"
              >
                <span>Social Links</span>
                {expandedSubsections['footer-social'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSubsections['footer-social'] && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Show Social Links</Label>
                    <Switch
                      checked={section.settings?.showSocial !== false}
                      onCheckedChange={(checked) => onUpdateSection({ ...section, settings: { ...section.settings, showSocial: checked }})}
                    />
                  </div>
                  {section.settings?.showSocial !== false && (
                    <>
                      {['Discord', 'YouTube', 'Twitter', 'Instagram', 'Facebook'].map((platform) => {
                        const links = section.settings?.socialLinks || [];
                        const link = links.find((l: any) => l.platform === platform);
                        return (
                          <div key={platform}>
                            <Label className="text-xs text-gray-300">{platform} URL</Label>
                            <Input
                              value={link?.url || ''}
                              onChange={(e) => {
                                const newLinks = [...(section.settings?.socialLinks || [])];
                                const existingIndex = newLinks.findIndex((l: any) => l.platform === platform);
                                if (existingIndex >= 0) {
                                  newLinks[existingIndex].url = e.target.value;
                                } else {
                                  newLinks.push({ platform, url: e.target.value });
                                }
                                onUpdateSection({ ...section, settings: { ...section.settings, socialLinks: newLinks }});
                              }}
                              placeholder={`https://${platform.toLowerCase()}.com/...`}
                              className="bg-gray-900 border-gray-700 text-white text-xs"
                            />
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Delete Section Button */}
        <Button
          onClick={() => {
            onDeleteSection(section.id);
            setExpandedSection(null);
          }}
          variant="destructive"
          size="sm"
          className="w-full"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Section
        </Button>
      </div>
    );
  };

  // Determine which tab to show based on page mode
  const isSpecialPage = isRoadmapMode || isCommunityMode || isAboutMode || isTosMode;

  const SECTION_TYPES = [
    { type: 'header', label: 'Header', icon: '🔝', desc: 'Logo, nav, announcement bar' },
    { type: 'slideshow', label: 'Hero / Slideshow', icon: '🖼️', desc: 'Full-width hero with slides' },
    { type: 'product_grid', label: 'Product Grid', icon: '🛍️', desc: 'Showcase your products' },
    { type: 'featured_products', label: 'Featured Products', icon: '⭐', desc: 'Highlight top picks' },
    { type: 'collections', label: 'Collections', icon: '📂', desc: 'Tabbed product categories' },
    { type: 'testimonials', label: 'Testimonials', icon: '💬', desc: 'Customer reviews' },
    { type: 'newsletter', label: 'Newsletter', icon: '📧', desc: 'Email signup form' },
    { type: 'text', label: 'Text Block', icon: '📝', desc: 'Rich text content' },
    { type: 'image', label: 'Image Banner', icon: '🖼️', desc: 'Full-width image' },
    { type: 'image_with_text', label: 'Image + Text', icon: '📰', desc: 'Side-by-side layout' },
    { type: 'video', label: 'Video', icon: '▶️', desc: 'YouTube or Vimeo embed' },
    { type: 'gallery', label: 'Gallery', icon: '🎨', desc: 'Image grid gallery' },
    { type: 'contact_us', label: 'Contact Form', icon: '✉️', desc: 'Get in touch form' },
    { type: 'footer', label: 'Footer', icon: '⬇️', desc: 'Links, social, copyright' },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-[340px] bg-[#0a0a0a] border-r border-white/[0.07] text-white shadow-2xl z-50 flex flex-col overflow-hidden">
      
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#0d0d0d]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-sm font-bold text-white">Page Builder</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/[0.07] bg-[#0d0d0d]">
        {(['pages', 'sections', 'style', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-all ${
              activeTab === tab
                ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-950/20'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── PAGES TAB ── */}
        {activeTab === 'pages' && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-white/30 mb-3">Manage your store pages. Add, reorder, or remove pages.</p>
            <PageManager
              pages={pages}
              currentPageId={currentPageId}
              onPageChange={onPageChange}
              onAddPage={onAddPage}
              onDeletePage={onDeletePage}
              onUpdatePage={onUpdatePage}
              onReorderPages={onReorderPages}
              isOwner={true}
              subscriptionTier={subscriptionTier}
            />
          </div>
        )}

        {/* ── SECTIONS TAB ── */}
        {activeTab === 'sections' && (
          <div className="flex flex-col h-full">
            {isSpecialPage ? (
              <div className="p-4">
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-4 text-center">
                  <p className="text-white/50 text-sm">
                    {isRoadmapMode && 'Roadmap settings are in the Style tab.'}
                    {isCommunityMode && 'Community settings are in the Style tab.'}
                    {isAboutMode && 'About page settings are in the Style tab.'}
                    {isTosMode && 'Terms of Service settings are in the Style tab.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('style')}
                    className="mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Go to Style →
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Section list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {sections.length === 0 && (
                    <div className="text-center py-8 text-white/30 text-sm">
                      No sections yet. Add one below.
                    </div>
                  )}
                  {[...sections].sort((a, b) => a.order - b.order).map((section) => {
                    const isExpanded = expandedSection === section.id;
                    const Icon = sectionIcons[section.type] || LayoutIcon;
                    return (
                      <div key={section.id} className={`rounded-xl overflow-hidden border transition-all ${isExpanded ? 'border-violet-500/40 bg-violet-950/10' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                        <div
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.04] transition-colors"
                          onClick={() => toggleSection(section.id)}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-white/20 shrink-0" />
                          <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-white/60" />
                          </div>
                          <span className="flex-1 text-sm font-medium text-white/80 truncate">
                            {sectionNames[section.type] || section.type}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                        {renderSectionEditor(section)}
                      </div>
                    );
                  })}
                </div>

                {/* Add section button */}
                <div className="p-3 border-t border-white/[0.07]">
                  <button
                    onClick={() => setShowAddSectionMenu(!showAddSectionMenu)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-violet-500/50 hover:bg-violet-950/10 text-white/50 hover:text-white text-sm font-medium transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Section
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STYLE TAB ── */}
        {activeTab === 'style' && (
          <div className="p-4 space-y-3">
            {/* Special page settings */}
            {isRoadmapMode && roadmapSettings && (
              <div className="space-y-2">
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">Roadmap Theme</p>
                {Object.entries(ROADMAP_THEMES).map(([id, theme]) => {
                  const isActive = roadmapSettings.theme === id;
                  const bgPreview = theme.bgGradient || theme.bg;
                  const fontLabel = theme.font.includes('Mono') || theme.font.includes('mono') || theme.font.includes('Courier')
                    ? 'Mono' : theme.font.includes('serif') || theme.font.includes('Playfair') || theme.font.includes('Georgia')
                    ? 'Serif' : 'Sans';
                  return (
                    <button
                      key={id}
                      onClick={() => onRoadmapSettingsChange(applyThemeToSettings(id, roadmapSettings))}
                      className={`w-full rounded-xl border transition-all overflow-hidden ${isActive ? 'border-violet-500/70 ring-1 ring-violet-500/30' : 'border-white/[0.07] hover:border-white/20'}`}
                    >
                      {/* Mini preview strip */}
                      <div className="h-10 w-full relative flex items-center px-3 gap-2" style={{ background: bgPreview }}>
                        <div className="h-5 rounded flex-1 opacity-70" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }} />
                        <div className="h-5 rounded flex-1 opacity-70" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }} />
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: theme.accent, boxShadow: `0 0 6px ${theme.accent}` }} />
                      </div>
                      {/* Info row */}
                      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03]">
                        <p className="text-sm font-medium text-white">{theme.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">{fontLabel}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 capitalize">{theme.layout}</span>
                          {isActive && <div className="w-2 h-2 rounded-full bg-violet-400" />}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Roadmap custom settings */}
                <div className="mt-4 pt-4 border-t border-white/[0.07] space-y-4">
                  <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Content</p>

                  {/* Title / Subtitle */}
                  <div>
                    <Label className="text-xs text-white/50 mb-1 block">Title</Label>
                    <Input value={roadmapSettings.title || 'Development Roadmap'}
                      onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, title: e.target.value })}
                      className="bg-white/[0.05] border-white/10 text-white text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-white/50 mb-1 block">Subtitle</Label>
                    <Input value={roadmapSettings.subtitle || ''}
                      onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, subtitle: e.target.value })}
                      className="bg-white/[0.05] border-white/10 text-white text-sm" />
                  </div>

                  {/* Layout variant picker */}
                  <div>
                    <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2 mt-2">Layout</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { key: 'tactical', label: 'Tactical', desc: 'Circle icons + outlined badges' },
                        { key: 'cyber',    label: 'Cyber',    desc: 'Neon glow + HUD headers' },
                        { key: 'ghost',    label: 'Ghost',    desc: 'Pure text, no cards' },
                        { key: 'matrix',   label: 'Matrix',   desc: 'Terminal log output' },
                        { key: 'slate',    label: 'Slate',    desc: 'Sidebar nav + panel' },
                      ] as const).map(({ key, label, desc }) => {
                        const isActive = (roadmapSettings.layoutVariant || 'tactical') === key;
                        return (
                          <button key={key}
                            onClick={() => onRoadmapSettingsChange({ ...roadmapSettings, layoutVariant: key })}
                            className={`px-2 py-2 rounded-lg text-left transition-all ${isActive ? 'bg-violet-500/30 border border-violet-500/50' : 'bg-white/[0.04] border border-white/[0.06] hover:border-white/20'}`}>
                            <p className={`text-xs font-semibold ${isActive ? 'text-violet-300' : 'text-white/70'}`}>{label}</p>
                            <p className="text-[10px] text-white/30 mt-0.5">{desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Font family */}
                  <div>
                    <Label className="text-xs text-white/50 mb-1 block">Font Family</Label>
                    <select value={roadmapSettings.fontFamily || ''}
                      onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, fontFamily: e.target.value })}
                      className="w-full bg-white/[0.05] border border-white/10 text-white text-sm rounded-lg px-3 py-2">
                      <option value="">Theme Default</option>
                      <option value="Inter, sans-serif">Inter (Sans)</option>
                      <option value='"Plus Jakarta Sans", sans-serif'>Plus Jakarta Sans</option>
                      <option value='"Outfit", sans-serif'>Outfit</option>
                      <option value='"Sora", sans-serif'>Sora</option>
                      <option value='"DM Sans", sans-serif'>DM Sans</option>
                      <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
                      <option value='"IBM Plex Mono", monospace'>IBM Plex Mono</option>
                      <option value='"Playfair Display", serif'>Playfair Display</option>
                      <option value='"Merriweather", serif'>Merriweather</option>
                    </select>
                  </div>

                  {/* Card style + border radius */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-white/50 mb-1 block">Card Style</Label>
                      <select value={roadmapSettings.cardStyle || 'full'}
                        onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, cardStyle: e.target.value })}
                        className="w-full bg-white/[0.05] border border-white/10 text-white text-sm rounded-lg px-2 py-2">
                        <option value="full">Full</option>
                        <option value="left-accent">Accent</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-white/50 mb-1 block">Radius: {roadmapSettings.cardBorderRadius ?? 12}px</Label>
                      <input type="range" min={0} max={32} step={2}
                        value={roadmapSettings.cardBorderRadius ?? 12}
                        onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, cardBorderRadius: Number(e.target.value) })}
                        className="w-full accent-violet-500" />
                    </div>
                  </div>

                  {/* Section spacing */}
                  <div>
                    <Label className="text-xs text-white/50 mb-1 block">Section Spacing</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['compact', 'normal', 'relaxed'] as const).map(s => (
                        <button key={s} onClick={() => onRoadmapSettingsChange({ ...roadmapSettings, sectionSpacing: s })}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${(roadmapSettings.sectionSpacing || 'normal') === s ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50' : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:border-white/20'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card opacity */}
                  <div>
                    <Label className="text-xs text-white/50 mb-1 block">Card Opacity: {roadmapSettings.cardOpacity ?? 80}%</Label>
                    <input type="range" min={20} max={100} step={5}
                      value={roadmapSettings.cardOpacity ?? 80}
                      onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, cardOpacity: Number(e.target.value) })}
                      className="w-full accent-violet-500" />
                  </div>

                  {/* Colors section */}
                  <div className="pt-2 border-t border-white/[0.07]">
                    <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">Colors</p>

                    {/* Accent */}
                    <div className="mb-3">
                      <Label className="text-xs text-white/50 mb-1 block">Accent Color</Label>
                      <div className="flex gap-2">
                        <input type="color" value={roadmapSettings.customAccentColor || '#22c55e'}
                          onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customAccentColor: e.target.value, useCustomColors: true })}
                          className="w-10 h-9 rounded border border-white/10 bg-transparent cursor-pointer" />
                        <Input value={roadmapSettings.customAccentColor || '#22c55e'}
                          onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customAccentColor: e.target.value, useCustomColors: true })}
                          className="flex-1 bg-white/[0.05] border-white/10 text-white text-sm" />
                      </div>
                    </div>

                    {/* Background */}
                    <div className="mb-3">
                      <Label className="text-xs text-white/50 mb-1 block">Background</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-white/30 mb-1">Start</p>
                          <div className="flex gap-1">
                            <input type="color" value={roadmapSettings.customBackgroundGradientStart || '#0d1117'}
                              onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customBackgroundGradientStart: e.target.value, useCustomColors: true, backgroundType: 'gradient' })}
                              className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                            <Input value={roadmapSettings.customBackgroundGradientStart || '#0d1117'}
                              onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customBackgroundGradientStart: e.target.value, useCustomColors: true, backgroundType: 'gradient' })}
                              className="flex-1 bg-white/[0.05] border-white/10 text-white text-xs" />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 mb-1">End</p>
                          <div className="flex gap-1">
                            <input type="color" value={roadmapSettings.customBackgroundGradientEnd || '#161b22'}
                              onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customBackgroundGradientEnd: e.target.value, useCustomColors: true, backgroundType: 'gradient' })}
                              className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                            <Input value={roadmapSettings.customBackgroundGradientEnd || '#161b22'}
                              onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customBackgroundGradientEnd: e.target.value, useCustomColors: true, backgroundType: 'gradient' })}
                              className="flex-1 bg-white/[0.05] border-white/10 text-white text-xs" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Text + Surface colors */}
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-white/50 mb-1 block">Text Color</Label>
                        <div className="flex gap-1">
                          <input type="color" value={roadmapSettings.customText || '#f0f0f0'}
                            onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customText: e.target.value, useCustomColors: true })}
                            className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                          <Input value={roadmapSettings.customText || '#f0f0f0'}
                            onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customText: e.target.value, useCustomColors: true })}
                            className="flex-1 bg-white/[0.05] border-white/10 text-white text-xs" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-white/50 mb-1 block">Muted Text</Label>
                        <div className="flex gap-1">
                          <input type="color" value={roadmapSettings.customTextMuted || '#555555'}
                            onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customTextMuted: e.target.value, useCustomColors: true })}
                            className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                          <Input value={roadmapSettings.customTextMuted || '#555555'}
                            onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customTextMuted: e.target.value, useCustomColors: true })}
                            className="flex-1 bg-white/[0.05] border-white/10 text-white text-xs" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-white/50 mb-1 block">Card Surface</Label>
                        <div className="flex gap-1">
                          <input type="color" value={roadmapSettings.customSurface || '#111111'}
                            onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customSurface: e.target.value, useCustomColors: true })}
                            className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                          <Input value={roadmapSettings.customSurface || '#111111'}
                            onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customSurface: e.target.value, useCustomColors: true })}
                            className="flex-1 bg-white/[0.05] border-white/10 text-white text-xs" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-white/50 mb-1 block">Border Color</Label>
                        <div className="flex gap-1">
                          <input type="color" value={roadmapSettings.customCardBorder || '#222222'}
                            onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customCardBorder: e.target.value, useCustomColors: true })}
                            className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                          <Input value={roadmapSettings.customCardBorder || '#222222'}
                            onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, customCardBorder: e.target.value, useCustomColors: true })}
                            className="flex-1 bg-white/[0.05] border-white/10 text-white text-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Status colors */}
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Status Colors</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { key: 'customStatusBacklog', label: 'Backlog', fallback: '#374151' },
                          { key: 'customStatusInProgress', label: 'In Progress', fallback: '#22c55e' },
                          { key: 'customStatusQa', label: 'QA', fallback: '#f59e0b' },
                          { key: 'customStatusCompleted', label: 'Done', fallback: '#22c55e' },
                        ] as const).map(({ key, label, fallback }) => (
                          <div key={key}>
                            <p className="text-[10px] text-white/30 mb-1">{label}</p>
                            <div className="flex gap-1">
                              <input type="color" value={(roadmapSettings as any)[key] || fallback}
                                onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, [key]: e.target.value, useCustomColors: true })}
                                className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                              <Input value={(roadmapSettings as any)[key] || fallback}
                                onChange={e => onRoadmapSettingsChange({ ...roadmapSettings, [key]: e.target.value, useCustomColors: true })}
                                className="flex-1 bg-white/[0.05] border-white/10 text-white text-xs" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="pt-2 border-t border-white/[0.07] space-y-2">
                    <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Display</p>
                    {([
                      { key: 'showSuggestions', label: 'Show Suggestions', default: true },
                      { key: 'cardGlow', label: 'Card Glow Effect', default: false },
                      { key: 'defaultExpanded', label: 'Expand Versions by Default', default: true },
                    ] as const).map(({ key, label, default: def }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-xs text-white/50">{label}</Label>
                        <Switch
                          checked={(roadmapSettings as any)[key] !== undefined ? (roadmapSettings as any)[key] : def}
                          onCheckedChange={v => onRoadmapSettingsChange({ ...roadmapSettings, [key]: v })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!isSpecialPage && (
              <>
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Global Style</p>
                <button
                  onClick={onOpenStyleEditor}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.07] hover:border-violet-500/40 hover:bg-violet-950/10 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
                    <Palette className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Open Style Editor</p>
                    <p className="text-xs text-white/40">Colors, fonts, backgrounds</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 ml-auto" />
                </button>
              </>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Site Header</p>
            {headerConfig && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-white/50 mb-1 block">Site Name</Label>
                  <Input
                    value={headerConfig.siteName || ''}
                    onChange={e => onHeaderConfigChange({ ...headerConfig, siteName: e.target.value })}
                    placeholder="Your store name"
                    className="bg-white/[0.05] border-white/10 text-white text-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-white/50">Show Header</Label>
                  <Switch
                    checked={headerConfig.enabled !== false}
                    onCheckedChange={v => onHeaderConfigChange({ ...headerConfig, enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-white/50">Sticky Header</Label>
                  <Switch
                    checked={headerConfig.isSticky === true}
                    onCheckedChange={v => onHeaderConfigChange({ ...headerConfig, isSticky: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-white/50">Transparent</Label>
                  <Switch
                    checked={headerConfig.isTransparent === true}
                    onCheckedChange={v => onHeaderConfigChange({ ...headerConfig, isTransparent: v })}
                  />
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add Section Modal */}
      {showAddSectionMenu && (
        <div className="absolute inset-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
            <span className="text-sm font-bold text-white">Add Section</span>
            <button onClick={() => setShowAddSectionMenu(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {SECTION_TYPES.map(({ type, label, icon, desc }) => (
              <button
                key={type}
                onClick={() => {
                  onAddSection(type);
                  setShowAddSectionMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-violet-950/30 hover:border-violet-500/30 border border-transparent transition-all text-left"
              >
                <span className="text-xl w-8 text-center">{icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-white/40">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Picker Modal */}
      <ProductPickerModal
        isOpen={showProductPicker}
        onClose={() => { setShowProductPicker(false); setCurrentSection(null); }}
        selectedProductIds={currentSection?.settings?.selectedProducts || []}
        onSelectProducts={(productIds) => {
          if (currentSection) {
            onUpdateSection({ ...currentSection, settings: { ...currentSection.settings, selectedProducts: productIds } });
          }
        }}
      />
    </div>
  );
};