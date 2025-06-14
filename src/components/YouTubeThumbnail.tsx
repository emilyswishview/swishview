
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Play, ExternalLink } from "lucide-react";

interface YouTubeThumbnailProps {
  videoUrl: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const YouTubeThumbnail: React.FC<YouTubeThumbnailProps> = ({ 
  videoUrl, 
  className = "", 
  size = "md" 
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [imageError, setImageError] = useState<boolean>(false);

  const sizeClasses = {
    sm: "w-full h-16 sm:h-20",
    md: "w-full h-24 sm:h-32 md:h-36",
    lg: "w-full h-32 sm:h-40 md:h-48"
  };

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleThumbnailClick = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    console.log("YouTubeThumbnail received URL:", videoUrl);
    const videoId = extractVideoId(videoUrl);
    console.log("Extracted video ID:", videoId);
    
    if (videoId) {
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      console.log("Setting thumbnail URL:", thumbnailUrl);
      setThumbnailUrl(thumbnailUrl);
      setVideoTitle('YouTube Video');
      setImageError(false);
    } else {
      setThumbnailUrl('');
      setVideoTitle('');
    }
  }, [videoUrl]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log("Image error, trying fallback thumbnail");
    const target = e.currentTarget;
    const videoId = extractVideoId(videoUrl);
    
    if (videoId && !imageError) {
      // Try fallback thumbnail
      target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      setImageError(true);
    }
  };

  if (!videoUrl || !thumbnailUrl) {
    return (
      <Card className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg`}>
        <Play className="h-6 w-6 text-gray-400" />
      </Card>
    );
  }

  return (
    <Card 
      className={`${sizeClasses[size]} ${className} relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300 rounded-lg border-2 hover:border-blue-300`}
      onClick={handleThumbnailClick}
    >
      <div className="relative w-full h-full">
        <img
          src={thumbnailUrl}
          alt={videoTitle}
          className="w-full h-full object-cover"
          onError={handleImageError}
          onLoad={() => console.log("Thumbnail loaded successfully")}
        />
        
        {/* Overlay with play button */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2">
            <Play className="h-8 w-8 text-white fill-white" />
            <ExternalLink className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* YouTube branding indicator */}
        <div className="absolute bottom-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold opacity-90">
          YouTube
        </div>
      </div>
    </Card>
  );
};

export default YouTubeThumbnail;
