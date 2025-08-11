import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";
  const { userRole, signOut } = useAuth();
  const isSystemAdmin = userRole === "system_admin";

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Dismissal Pro
          </span>
        </Link>
        
        <div className="flex items-center gap-4">
          {isAuthPage ? (
            <Link to="/">
              <Button variant="ghost">← Back to Home</Button>
            </Link>
          ) : isSystemAdmin ? (
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