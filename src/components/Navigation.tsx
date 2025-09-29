import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import logo from "@/assets/luzondev-logo.png";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRoles();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src={logo} 
              alt="LuzonDev" 
              className="h-8 w-8"
            />
            <span className="font-bold text-xl">LuzonDev</span>
          </Link>

          {/* Desktop Navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList className="flex space-x-8">
              <NavigationMenuItem>
                <Link to="/shop" className="hover:text-primary transition-colors">
                  Marketplace
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/creators" className="hover:text-primary transition-colors">
                  Creators
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/about" className="hover:text-primary transition-colors">
                  About
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/contact" className="hover:text-primary transition-colors">
                  Contact
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-2">
                {isAdmin() && (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin">
                      <Settings className="w-4 h-4 mr-1" />
                      Admin
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard">
                    <User className="w-4 h-4 mr-1" />
                    Dashboard
                  </Link>
                </Button>
                <Button onClick={handleSignOut} variant="ghost" size="sm">
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </div>
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