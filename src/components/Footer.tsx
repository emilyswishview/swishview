import React from "react";
import { useNavigate } from "react-router-dom";
import CircularText from "./CircularText";

const BrandSocialIcon = ({ platform }: { platform: "instagram" | "linkedin" | "youtube" }) => {
  const sizeClass = "h-5 w-5";

  switch (platform) {
    case "instagram":
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="igGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f58529" />
              <stop offset="33%" stopColor="#dd2a7b" />
              <stop offset="66%" stopColor="#8134af" />
              <stop offset="100%" stopColor="#515bd4" />
            </linearGradient>
          </defs>
          <path
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.98-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.2-4.354-2.617-6.78-6.98-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
            fill="url(#igGradient)"
          />
        </svg>
      );
    case "linkedin":
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M19 0H5a5 5 0 0 0-5 5v14a5 5 0 0 0 5 5h14a5 5 0 0 0 5-5V5a5 5 0 0 0-5-5zM8 19H5V8h3v11zM6.5 6.732A1.75 1.75 0 1 1 8.25 5c0 .967-.784 1.75-1.75 1.732zM19 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z"
            fill="#0A66C2"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
            fill="#FF0000"
          />
        </svg>
      );
    default:
      return null;
  }
};

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="w-full bg-white py-8 relative">
      <div className="section-container">
        <div className="flex flex-col items-center space-y-6">
          {/* Decorative circular text - fixed position, minimal and non-distracting */}
          


          <p className="text-center text-gray-600 text-sm font-display">
            Create. Upload. Go Viral! ❤
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="/privacy-policy"
              className="text-orange-500 hover:underline transition-colors font-display"
            >
              Privacy Policy
            </a>
            
            <a
              href="/terms-conditions"
              className="text-orange-500 hover:underline transition-colors font-display"
            >
              Terms & Conditions
            </a>
            
            <a
              href="/refund-policy"
              className="text-orange-500 hover:underline transition-colors font-display"
            >
              Cancellation & Refund
            </a>
            
            <a
              href="/contact"
              className="text-orange-500 hover:underline transition-colors font-display"
            >
              Contact Us
            </a>
            
            <a
              href="https://www.instagram.com/swish_view/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:scale-110 transition-transform"
              aria-label="Instagram"
            >
              <BrandSocialIcon platform="instagram" />
            </a>

            <a
              href="https://www.linkedin.com/company/swishview"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:scale-110 transition-transform"
              aria-label="LinkedIn"
            >
              <BrandSocialIcon platform="linkedin" />
            </a>

            <a
              href="https://www.youtube.com/@swishview"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:scale-110 transition-transform"
              aria-label="YouTube"
            >
              <BrandSocialIcon platform="youtube" />
            </a>
          </div>

          {/* Copyright line */}
          <div className="text-center text-xs text-gray-500 font-display pt-4 border-t border-gray-200 w-full">
          SwishView LLC – Registered in Wyoming, USA | Secure Checkout | Trusted by 10K+ Creators Worldwide

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
