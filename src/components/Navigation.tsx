import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LogOut, Settings, Sun, Moon, Download } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useThemeStyle } from "@/contexts/ThemeContext";
import logo from "@/assets/vectabse-logo.png";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRoles();
  const { settings } = useWebsiteSettings();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { themeStyle, setThemeStyle, isCyberpunk } = useThemeStyle();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[hsl(230,25%,8%)]/95 backdrop-blur-xl border-b border-gray-200 dark:border-[rgba(34,197,94,0.2)] transition-all duration-500 shadow-sm dark:shadow-green-500/5">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo - 3D Hexagon */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative w-12 h-12">
              {/* Background glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>
              
              {/* Logo image */}
              <img 
                src="/Logo_pic.png" 
                alt="Vectabse Logo" 
                className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            
            {/* Keep the rest of the logo code below this */}
            <div style={{ display: 'none' }}>
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full group-hover:animate-spin-slow" style={{ animationDuration: '4s' }}>
                <defs>
                  <linearGradient id="navGearGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                {/* Gear teeth */}
                <path 
                  d="M50,10 L52,15 L48,15 Z M90,50 L85,52 L85,48 Z M50,90 L48,85 L52,85 Z M10,50 L15,48 L15,52 Z
                     M73,27 L71,31 L68,28 Z M73,73 L68,72 L71,69 Z M27,73 L28,68 L31,71 Z M27,27 L31,28 L28,31 Z"
                  fill="url(#navGearGradient)"
                  className="drop-shadow-lg"
                />
                {/* Gear body */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="30" 
                  fill="url(#navGearGradient)"
                  className="drop-shadow-lg"
                />
                {/* Inner circle */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="15" 
                  fill="#000000"
                  stroke="url(#navGearGradient)"
                  strokeWidth="2"
                />
                {/* L letter */}
                <text 
                  x="50" 
                  y="60" 
                  fontSize="24" 
                  fontWeight="bold" 
                  fill="url(#navGearGradient)" 
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                >
                  L
                </text>
              </svg>
              
              {/* Small gear top right - counter rotation */}
              <svg viewBox="0 0 100 100" className="absolute -top-1 -right-1 w-6 h-6 group-hover:animate-spin-reverse" style={{ animationDuration: '3s' }}>
                <defs>
                  <linearGradient id="navSmallGear1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                {/* Small gear teeth */}
                <path 
                  d="M50,15 L52,20 L48,20 Z M85,50 L80,52 L80,48 Z M50,85 L48,80 L52,80 Z M15,50 L20,48 L20,52 Z"
                  fill="url(#navSmallGear1)"
                />
                {/* Gear body */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="25" 
                  fill="url(#navSmallGear1)"
                />
                {/* Inner circle */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="12" 
                  fill="#000000"
                  stroke="url(#navSmallGear1)"
                  strokeWidth="2"
                />
              </svg>
              
              {/* Small gear bottom left - fast rotation */}
              <svg viewBox="0 0 100 100" className="absolute -bottom-1 -left-1 w-5 h-5 group-hover:animate-spin-fast" style={{ animationDuration: '2s' }}>
                <defs>
                  <linearGradient id="navSmallGear2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#22d3ee', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                {/* Small gear teeth */}
                <path 
                  d="M50,15 L52,20 L48,20 Z M85,50 L80,52 L80,48 Z M50,85 L48,80 L52,80 Z M15,50 L20,48 L20,52 Z"
                  fill="url(#navSmallGear2)"
                />
                {/* Gear body */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="25" 
                  fill="url(#navSmallGear2)"
                />
                {/* Inner circle */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="12" 
                  fill="#000000"
                  stroke="url(#navSmallGear2)"
                  strokeWidth="2"
                />
              </svg>
              
              {/* Orbiting particle */}
              <div className="absolute inset-0 group-hover:animate-spin-slow" style={{ animationDuration: '5s' }}>
                <div className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-green-400 -translate-x-1/2 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
              </div>
            </div>
            
            {/* Brand text with modern styling */}
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-2xl bg-gradient-to-r from-green-600 to-emerald-500 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent transition-all duration-500 tracking-tight">
                Vectabse
              </span>
              <span className="text-xs text-gray-500 dark:text-emerald-400/60 font-medium tracking-wider">.COM</span>
            </div>
          </Link>

          {/* Search Bar - Center with modern design */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full group">
              {/* Search icon */}
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-green-400/60 group-focus-within:text-green-500 dark:group-focus-within:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
              </svg>
              
              <input
                type="text"
                placeholder="Search products, creators, categories..."
                className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-[rgba(34,197,94,0.05)] rounded-xl text-sm text-gray-700 dark:text-[hsl(210,40%,98%)] placeholder-gray-400 dark:placeholder-[rgba(34,197,94,0.4)] focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400/50 dark:border dark:border-[rgba(34,197,94,0.15)] focus:border-transparent dark:focus:bg-[rgba(34,197,94,0.08)] transition-all duration-300 font-medium shadow-sm hover:shadow-md"
              />
              
              {/* Glow effect on focus */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-focus-within:opacity-10 blur-xl transition-opacity duration-300 -z-10"></div>
            </div>
          </div>

          {/* Right Section - Currency, Theme & Register */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Theme Toggle - Modern design */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[rgba(34,197,94,0.1)] dark:to-[rgba(34,197,94,0.15)] dark:border dark:border-[rgba(34,197,94,0.3)] hover:scale-110 hover:shadow-lg dark:hover:shadow-green-500/30 flex items-center justify-center transition-all duration-300 group overflow-hidden"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-gray-700 dark:text-green-400 group-hover:rotate-180 transition-transform duration-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700 group-hover:rotate-12 transition-transform duration-300" />
              )}
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>

            {/* Cyberpunk Theme Toggle */}
            <button
              onClick={() => setThemeStyle(isCyberpunk ? 'clean' : 'cyberpunk')}
              className={`relative w-10 h-10 rounded-xl ${
                isCyberpunk 
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/40' 
                  : 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-[rgba(34,197,94,0.1)] dark:to-[rgba(34,197,94,0.15)] dark:border dark:border-[rgba(34,197,94,0.3)]'
              } hover:scale-110 hover:shadow-lg dark:hover:shadow-green-500/30 flex items-center justify-center transition-all duration-300 group overflow-hidden`}
              title="Toggle Cyberpunk Theme"
            >
              <span className={`text-lg group-hover:scale-125 transition-transform duration-300 ${
                isCyberpunk ? 'text-white' : 'text-gray-700 dark:text-green-400'
              }`}>⚡</span>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
            </button>

            {/* USD Flag */}
            <button 
              onClick={() => setCurrency('USD')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all font-mono ${
                currency === 'USD' 
                  ? 'bg-green-500 dark:bg-[rgba(34,197,94,0.3)] dark:border-2 dark:border-[rgba(34,197,94,0.6)] shadow-lg scale-105' 
                  : 'bg-gray-300 dark:bg-[rgba(34,197,94,0.05)] hover:bg-gray-400 dark:hover:bg-[rgba(34,197,94,0.15)] hover:scale-105'
              }`}
            >
              <span className="text-lg">🇺🇸</span>
              <span className={`text-sm font-bold ${currency === 'USD' ? 'text-white' : 'text-gray-700 dark:text-[hsl(210,40%,98%)]'}`}>USD</span>
            </button>
            
            {/* GBP Flag */}
            <button 
              onClick={() => setCurrency('GBP')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all font-mono ${
                currency === 'GBP' 
                  ? 'bg-green-500 dark:bg-[rgba(34,197,94,0.3)] dark:border-2 dark:border-[rgba(34,197,94,0.6)] shadow-lg scale-105' 
                  : 'bg-gray-300 dark:bg-[rgba(34,197,94,0.05)] hover:bg-gray-400 dark:hover:bg-[rgba(34,197,94,0.15)] hover:scale-105'
              }`}
            >
              <span className="text-lg">🇬🇧</span>
              <span className={`text-sm font-bold ${currency === 'GBP' ? 'text-white' : 'text-gray-700 dark:text-[hsl(210,40%,98%)]'}`}>GBP</span>
            </button>
            
            {user ? (
              <div className="flex items-center space-x-2">
                {isAdmin() && (
                  <Button asChild variant="outline" size="sm" className="dark:border-[rgba(34,197,94,0.3)] dark:text-[hsl(152,69%,50%)] dark:hover:bg-[rgba(34,197,94,0.1)] font-mono">
                    <Link to="/admin">
                      <Settings className="w-4 h-4 mr-1" />
                      Admin
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm" className="dark:border-[rgba(34,197,94,0.3)] dark:text-[hsl(152,69%,50%)] dark:hover:bg-[rgba(34,197,94,0.1)] font-mono">
                  <Link to="/downloads">
                    <Download className="w-4 h-4 mr-1" />
                    Downloads
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="dark:border-[rgba(34,197,94,0.3)] dark:text-[hsl(152,69%,50%)] dark:hover:bg-[rgba(34,197,94,0.1)] font-mono">
                  <Link to="/dashboard">
                    <User className="w-4 h-4 mr-1" />
                    Dashboard
                  </Link>
                </Button>
                <Button onClick={handleSignOut} variant="ghost" size="sm" className="dark:text-[hsl(210,40%,98%)] dark:hover:bg-[rgba(34,197,94,0.1)] font-mono">
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button asChild size="sm" className="bg-green-500 dark:bg-[hsl(152,69%,45%)] hover:bg-green-600 dark:hover:bg-[hsl(152,69%,40%)] text-white rounded-lg px-6 dark:shadow-lg dark:shadow-[rgba(34,197,94,0.3)] transition-all duration-300 font-mono uppercase tracking-wider">
                <Link to="/auth">Register</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col space-y-4 mt-8">
                <Link to="/shop" onClick={() => setIsOpen(false)} className="text-lg hover:text-primary transition-colors">
                  Marketplace
                </Link>
                <Link to="/creators" onClick={() => setIsOpen(false)} className="text-lg hover:text-primary transition-colors">
                  Creators
                </Link>
                <Link to="/about" onClick={() => setIsOpen(false)} className="text-lg hover:text-primary transition-colors">
                  About
                </Link>
                <Link to="/contact" onClick={() => setIsOpen(false)} className="text-lg hover:text-primary transition-colors">
                  Contact
                </Link>
                
                {user ? (
                  <div className="space-y-2 pt-4 border-t">
                    {isAdmin() && (
                      <Button asChild variant="outline" className="w-full justify-start">
                        <Link to="/admin" onClick={() => setIsOpen(false)}>
                          <Settings className="w-4 h-4 mr-2" />
                          Admin Panel
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                        <User className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-4 border-t">
                    <Button asChild variant="ghost" className="w-full">
                      <Link to="/auth" onClick={() => setIsOpen(false)}>Sign In</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link to="/auth" onClick={() => setIsOpen(false)}>Get Started</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navigation;