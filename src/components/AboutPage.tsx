import { AboutPageSettings, DEFAULT_ABOUT_SETTINGS } from '@/lib/pageSettings';
import { Users, Target, Heart } from 'lucide-react';

interface AboutPageProps {
  settings?: AboutPageSettings;
  storeName?: string;
}

export const AboutPage = ({ settings = DEFAULT_ABOUT_SETTINGS, storeName }: AboutPageProps) => {
  const {
    title,
    subtitle,
    showHeader,
    content,
    showTeam,
    teamTitle,
    teamMembers,
    showMission,
    missionTitle,
    missionContent,
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

  return (
    <div className="min-h-screen" style={getBackgroundStyle()}>
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        {showHeader && (
          <div className="text-center mb-16">
            <h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: textPrimaryColor }}
            >
              {title || 'About Us'}
            </h1>
            <p 
              className="text-lg max-w-2xl mx-auto"
              style={{ color: textSecondaryColor }}
            >
              {subtitle}
            </p>
          </div>
        )}

        {/* Main Content Card */}
        <div 
          className="p-8 mb-8 backdrop-blur-sm"
          style={{
            backgroundColor: cardBackgroundColor,
            borderRadius: `${cardBorderRadius}px`,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Heart className="w-6 h-6" style={{ color: accentColor }} />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: textPrimaryColor }}>
              {storeName ? `About ${storeName}` : 'Who We Are'}
            </h2>
          </div>
          <p 
            className="text-lg leading-relaxed whitespace-pre-wrap"
            style={{ color: textSecondaryColor }}
          >
            {content}
          </p>
        </div>

        {/* Mission Section */}
        {showMission && (
          <div 
            className="p-8 mb-8 backdrop-blur-sm"
            style={{
              backgroundColor: cardBackgroundColor,
              borderRadius: `${cardBorderRadius}px`,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <Target className="w-6 h-6" style={{ color: accentColor }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: textPrimaryColor }}>
                {missionTitle || 'Our Mission'}
              </h2>
            </div>
            <p 
              className="text-lg leading-relaxed whitespace-pre-wrap"
              style={{ color: textSecondaryColor }}
            >
              {missionContent}
            </p>
          </div>
        )}

        {/* Team Section */}
        {showTeam && teamMembers && teamMembers.length > 0 && (
          <div 
            className="p-8 backdrop-blur-sm"
            style={{
              backgroundColor: cardBackgroundColor,
              borderRadius: `${cardBorderRadius}px`,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <Users className="w-6 h-6" style={{ color: accentColor }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: textPrimaryColor }}>
                {teamTitle || 'Meet the Team'}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-xl text-center"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div 
                    className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold"
                    style={{ 
                      background: member.avatar 
                        ? 'transparent' 
                        : `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
                      color: textPrimaryColor
                    }}
                  >
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: textPrimaryColor }}>
                    {member.name}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: accentColor }}>
                    {member.role}
                  </p>
                  {member.bio && (
                    <p className="text-sm" style={{ color: textSecondaryColor }}>
                      {member.bio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
