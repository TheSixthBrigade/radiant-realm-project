import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, User, LogOut, Settings, Sun, Moon, Download, Search, LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCurrency } from "@/contexts/CurrencyContext";
import GlowingLogo from "@/components/GlowingLogo";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRoles();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/30">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <GlowingLogo size="md" showText={true} />

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-green-400 transition-colors" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/60 border border-slate-800/50 text-white placeholder:text-slate-500 focus:outline-none focus:border-green-500/40 focus:bg-slate-900 transition-all text-sm"
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              className="p-2 lg:p-2.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-all"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 lg:w-5 lg:h-5" /> : <Moon className="w-4 h-4 lg:w-5 lg:h-5" />}
            </button>

            {/* Currency Toggle */}
            <div className="flex bg-slate-900/60 rounded-lg p-0.5 lg:p-1 border border-slate-800/30">
              <button 
                onClick={() => setCurrency('USD')} 
                className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded text-xs lg:text-sm font-medium transition-all ${currency === 'USD' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                USD
              </button>
              <button 
                onClick={() => setCurrency('GBP')} 
                className={`px-2 py-1 lg:px-3 lg:py-1.5 rounded text-xs lg:text-sm font-medium transition-all ${currency === 'GBP' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                GBP
              </button>
            </div>

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin() && (
                  <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <Link to="/admin">
                      <Settings className="w-4 h-4 mr-1.5" />
                      <span className="hidden lg:inline">Admin</span>
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800/50">
                  <Link to="/downloads">
                    <Download className="w-4 h-4 mr-1.5" />
                    <span className="hidden lg:inline">Downloads</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-green-600 hover:bg-green-500 text-white rounded-lg lg:text-sm lg:px-4 lg:py-2">
                  <Link to="/dashboard" className="flex items-center gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    <span className="hidden lg:inline">Dashboard</span>
                  </Link>
                </Button>
                <Button 
                  onClick={handleSignOut} 
                  variant="ghost" 
                  size="sm" 
                  className="text-slate-400 hover:text-white hover:bg-slate-800/50"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button asChild size="sm" className="bg-green-600 hover:bg-green-500 text-white rounded-lg lg:text-sm lg:px-4 lg:py-2">
                <Link to="/auth?mode=register">Get Started</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="md:hidden p-2 rounded-lg hover:bg-slate-800/50 text-slate-400"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 pt-4 border-t border-slate-800/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-800/50 text-white placeholder:text-slate-500 text-sm" 
              />
            </form>

            {/* Currency & Theme */}
            <div className="flex items-center justify-between">
              <div className="flex bg-slate-900/60 rounded-lg p-0.5">
                <button 
                  onClick={() => setCurrency('USD')} 
                  className={`px-3 py-1.5 rounded text-sm ${currency === 'USD' ? 'bg-green-600 text-white' : 'text-slate-400'}`}
                >
                  USD
                </button>
                <button 
                  onClick={() => setCurrency('GBP')} 
                  className={`px-3 py-1.5 rounded text-sm ${currency === 'GBP' ? 'bg-green-600 text-white' : 'text-slate-400'}`}
                >
                  GBP
                </button>
              </div>
              <button 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
                className="p-2 rounded-lg bg-slate-900/60 text-slate-400"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="space-y-1 pt-2">
              <Link 
                to="/shop" 
                onClick={() => setIsOpen(false)} 
                className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                Marketplace
              </Link>
              <Link 
                to="/creators" 
                onClick={() => setIsOpen(false)} 
                className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                Creators
              </Link>
              <Link 
                to="/about" 
                onClick={() => setIsOpen(false)} 
                className="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                About
              </Link>
            </div>

            {/* Mobile Auth */}
            {user ? (
              <div className="space-y-2 pt-2 border-t border-slate-800/30">
                {isAdmin() && (
                  <Link 
                    to="/admin" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50"
                  >
                    <Settings className="w-4 h-4" />
                    Admin Panel
                  </Link>
                )}
                <Link 
                  to="/downloads" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50"
                >
                  <Download className="w-4 h-4" />
                  Downloads
                </Link>
                <Button asChild className="w-full bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg">
                  <Link to="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button 
                  onClick={handleSignOut} 
                  variant="ghost" 
                  className="w-full text-slate-400 hover:text-white hover:bg-slate-800/50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 pt-2 border-t border-slate-800/30">
                <Button asChild className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg">
                  <Link to="/auth?mode=login" onClick={() => setIsOpen(false)}>Sign In</Link>
                </Button>
                <Button asChild className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg">
                  <Link to="/auth?mode=register" onClick={() => setIsOpen(false)}>Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navigation;
