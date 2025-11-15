import { Link } from "react-router-dom";
import { Facebook, Linkedin } from "lucide-react";
import logo from "@/assets/logo.svg";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <img src={logo} alt="DismissalPro" className="h-8" />
            <p className="text-sm text-muted-foreground">
              Transforming school dismissal processes with safer, faster, and more organized solutions.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Product</h3>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              <li>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/special-trips" className="text-muted-foreground hover:text-primary transition-colors">
                  Special Trips
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-8 pt-8 border-t border-border/50 bg-accent/70 -mx-4 px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <p>&copy; {new Date().getFullYear()} DismissalPro, Inc. All rights reserved.</p>
            <span className="hidden md:inline">|</span>
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <span className="hidden md:inline">|</span>
            <Link to="/terms-conditions" className="hover:text-primary transition-colors">
              Terms & Conditions
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="https://facebook.com/dismissalpro" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a 
              href="https://linkedin.com/company/dismissalpro" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              aria-label="Follow us on LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
