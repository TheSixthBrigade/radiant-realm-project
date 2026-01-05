import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Plus, ChevronRight, Settings, Home, Image, Grid, Layout as LayoutIcon, Type, Palette, ChevronDown, ChevronUp, Trash2, GripVertical } from "lucide-react";
import { ProductPickerModal } from "./ProductPickerModal";
import { CollectionManager } from "./CollectionManager";
import { ImageUploadZone } from "./ImageUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState as useStateHook } from "react";

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
  onSettingsChange = () => {}
}: PageBuilderSidebarProps) => {
  const [editingSection, setEditingSection] = useState<any>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedSubsection, setExpandedSubsection] = useState<string | null>(null);
  const [expandedSubsections, setExpandedSubsections] = useState<Record<string, boolean>>({});
  const [showAddSectionMenu, setShowAddSectionMenu] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [currentSection, setCurrentSection] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

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
              <Label className="text-xs text-gray-300">Background Image URL</Label>
              <Input
                value={section.settings?.backgroundImage || ''}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, backgroundImage: e.target.value }})}
                placeholder="https://example.com/hero-bg.jpg"
                className="bg-gray-900 border-gray-700 text-white"
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
              <Label className="text-xs text-gray-300">Image URL</Label>
              <Input
                value={section.settings?.image || ''}
                onChange={(e) => onUpdateSection({ ...section, settings: { ...section.settings, image: e.target.value }})}
                placeholder="https://example.com/about.jpg"
                className="bg-gray-900 border-gray-700 text-white"
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
                        <SelectItem value="5">5 ⭐</SelectItem>
                        <SelectItem value="4">4 ⭐</SelectItem>
                        <SelectItem value="3">3 ⭐</SelectItem>
                        <SelectItem value="2">2 ⭐</SelectItem>
                        <SelectItem value="1">1 ⭐</SelectItem>
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

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 className="font-bold text-lg">Customize Page</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Page Info */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Home className="w-4 h-4" />
          <span>HOME PAGE</span>
        </div>
        <h3 className="text-lg font-semibold">Home page</h3>
      </div>

      {/* Sections List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sections.map((section, index) => {
          const Icon = sectionIcons[section.type] || LayoutIcon;
          const isExpanded = expandedSection === section.id;
          
          return (
            <div key={section.id} className="border border-gray-700 rounded-lg overflow-hidden">
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/html', section.id);
                  e.currentTarget.style.opacity = '0.5';
                }}
                onDragEnd={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = e.dataTransfer.getData('text/html');
                  const draggedIndex = sections.findIndex(s => s.id === draggedId);
                  if (draggedIndex !== index) {
                    const newSections = [...sections];
                    const [removed] = newSections.splice(draggedIndex, 1);
                    newSections.splice(index, 0, removed);
                    newSections.forEach((s, i) => s.order = i);
                    onReorderSections(newSections);
                  }
                }}
                className="cursor-move"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-2.5 bg-gray-800 hover:bg-gray-700 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-500" />
                    <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">{sectionNames[section.type] || section.type}</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              {renderSectionEditor(section)}
            </div>
          );
        })}

        {/* Add Section Button */}
        <button
          onClick={() => setShowAddSectionMenu(true)}
          className="w-full p-4 border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-lg flex items-center justify-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add section</span>
        </button>
      </div>

      {/* Add Section Modal */}
      {showAddSectionMenu && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add Section</h3>
              <button onClick={() => setShowAddSectionMenu(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto grid grid-cols-2 gap-2">
              {/* Header Section */}
              <button
                onClick={() => {
                  onAddSection('header');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <LayoutIcon className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Header</h4>
                <p className="text-xs text-gray-400">Logo, navigation, and search bar</p>
              </button>

              {/* Hero Section */}
              <button
                onClick={() => {
                  onAddSection('hero');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Image className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Hero Banner</h4>
                <p className="text-xs text-gray-400">Large banner with title and CTA</p>
              </button>

              {/* Slideshow Section */}
              <button
                onClick={() => {
                  onAddSection('slideshow');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Image className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Slideshow</h4>
                <p className="text-xs text-gray-400">Image carousel with autoplay</p>
              </button>

              {/* Product Grid Section */}
              <button
                onClick={() => {
                  onAddSection('product_grid');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Grid className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Product Grid</h4>
                <p className="text-xs text-gray-400">Display all your products</p>
              </button>

              {/* Featured Products Section */}
              <button
                onClick={() => {
                  onAddSection('featured_products');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Grid className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Featured Products</h4>
                <p className="text-xs text-gray-400">Showcase selected products</p>
              </button>

              {/* Collections Section */}
              <button
                onClick={() => {
                  onAddSection('collections');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Grid className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Collections</h4>
                <p className="text-xs text-gray-400">Browse product categories</p>
              </button>

              {/* About Section */}
              <button
                onClick={() => {
                  onAddSection('about');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Type className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">About Section</h4>
                <p className="text-xs text-gray-400">Tell your story</p>
              </button>

              {/* Newsletter Section */}
              <button
                onClick={() => {
                  onAddSection('newsletter');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Type className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Newsletter</h4>
                <p className="text-xs text-gray-400">Email signup form</p>
              </button>

              {/* Footer Section */}
              <button
                onClick={() => {
                  onAddSection('footer');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <LayoutIcon className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Footer</h4>
                <p className="text-xs text-gray-400">Links, social, and copyright</p>
              </button>

              {/* Testimonials Section */}
              <button
                onClick={() => {
                  onAddSection('testimonials');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Type className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Testimonials</h4>
                <p className="text-xs text-gray-400">Customer reviews and quotes</p>
              </button>

              {/* Text Section */}
              <button
                onClick={() => {
                  onAddSection('text');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Type className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Text Block</h4>
                <p className="text-xs text-gray-400">Custom text content</p>
              </button>

              {/* Video Section */}
              <button
                onClick={() => {
                  onAddSection('video');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Image className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Video</h4>
                <p className="text-xs text-gray-400">YouTube or Vimeo embed</p>
              </button>

              {/* Gallery Section */}
              <button
                onClick={() => {
                  onAddSection('gallery');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Grid className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Gallery</h4>
                <p className="text-xs text-gray-400">Image grid showcase</p>
              </button>

              {/* Contact Section */}
              <button
                onClick={() => {
                  onAddSection('contact_us');
                  setShowAddSectionMenu(false);
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500"
              >
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mb-2">
                  <Type className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 text-sm">Contact Form</h4>
                <p className="text-xs text-gray-400">Get in touch form</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Style Section - Fixed at bottom */}
      <div className="p-4 border-t border-gray-700 space-y-3 flex-shrink-0 bg-gray-900">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Settings className="w-4 h-4" />
            <span>EDITING SINGLE PAGE</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            You're currently editing a single custom page "Home page"
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Palette className="w-4 h-4" />
            <span>STORE STYLE</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            You can change your store colors, fonts etc
          </p>
          <Button
            onClick={onOpenStyleEditor}
            variant="outline"
            className="w-full bg-gray-800 hover:bg-gray-700 border-gray-700 text-white justify-between"
          >
            <span>Change store style</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Save Button */}
        <Button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Product Picker Modal */}
      <ProductPickerModal
        isOpen={showProductPicker}
        onClose={() => {
          setShowProductPicker(false);
          setCurrentSection(null);
        }}
        selectedProductIds={currentSection?.settings?.selectedProducts || []}
        onSelectProducts={(productIds) => {
          if (currentSection) {
            onUpdateSection({
              ...currentSection,
              settings: {
                ...currentSection.settings,
                selectedProducts: productIds,
              },
            });
          }
        }}
      />
    </div>
  );
};
