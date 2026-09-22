
import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import SwishViewLogo from "@/components/SwishViewLogo";
import { Button } from "@/components/ui/button";

const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const navbarOffset = 80;
  const top = el.getBoundingClientRect().top + window.scrollY - navbarOffset;
  window.scrollTo({ top, behavior: "smooth" });
};

const navItems = [
  { label: "Home", action: () => window.scrollTo({ top: 0, behavior: "smooth" }), id: "home" },
  { label: "About", to: "/about", id: "about" },
  { label: "Products", to: "/product", id: "product" },
  { label: "Free Report", to: "/free-report", id: "free-report" },
  { label: "Contact", to: "/contact", id: "contact" },
];

const Navbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("home");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = ["who-we-are", "how-it-works-flow"];
      let current = "home";
      for (const id of sections) {
        const section = document.getElementById(id);
        if (section && window.scrollY >= section.offsetTop - 100) {
          current = id;
        }
      }
      setActiveId(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-white/95 shadow-sm" : "bg-transparent backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between relative">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <SwishViewLogo size="xl" className="[&_img]:h-11 md:[&_img]:h-24" />
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              if (item.to) {
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    className="text-sm font-medium text-gray-800 hover:text-orange-500 transition-colors"
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action?.();
                    setIsMenuOpen(false);
                  }}
                  className={`text-sm font-medium transition-colors ${
                    activeId === item.id
                      ? "text-orange-600 font-semibold"
                      : "text-gray-800 hover:text-orange-500"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Compact mobile menu */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              className="h-10 w-10 rounded-full text-foreground"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute left-4 right-4 top-[60px] rounded-xl border border-border bg-card p-2 shadow-lg transition-all duration-300 ease-in-out md:hidden">
              {navItems.map((item) => {
                if (item.to) {
                  return (
                    <Link
                      key={item.id}
                      to={item.to}
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full rounded-lg px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action?.();
                      setIsMenuOpen(false);
                    }}
                    className={`block w-full rounded-lg px-4 py-3 text-left text-sm transition-colors hover:bg-muted ${
                      activeId === item.id
                        ? "font-semibold text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
