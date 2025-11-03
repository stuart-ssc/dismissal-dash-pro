import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.svg";
import SystemAdminSchoolSwitcher from "@/components/SystemAdminSchoolSwitcher";

const Navbar = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";
  const isIndexPage = location.pathname === "/";
  const { user, userRole, signOut } = useAuth();
  const isSystemAdmin = userRole === "system_admin";
  const isTeacher = user && userRole && userRole !== "system_admin";
  
  // Show navigation links on content pages for non-authenticated users
  const isContentPage = ['/', '/how-it-works', '/pricing', '/auth'].includes(location.pathname);
  const showNavLinks = isContentPage && !isTeacher && !isSystemAdmin;

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {(!isTeacher || isIndexPage) && (
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
        
        <div className="flex items-center gap-4 ml-auto">
          {isAuthPage ? (
            <Link to="/">
              <Button variant="ghost">← Back to Home</Button>
            </Link>
          ) : isIndexPage ? (
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
            <Button variant="hero" onClick={signOut}>Sign Out</Button>
          ) : (
            <Link to="/auth">
              <Button variant="hero">Get Started</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;