import { Layout, Image, Grid, List } from "lucide-react";

interface AddSectionMenuProps {
  onSelect: (type: string) => void;
  onClose: () => void;
}

export const AddSectionMenu = ({ onSelect, onClose }: AddSectionMenuProps) => {
  const sections = [
    // Saved Sections
    { type: 'image_with_text', name: 'Image With Text', icon: Image, description: 'Image with text overlay' },
    { type: 'gallery', name: 'Gallery', icon: Grid, description: 'Image gallery grid' },
    { type: 'slideshow', name: 'Slideshow', icon: Image, description: 'Multiple images carousel' },
    { type: 'image', name: 'Image', icon: Image, description: 'Single image banner' },
    { type: 'text', name: 'Text', icon: Layout, description: 'Rich text content' },
    { type: 'basic_list', name: 'Basic List', icon: List, description: 'Simple list of items' },
    { type: 'slider_list', name: 'Slider List', icon: List, description: 'Horizontal scrolling list' },
    { type: 'video', name: 'Video', icon: Image, description: 'Embedded video' },
    { type: 'featured_product', name: 'Featured Product', icon: Grid, description: 'Single product highlight' },
    { type: 'featured_collection', name: 'Featured Collection', icon: Grid, description: 'Product collection' },
    { type: 'featured_collection_list', name: 'Featured Collection List', icon: List, description: 'Multiple collections' },
    { type: 'featured_blog_posts', name: 'Featured Blog Posts', icon: Layout, description: 'Blog post highlights' },
    { type: 'testimonials', name: 'Testimonials', icon: Layout, description: 'Customer reviews' },
    { type: 'logo_list', name: 'Logo List', icon: Grid, description: 'Brand logos grid' },
    { type: 'contact_us', name: 'Contact Us', icon: Layout, description: 'Contact form' },
    { type: 'newsletter', name: 'Newsletter', icon: Layout, description: 'Email signup form' },
    { type: 'header', name: 'Header', icon: Layout, description: 'Store name and navigation' },
    { type: 'product_grid', name: 'Product Grid', icon: Grid, description: 'Display all products' },
    { type: 'footer', name: 'Footer', icon: Layout, description: 'Footer with text and links' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex" onClick={(e) => e.stopPropagation()}>
        {/* Left sidebar with section list */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <h2 className="text-lg font-bold mb-4">Add New Section</h2>
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Saved Sections</h3>
            {sections.map((section) => (
              <button
                key={section.type}
                onClick={() => {
                  onSelect(section.type);
                  onClose();
                }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-sm text-blue-600 dark:text-blue-400"
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right preview area */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click a section type on the left to add it to your page.
          </p>
        </div>
      </div>
    </div>
  );
};
