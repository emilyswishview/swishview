interface YouTubeEmbedProps {
  url: string;
  title?: string;
  className?: string;
}

const YouTubeEmbed = ({ url, title = 'YouTube video', className = '' }: YouTubeEmbedProps) => {
  const getYouTubeId = (url: string) => {
    // Enhanced regex to handle various YouTube URL formats with query parameters
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?:[&?].*)?/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?].*)?/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[&?].*)?/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})(?:[&?].*)?/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?:[&?].*)?/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    
    return null;
  };

  const videoId = getYouTubeId(url);

  if (!videoId) {
    return (
      <div className="bg-muted p-4 rounded-lg text-center text-muted-foreground">
        Invalid YouTube URL
      </div>
    );
  }

  // Add parameters to prevent blocking and enable features
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`;

  return (
    <div className={`relative w-full ${className}`}>
      <div className="aspect-video">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
};

export default YouTubeEmbed;
