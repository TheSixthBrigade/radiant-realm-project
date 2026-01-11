import { TosPageSettings, DEFAULT_TOS_SETTINGS } from '@/lib/pageSettings';
import { FileText, Calendar } from 'lucide-react';

interface TosPageProps {
  settings?: TosPageSettings;
  storeName?: string;
}

export const TosPage = ({ settings = DEFAULT_TOS_SETTINGS, storeName }: TosPageProps) => {
  const {
    title,
    subtitle,
    showHeader,
    lastUpdated,
    sections,
    accentColor,
    textPrimaryColor,
    textSecondaryColor,
    cardBackgroundColor,
    cardBorderRadius,
    backgroundType,
    backgroundColor,
    backgroundGradientStart,
    backgroundGradientEnd,
    backgroundImage,
    backgroundOverlayOpacity,
  } = settings;

  // Background styling
  const getBackgroundStyle = () => {
    if (backgroundType === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${backgroundGradientStart || '#0f172a'} 0%, ${backgroundGradientEnd || '#1e1b4b'} 100%)`
      };
    } else if (backgroundType === 'image' && backgroundImage) {
      return {
        backgroundImage: `linear-gradient(rgba(0,0,0,${(backgroundOverlayOpacity ?? 50) / 100}), rgba(0,0,0,${(backgroundOverlayOpacity ?? 50) / 100})), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      };
    }
    return { backgroundColor: backgroundColor || '#0f172a' };
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen" style={getBackgroundStyle()}>
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        {showHeader && (
          <div className="text-center mb-12">
            <div 
              className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <FileText className="w-8 h-8" style={{ color: accentColor }} />
            </div>
            <h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: textPrimaryColor }}
            >
              {title || 'Terms of Service'}
            </h1>
            <p 
              className="text-lg max-w-2xl mx-auto mb-4"
              style={{ color: textSecondaryColor }}
            >
              {subtitle}
            </p>
            {lastUpdated && (
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: textSecondaryColor
                }}
              >
                <Calendar className="w-4 h-4" />
                Last updated: {formatDate(lastUpdated)}
              </div>
            )}
          </div>
        )}

        {/* Table of Contents */}
        {sections && sections.length > 0 && (
          <div 
            className="p-6 mb-8 backdrop-blur-sm"
            style={{
              backgroundColor: cardBackgroundColor,
              borderRadius: `${cardBorderRadius}px`,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: textPrimaryColor }}>
              Table of Contents
            </h2>
            <nav className="space-y-2">
              {sections.map((section, index) => (
                <a
                  key={section.id || index}
                  href={`#${section.id || `section-${index}`}`}
                  className="block py-2 px-3 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: textSecondaryColor }}
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        )}

        {/* Content Sections */}
        <div className="space-y-6">
          {sections && sections.map((section, index) => (
            <div 
              key={section.id || index}
              id={section.id || `section-${index}`}
              className="p-8 backdrop-blur-sm scroll-mt-8"
              style={{
                backgroundColor: cardBackgroundColor,
                borderRadius: `${cardBorderRadius}px`,
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h2 
                className="text-xl font-bold mb-4"
                style={{ color: textPrimaryColor }}
              >
                {section.title}
              </h2>
              <div 
                className="leading-relaxed whitespace-pre-wrap"
                style={{ color: textSecondaryColor }}
              >
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div 
          className="mt-12 p-6 text-center rounded-xl"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <p style={{ color: textSecondaryColor }}>
            If you have any questions about these Terms of Service, please contact us.
          </p>
          {storeName && (
            <p className="mt-2 text-sm" style={{ color: textSecondaryColor }}>
              © {new Date().getFullYear()} {storeName}. All rights reserved.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
