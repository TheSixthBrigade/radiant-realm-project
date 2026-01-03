import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Trash2, Palette } from "lucide-react";
import { ImageUploadZone } from "./ImageUploadZone";
import ProductStyleEditor, { ProductCardStyle } from "./ProductStyleEditor";

interface SectionEditorProps {
  section: any;
  onBack: () => void;
  onUpdate: (section: any) => void;
  onDelete: (id: string) => void;
}

export const SectionEditor = ({ section, onBack, onUpdate, onDelete }: SectionEditorProps) => {
  const [showProductStyleEditor, setShowProductStyleEditor] = useState(false);

  const updateField = (field: string, value: any) => {
    onUpdate({ ...section, [field]: value });
  };

  const handleProductStyleChange = (style: ProductCardStyle) => {
    updateField('product_style', style);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 hover:text-gray-300">
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <button 
          onClick={() => onDelete(section.id)}
          className="p-2 hover:bg-red-900/20 rounded text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {section.type === 'header' && (
          <>
            <div>
              <Label className="text-white">Store Name</Label>
              <Input
                value={section.store_name || ''}
                onChange={(e) => updateField('store_name', e.target.value)}
                placeholder="My Store"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <ImageUploadZone
              label="Logo"
              value={section.logo_url || ''}
              onChange={(url) => updateField('logo_url', url)}
            />
            <div className="flex items-center justify-between">
              <Label className="text-white">Show Navigation</Label>
              <Switch
                checked={section.show_nav !== false}
                onCheckedChange={(checked) => updateField('show_nav', checked)}
              />
            </div>
          </>
        )}

        {section.type === 'slideshow' && (
          <>
            <div>
              <Label className="text-white">Heading</Label>
              <Input
                value={section.heading || ''}
                onChange={(e) => updateField('heading', e.target.value)}
                placeholder="Welcome to my store"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Subheading</Label>
              <Textarea
                value={section.subheading || ''}
                onChange={(e) => updateField('subheading', e.target.value)}
                placeholder="Check out our amazing products"
                rows={3}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <ImageUploadZone
              label="Slideshow Images (Multiple)"
              value=""
              onChange={() => {}}
              multiple
              values={section.images || []}
              onMultipleChange={(urls) => updateField('images', urls)}
            />
            <div>
              <Label className="text-white">Button Text</Label>
              <Input
                value={section.button_text || ''}
                onChange={(e) => updateField('button_text', e.target.value)}
                placeholder="Shop Now"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white">Show Button</Label>
              <Switch
                checked={section.show_button !== false}
                onCheckedChange={(checked) => updateField('show_button', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white">Auto-play Slideshow</Label>
              <Switch
                checked={section.autoplay === true}
                onCheckedChange={(checked) => updateField('autoplay', checked)}
              />
            </div>
            {section.autoplay && (
              <div>
                <Label className="text-white">Slide Duration (seconds)</Label>
                <Input
                  type="number"
                  min="2"
                  max="10"
                  value={section.slide_duration || 5}
                  onChange={(e) => updateField('slide_duration', parseInt(e.target.value))}
                  className="mt-1 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            )}
          </>
        )}

        {section.type === 'featured_products' && (
          <>
            <div>
              <Label className="text-white">Section Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Featured Products"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Number of Products</Label>
              <Input
                type="number"
                value={section.count || 4}
                onChange={(e) => updateField('count', parseInt(e.target.value))}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white">Show Prices</Label>
              <Switch
                checked={section.show_prices !== false}
                onCheckedChange={(checked) => updateField('show_prices', checked)}
              />
            </div>
            <Button
              onClick={() => setShowProductStyleEditor(true)}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Palette className="w-4 h-4 mr-2" />
              Customize Product Display
            </Button>
          </>
        )}

        {section.type === 'product_grid' && (
          <>
            <div>
              <Label className="text-white">Section Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="All Products"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Columns</Label>
              <Input
                type="number"
                min="2"
                max="4"
                value={section.columns || 4}
                onChange={(e) => updateField('columns', parseInt(e.target.value))}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white">Show All Products</Label>
              <Switch
                checked={section.show_all !== false}
                onCheckedChange={(checked) => updateField('show_all', checked)}
              />
            </div>
            <Button
              onClick={() => setShowProductStyleEditor(true)}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Palette className="w-4 h-4 mr-2" />
              Customize Product Display
            </Button>
          </>
        )}

        {section.type === 'footer' && (
          <>
            <div>
              <Label className="text-white">Footer Text</Label>
              <Textarea
                value={section.text || ''}
                onChange={(e) => updateField('text', e.target.value)}
                placeholder="© 2024 My Store. All rights reserved."
                rows={3}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white">Show Social Links</Label>
              <Switch
                checked={section.show_social !== false}
                onCheckedChange={(checked) => updateField('show_social', checked)}
              />
            </div>
          </>
        )}

        {section.type === 'image_with_text' && (
          <>
            <div>
              <Label className="text-white">Heading</Label>
              <Input
                value={section.heading || ''}
                onChange={(e) => updateField('heading', e.target.value)}
                placeholder="Section Heading"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Text Content</Label>
              <Textarea
                value={section.text || ''}
                onChange={(e) => updateField('text', e.target.value)}
                placeholder="Your text content here..."
                rows={4}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <ImageUploadZone
              label="Image"
              value={section.image_url || ''}
              onChange={(url) => updateField('image_url', url)}
            />
            <div>
              <Label className="text-white">Image Position</Label>
              <select
                value={section.image_position || 'left'}
                onChange={(e) => updateField('image_position', e.target.value)}
                className="mt-1 w-full bg-gray-800 border-gray-700 text-white rounded px-3 py-2"
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </>
        )}

        {section.type === 'gallery' && (
          <>
            <div>
              <Label className="text-white">Gallery Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Gallery"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <ImageUploadZone
              label="Gallery Images"
              value=""
              onChange={() => {}}
              multiple
              values={section.images || []}
              onMultipleChange={(urls) => updateField('images', urls)}
            />
            <div>
              <Label className="text-white">Columns</Label>
              <Input
                type="number"
                min="2"
                max="4"
                value={section.columns || 3}
                onChange={(e) => updateField('columns', parseInt(e.target.value))}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </>
        )}

        {section.type === 'image' && (
          <>
            <ImageUploadZone
              label="Banner Image"
              value={section.image_url || ''}
              onChange={(url) => updateField('image_url', url)}
            />
            <div>
              <Label className="text-white">Alt Text</Label>
              <Input
                value={section.alt_text || ''}
                onChange={(e) => updateField('alt_text', e.target.value)}
                placeholder="Image description"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Link URL (optional)</Label>
              <Input
                value={section.link_url || ''}
                onChange={(e) => updateField('link_url', e.target.value)}
                placeholder="https://..."
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </>
        )}

        {section.type === 'text' && (
          <>
            <div>
              <Label className="text-white">Heading</Label>
              <Input
                value={section.heading || ''}
                onChange={(e) => updateField('heading', e.target.value)}
                placeholder="Section Heading"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Content</Label>
              <Textarea
                value={section.content || ''}
                onChange={(e) => updateField('content', e.target.value)}
                placeholder="Your content here..."
                rows={6}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Text Alignment</Label>
              <select
                value={section.alignment || 'left'}
                onChange={(e) => updateField('alignment', e.target.value)}
                className="mt-1 w-full bg-gray-800 border-gray-700 text-white rounded px-3 py-2"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </>
        )}

        {section.type === 'video' && (
          <>
            <div>
              <Label className="text-white">Video URL</Label>
              <Input
                value={section.video_url || ''}
                onChange={(e) => updateField('video_url', e.target.value)}
                placeholder="YouTube or Vimeo URL"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Video Title"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white">Autoplay</Label>
              <Switch
                checked={section.autoplay === true}
                onCheckedChange={(checked) => updateField('autoplay', checked)}
              />
            </div>
          </>
        )}

        {section.type === 'testimonials' && (
          <>
            <div>
              <Label className="text-white">Section Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="What Our Customers Say"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Testimonials (JSON format)</Label>
              <Textarea
                value={section.testimonials || '[]'}
                onChange={(e) => updateField('testimonials', e.target.value)}
                placeholder='[{"name": "John Doe", "text": "Great product!", "rating": 5}]'
                rows={6}
                className="mt-1 bg-gray-800 border-gray-700 text-white font-mono text-xs"
              />
            </div>
          </>
        )}

        {section.type === 'contact_us' && (
          <>
            <div>
              <Label className="text-white">Heading</Label>
              <Input
                value={section.heading || ''}
                onChange={(e) => updateField('heading', e.target.value)}
                placeholder="Get In Touch"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Email Address</Label>
              <Input
                type="email"
                value={section.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="contact@example.com"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white">Show Phone Field</Label>
              <Switch
                checked={section.show_phone !== false}
                onCheckedChange={(checked) => updateField('show_phone', checked)}
              />
            </div>
          </>
        )}

        {section.type === 'newsletter' && (
          <>
            <div>
              <Label className="text-white">Heading</Label>
              <Input
                value={section.heading || ''}
                onChange={(e) => updateField('heading', e.target.value)}
                placeholder="Subscribe to Our Newsletter"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Description</Label>
              <Textarea
                value={section.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Get updates on new products and special offers"
                rows={3}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Button Text</Label>
              <Input
                value={section.button_text || ''}
                onChange={(e) => updateField('button_text', e.target.value)}
                placeholder="Subscribe"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </>
        )}

        {section.type === 'featured_product' && (
          <>
            <div className="text-center py-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <p className="text-yellow-400 text-sm">This section automatically displays your first featured product.</p>
              <p className="text-gray-400 text-xs mt-1">Mark products as featured in your product settings.</p>
            </div>
          </>
        )}

        {section.type === 'featured_collection' && (
          <>
            <div>
              <Label className="text-white">Collection Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Featured Collection"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="text-center py-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <p className="text-blue-400 text-sm">Shows up to 3 featured products.</p>
            </div>
          </>
        )}

        {section.type === 'featured_collection_list' && (
          <>
            <div className="text-center py-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <p className="text-purple-400 text-sm">Displays multiple product collections with "View All" links.</p>
              <p className="text-gray-400 text-xs mt-1">Collections are automatically generated from your products.</p>
            </div>
          </>
        )}

        {section.type === 'basic_list' && (
          <>
            <div>
              <Label className="text-white">List Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="List Title"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">List Items (JSON Array)</Label>
              <Textarea
                value={JSON.stringify(section.items || ['Item 1', 'Item 2', 'Item 3'])}
                onChange={(e) => {
                  try {
                    updateField('items', JSON.parse(e.target.value));
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='["Item 1", "Item 2", "Item 3"]'
                rows={4}
                className="mt-1 bg-gray-800 border-gray-700 text-white font-mono text-xs"
              />
            </div>
          </>
        )}

        {section.type === 'slider_list' && (
          <>
            <div>
              <Label className="text-white">Slider Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Trending Products"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="text-center py-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <p className="text-cyan-400 text-sm">Horizontal scrolling product slider.</p>
              <p className="text-gray-400 text-xs mt-1">Shows up to 8 products.</p>
            </div>
          </>
        )}

        {section.type === 'logo_list' && (
          <>
            <div>
              <Label className="text-white">Section Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Trusted By"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Logo URLs (JSON Array)</Label>
              <Textarea
                value={JSON.stringify(section.logos || [])}
                onChange={(e) => {
                  try {
                    updateField('logos', JSON.parse(e.target.value));
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='["https://example.com/logo1.png", "https://example.com/logo2.png"]'
                rows={4}
                className="mt-1 bg-gray-800 border-gray-700 text-white font-mono text-xs"
              />
            </div>
          </>
        )}

        {section.type === 'featured_blog_posts' && (
          <>
            <div>
              <Label className="text-white">Section Title</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Latest Posts"
                className="mt-1 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="text-center py-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <p className="text-green-400 text-sm">Displays 3 sample blog posts.</p>
              <p className="text-gray-400 text-xs mt-1">Connect your blog for real content.</p>
            </div>
          </>
        )}
      </div>

      {/* Product Style Editor Modal */}
      {showProductStyleEditor && (
        <ProductStyleEditor
          style={section.product_style || {}}
          onChange={handleProductStyleChange}
          onClose={() => setShowProductStyleEditor(false)}
        />
      )}
    </div>
  );
};
