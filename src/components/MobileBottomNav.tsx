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
const hiddenPaths = ["/login", "/signup", "/forgot-password", "/reset-password", "/admin", "/campaign-management", "/email-tracker", "/tracker", "/blogs-management", "/partners"];

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-orange-500"
                  : "text-gray-500 hover:text-gray-700"
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
