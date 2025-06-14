
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
        src="/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png"
        alt="Swish View - YouTube Promotion Platform"
        className={`${sizeClasses[size]} w-auto object-contain filter drop-shadow-sm hover:drop-shadow-md transition-all duration-200`}
        style={{
          imageRendering: 'crisp-edges',
          WebkitImageRendering: 'crisp-edges',
        } as React.CSSProperties}
      />
    </div>
  );
};

export default SwishViewLogo;
