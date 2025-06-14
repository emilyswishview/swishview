
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SwishViewLogo from "@/components/SwishViewLogo";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const handleAuthAction = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            <SwishViewLogo size="xl" />
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection('how-it-works')} className="nav-link">
              How It Works
            </button>
            <button onClick={() => scrollToSection('specifications')} className="nav-link">
              Features
            </button>
            <button onClick={() => scrollToSection('testimonials')} className="nav-link">
              Testimonials
            </button>
            <button onClick={() => scrollToSection('newsletter')} className="nav-link">
              Contact
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
                <Button onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleAuthAction}>
                  Sign In
                </Button>
                <Button onClick={handleAuthAction}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button 
                onClick={() => scrollToSection('how-it-works')} 
                className="block px-3 py-2 text-gray-800 hover:text-pulse-500"
              >
                How It Works
              </button>
              <button 
                onClick={() => scrollToSection('specifications')} 
                className="block px-3 py-2 text-gray-800 hover:text-pulse-500"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')} 
                className="block px-3 py-2 text-gray-800 hover:text-pulse-500"
              >
                Testimonials
              </button>
              <button 
                onClick={() => scrollToSection('newsletter')} 
                className="block px-3 py-2 text-gray-800 hover:text-pulse-500"
              >
                Contact
              </button>
              <div className="pt-2 space-y-2">
                {user ? (
                  <>
                    <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
                      Dashboard
                    </Button>
                    <Button onClick={handleLogout} className="w-full">
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleAuthAction} className="w-full">
                      Sign In
                    </Button>
                    <Button onClick={handleAuthAction} className="w-full">
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
