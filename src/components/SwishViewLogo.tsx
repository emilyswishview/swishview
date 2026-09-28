
import React from "react";
import { useNavigate } from "react-router-dom";

interface SwishViewLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SwishViewLogo = ({ className = "", size = "lg" }: SwishViewLogoProps) => {
  const navigate = useNavigate();
  
  const sizeClasses = {
    sm: "h-10",
    md: "h-16", 
    lg: "h-20",
    xl: "h-24"
  };

  const handleLogoClick = () => {
    navigate("/");
  };

  return (
    <div 
      className={`flex items-center cursor-pointer transition-opacity hover:opacity-80 ${className}`}
      onClick={handleLogoClick}
    >
      <img
        src="/logo-256.webp"
        srcSet="/logo-256.webp 256w, /logo-512.webp 512w"
        sizes="96px"
        alt="Swish View - YouTube Promotion Platform"
        width={256}
        height={248}
        loading="eager"
        decoding="async"
        className={`${sizeClasses[size]} w-auto object-contain filter drop-shadow-sm hover:drop-shadow-md transition-all duration-200`}
      />
    </div>
  );
};

export default SwishViewLogo;
