import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCurrency } from "@/contexts/CurrencyContext";
import GlowingLogo from "@/components/GlowingLogo";

const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M6 2H3C2.45 2 2 2.45 2 3V12C2 12.55 2.45 13 3 13H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M10 5L13 7.5L10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M7.5 1V2.5M7.5 12.5V14M1 7.5H2.5M12.5 7.5H14M2.93 2.93L4 4M11 11L12.07 12.07M2.93 12.07L4 11M11 4L12.07 2.93" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const NAV_LINKS = [
  { label: 'Shop', to: '/shop' },
  { label: 'Creators', to: '/creators' },
  { label: 'Developer', to: '/developer' },
  { label: 'Pricing', to: '/pricing' },
];

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRoles();
  const { currency, setCurrency } = useCurrency();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="nav-frosted fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <GlowingLogo size="sm" showText={true} />

          {/* Center: nav links + search */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm text-zinc-400 hover:text-white transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
            <form onSubmit={handleSearch} className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                <IconSearch />
              </span>
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-full text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all duration-200 w-40 focus:w-52"
              />
            </form>
          </div>

          {/* Right: currency + auth */}
          <div className="hidden md:flex items-center gap-3">
            <div className="currency-toggle">
              <button onClick={() => setCurrency('USD')} className={`currency-toggle-btn ${currency === 'USD' ? 'active' : ''}`}>USD</button>
              <button onClick={() => setCurrency('GBP')} className={`currency-toggle-btn ${currency === 'GBP' ? 'active' : ''}`}>GBP</button>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin() && (
                  <Link to="/admin" className="p-2 text-zinc-500 hover:text-white transition-colors" title="Admin">
                    <IconSettings />
                  </Link>
                )}
                <Link to="/dashboard" className="wave-btn wave-btn-primary wave-btn-sm">
                  <span className="wave-btn-content">Dashboard</span>
                </Link>
                <button onClick={handleSignOut} className="p-2 text-zinc-500 hover:text-white transition-colors" title="Sign out">
                  <IconLogout />
                </button>
              </div>
            ) : (
              <>
                <Link to="/auth?mode=login" className="wave-btn wave-btn-outline wave-btn-sm">
                  <span className="wave-btn-content">Sign In</span>
                </Link>
                <Link to="/auth?mode=register" className="wave-btn wave-btn-primary wave-btn-sm">
                  <span className="wave-btn-content">Get Started</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors">
            {isOpen ? <IconX /> : <IconMenu />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden border-t border-white/[0.07] py-4 space-y-3">
            <form onSubmit={handleSearch} className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                <IconSearch />
              </span>
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-full text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
              />
            </form>

            <div className="currency-toggle w-fit">
              <button onClick={() => setCurrency('USD')} className={`currency-toggle-btn ${currency === 'USD' ? 'active' : ''}`}>USD</button>
              <button onClick={() => setCurrency('GBP')} className={`currency-toggle-btn ${currency === 'GBP' ? 'active' : ''}`}>GBP</button>
            </div>

            <div className="space-y-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {user ? (
              <div className="space-y-2 pt-2 border-t border-white/[0.07]">
                {isAdmin() && (
                  <Link to="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors">
                    <IconSettings />
                    Admin Panel
                  </Link>
                )}
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-2 w-full wave-btn wave-btn-primary">
                  <span className="wave-btn-content">Dashboard</span>
                </Link>
                <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors">
                  <IconLogout />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2 pt-2 border-t border-white/[0.07]">
                <Link to="/auth?mode=login" onClick={() => setIsOpen(false)} className="flex-1 wave-btn wave-btn-outline justify-center">
                  <span className="wave-btn-content">Sign In</span>
                </Link>
                <Link to="/auth?mode=register" onClick={() => setIsOpen(false)} className="flex-1 wave-btn wave-btn-primary justify-center">
                  <span className="wave-btn-content">Get Started</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navigation;
