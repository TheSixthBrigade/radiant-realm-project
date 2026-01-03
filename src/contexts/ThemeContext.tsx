import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeStyle = 'clean' | 'cyberpunk';

interface ThemeContextType {
  themeStyle: ThemeStyle;
  setThemeStyle: (style: ThemeStyle) => void;
  isCyberpunk: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>('clean');

  useEffect(() => {
    const savedTheme = localStorage.getItem('themeStyle') as ThemeStyle;
    if (savedTheme) {
      setThemeStyle(savedTheme);
    }
  }, []);

  const handleSetThemeStyle = (style: ThemeStyle) => {
    setThemeStyle(style);
    localStorage.setItem('themeStyle', style);
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        themeStyle, 
        setThemeStyle: handleSetThemeStyle, 
        isCyberpunk: themeStyle === 'cyberpunk' 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeStyle = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeStyle must be used within a ThemeProvider');
  }
  return context;
};