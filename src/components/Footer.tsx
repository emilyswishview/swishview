
import React from "react";
import { useNavigate } from "react-router-dom";
import CircularText from "./CircularText";

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
              href="/shipping-policy"
              className="text-orange-500 hover:underline transition-colors font-display"
            >
              Shipping & Delivery
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
              className="text-orange-500 hover:underline transition-colors font-display"
            >
              Socials
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
