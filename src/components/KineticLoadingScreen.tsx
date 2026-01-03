import { useEffect, useState } from 'react';

const BOOT_SEQUENCE = [
  { icon: '🔐', title: 'AUTHENTICATING SESSION', items: [
    { text: 'User credentials', status: 'VERIFIED' },
    { text: 'Session token', status: 'VALID' },
    { text: 'Security check', status: 'PASSED' }
  ]},
  { icon: '📦', title: 'FETCHING USER DATA', items: [
    { text: 'Profile information', status: 'LOADED' },
    { text: 'Preferences', status: 'SYNCED' },
    { text: 'Site configuration', status: 'READY' }
  ]},
  { icon: '🎨', title: 'INITIALIZING INTERFACE', items: [
    { text: 'Theme engine', status: 'ACTIVE' },
    { text: 'Component registry', status: 'ONLINE' },
    { text: 'Render pipeline', status: 'READY' }
  ]}
];

export default function KineticLoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [currentSection, setCurrentSection] = useState(0);
  const [currentItem, setCurrentItem] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    const itemInterval = setInterval(() => {
      setCurrentItem(prev => {
        const currentSectionData = BOOT_SEQUENCE[currentSection];
        if (prev < currentSectionData.items.length - 1) {
          return prev + 1;
        } else if (currentSection < BOOT_SEQUENCE.length - 1) {
          setCurrentSection(s => s + 1);
          return 0;
        }
        return prev;
      });
    }, 600);

    return () => {
      clearInterval(cursorInterval);
      clearInterval(progressInterval);
      clearInterval(itemInterval);
    };
  }, [currentSection]);

  useEffect(() => {
    if (progress >= 100 && currentSection >= BOOT_SEQUENCE.length - 1 && currentItem >= BOOT_SEQUENCE[currentSection].items.length - 1) {
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(onComplete, 600);
      }, 400);
    }
  }, [progress, currentSection, currentItem, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-600 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: '#000000',
      }}
    >
      {/* Subtle background glows matching Kinetic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ background: 'rgba(33, 150, 243, 0.08)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ background: 'rgba(33, 150, 243, 0.06)' }}
        />
      </div>

      {/* Tactical grid pattern */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(33, 150, 243, 0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-4xl w-full px-8 relative z-10">
        {/* Holo-border container matching Kinetic's exact style */}
        <div 
          className="rounded-xl p-8 relative overflow-hidden"
          style={{
            border: '1px solid rgba(33, 150, 243, 0.2)',
            background: 'rgba(33, 150, 243, 0.03)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1), inset 0 0 32px rgba(33, 150, 243, 0.05)'
          }}
        >
          {/* Top bar - Kinetic style */}
          <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid rgba(33, 150, 243, 0.2)' }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: '#ef4444',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                  }}
                />
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: '#eab308',
                    boxShadow: '0 0 8px rgba(234, 179, 8, 0.6)'
                  }}
                />
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: '#22c55e',
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
                  }}
                />
              </div>
              <div 
                className="font-mono text-xs tracking-wider px-3 py-1 rounded"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'rgba(33, 150, 243, 0.8)',
                  background: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid rgba(33, 150, 243, 0.2)',
                  letterSpacing: '0.05em'
                }}
              >
                SYSTEM BOOT
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="font-mono text-xs tracking-wider"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'rgba(33, 150, 243, 0.6)',
                  letterSpacing: '0.05em'
                }}
              >
                LOADING
              </div>
              <div 
                className="font-mono text-sm font-bold tracking-wider px-3 py-1 rounded"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'hsl(210, 100%, 50%)',
                  textShadow: '0 0 10px rgba(33, 150, 243, 0.5), 0 0 20px rgba(33, 150, 243, 0.3)',
                  background: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  letterSpacing: '0.05em'
                }}
              >
                {progress}%
              </div>
            </div>
          </div>

          {/* Boot sequence */}
          <div className="space-y-6 font-mono text-sm">
            {BOOT_SEQUENCE.map((section, sectionIdx) => (
              <div 
                key={sectionIdx}
                className={`transition-opacity duration-300 ${
                  sectionIdx <= currentSection ? 'opacity-100' : 'opacity-30'
                }`}
              >
                {/* Section title */}
                <div className="flex items-center gap-3 mb-3">
                  <span 
                    className="text-xl"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(33, 150, 243, 0.4))'
                    }}
                  >
                    {section.icon}
                  </span>
                  <h3 
                    className="font-mono font-bold text-sm uppercase tracking-wider"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'hsl(210, 100%, 50%)',
                      textShadow: '0 0 10px rgba(33, 150, 243, 0.5), 0 0 20px rgba(33, 150, 243, 0.3)',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {section.title}
                  </h3>
                </div>

                {/* Section items */}
                <div className="pl-10 space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <div 
                      key={itemIdx}
                      className={`flex items-center justify-between transition-all duration-300 ${
                        sectionIdx < currentSection || (sectionIdx === currentSection && itemIdx <= currentItem)
                          ? 'opacity-100 translate-x-0' 
                          : 'opacity-0 -translate-x-4'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-mono"
                          style={{
                            color: 'hsl(180, 100%, 50%)',
                            textShadow: '0 0 8px rgba(33, 150, 243, 0.5)'
                          }}
                        >
                          {'>'}
                        </span>
                        <span 
                          className="font-mono text-sm"
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            color: 'rgba(33, 150, 243, 0.7)'
                          }}
                        >
                          {item.text}:
                        </span>
                      </div>
                      <span 
                        className="font-mono text-xs uppercase tracking-wider font-bold"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: item.status === 'ONLINE' || item.status === 'ACTIVE' || item.status === 'ENABLED'
                            ? 'hsl(180, 100%, 50%)'
                            : item.status === 'ESTABLISHED' || item.status === 'VERIFIED'
                            ? 'hsl(180, 100%, 50%)'
                            : 'hsl(210, 100%, 50%)',
                          textShadow: '0 0 10px rgba(33, 150, 243, 0.5)'
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Cursor */}
            {!isExiting && (
              <div className="flex items-center gap-2 mt-4">
                <span 
                  className="font-mono"
                  style={{
                    color: 'hsl(180, 100%, 50%)',
                    textShadow: '0 0 8px rgba(33, 150, 243, 0.5)'
                  }}
                >
                  {'>'}
                </span>
                <span 
                  className={`inline-block w-2 h-4 transition-opacity ${showCursor ? 'opacity-100' : 'opacity-0'}`}
                  style={{
                    background: 'hsl(180, 100%, 50%)',
                    boxShadow: '0 0 10px rgba(33, 150, 243, 0.8)'
                  }}
                />
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(33, 150, 243, 0.2)' }}>
            <div 
              className="w-full h-0.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(33, 150, 243, 0.1)' }}
            >
              <div 
                className="h-full transition-all duration-300 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, hsl(210, 100%, 50%), hsl(180, 100%, 50%))'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
