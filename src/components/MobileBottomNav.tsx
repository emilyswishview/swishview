import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, Phone, ShoppingBag } from "lucide-react";

const navItems = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Products", icon: ShoppingBag, path: "/product" },
  { label: "Contact", icon: Phone, path: "/contact" },
];

// Pages where bottom nav should be hidden
const hiddenPaths = ["/login", "/signup", "/forgot-password", "/reset-password", "/admin", "/campaign-management", "/email-tracker", "/tracker", "/blogs-management", "/partners", "/prospects", "/calling", "/phone", "/crm", "/seo", "/email-check"];

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // On mobile, if viewport height shrinks significantly, keyboard is open
      if (window.visualViewport) {
        setIsKeyboardOpen(window.visualViewport.height < window.innerHeight * 0.75);
      }
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  // Hide on certain pages or when keyboard is open
  const shouldHide = hiddenPaths.some(p => location.pathname.startsWith(p)) || isKeyboardOpen;
  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 shadow-lg backdrop-blur-md md:hidden safe-area-bottom">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] mt-1 ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
