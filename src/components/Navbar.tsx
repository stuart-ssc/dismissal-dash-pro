import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Menu } from "lucide-react";
import logo from "@/assets/logo.svg";
import SystemAdminSchoolSwitcher from "@/components/SystemAdminSchoolSwitcher";
import { SchoolSwitcher } from "@/components/SchoolSwitcher";
import { useMultiSchool } from "@/hooks/useMultiSchool";

const Navbar = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";
  const isIndexPage = location.pathname === "/";
  const { user, userRole, signOut } = useAuth();
  const { schools } = useMultiSchool();
  const isSystemAdmin = userRole === "system_admin";
  const isTeacher = user && userRole && userRole !== "system_admin";
  const hasMultipleSchools = schools.length > 1;
  
  // Show navigation links on marketing/public pages (everything except app routes)
  const isMarketingRoute = !/^\/(dashboard|admin|modes)\b/.test(location.pathname);
  const showNavLinks = isMarketingRoute;

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {isMarketingRoute && (
          <Link to="/" className="flex items-center">
            <img 
              src={logo}
              alt="Dismissal Pro" 
              className="h-10"
            />
          </Link>
        )}
        
        {/* Navigation Links - Center */}
        {showNavLinks && (
          <div className="hidden md:flex items-center gap-6 mx-auto">
            <Link to="/how-it-works">
              <Button variant="ghost" className="text-foreground hover:text-primary">
                How It Works
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" className="text-foreground hover:text-primary">
                Pricing
              </Button>
            </Link>
          </div>
        )}
        
        {/* Desktop CTA Buttons */}
        <div className={`flex items-center gap-4 ml-auto ${showNavLinks ? 'hidden md:flex' : ''}`}>
          {isAuthPage ? (
            <Link to="/">
              <Button variant="ghost">← Back to Home</Button>
            </Link>
          ) : isMarketingRoute ? (
            user && userRole ? (
              <Link to="/dashboard">
                <Button variant="hero">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button variant="hero">Get Started</Button>
              </Link>
            )
          ) : isSystemAdmin ? (
            <>
              <SystemAdminSchoolSwitcher />
              <Button variant="hero" onClick={signOut}>Sign Out</Button>
            </>
          ) : isTeacher ? (
            <>
              {hasMultipleSchools && <SchoolSwitcher />}
              <Button variant="hero" onClick={signOut}>Sign Out</Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="hero">Get Started</Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu - Hamburger */}
        {showNavLinks && (
          <Sheet>
            <SheetTrigger asChild className="md:hidden ml-auto">
              <Button variant="hero" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link to="/how-it-works">
                  <Button variant="ghost" className="w-full justify-start text-lg">
                    How It Works
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="ghost" className="w-full justify-start text-lg">
                    Pricing
                  </Button>
                </Link>
                <div className="mt-6 pt-6 border-t">
                  {user && userRole ? (
                    <Link to="/dashboard" className="w-full">
                      <Button variant="hero" className="w-full">
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/auth" className="w-full">
                      <Button variant="hero" className="w-full">
                        Get Started
                      </Button>
                    </Link>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
};

export default Navbar;