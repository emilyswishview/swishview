// Utility to process HTML content and fix YouTube embeds
export const processYouTubeEmbeds = (html: string): string => {
  if (!html) return html;

  // First, convert plain YouTube URLs to iframes
  let processedHtml = html;
  
  // Regex to match YouTube URLs in text (not already in iframe src)
  const urlPatterns = [
    /(?<!src=["'])https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:[^\s<"']*)?/gi,
    /(?<!src=["'])https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})(?:[^\s<"']*)?/gi,
    /(?<!src=["'])https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:[^\s<"']*)?/gi,
  ];
  
  urlPatterns.forEach(pattern => {
    processedHtml = processedHtml.replace(pattern, (match, videoId) => {
      // Check if this URL is already inside an iframe tag
      const beforeMatch = processedHtml.substring(0, processedHtml.indexOf(match));
      const lastIframeOpen = beforeMatch.lastIndexOf('<iframe');
      const lastIframeClose = beforeMatch.lastIndexOf('</iframe>');
      
      // If we're inside an iframe tag, don't replace
      if (lastIframeOpen > lastIframeClose) {
        return match;
      }
      
      // Create responsive iframe wrapper with the video
      return `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin-bottom: 1.5rem;">
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0" 
          title="YouTube video" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen 
          referrerpolicy="strict-origin-when-cross-origin"
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
        ></iframe>
      </div>`;
    });
  });

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = processedHtml;

  // Find all iframes
  const iframes = tempDiv.querySelectorAll('iframe');
  
  iframes.forEach((iframe) => {
    const src = iframe.getAttribute('src');
    
    // Check if it's a YouTube iframe
    if (src && (src.includes('youtube.com') || src.includes('youtu.be'))) {
      // Extract video ID from various YouTube URL formats
      let videoId = null;
      
      const patterns = [
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      ];
      
      for (const pattern of patterns) {
        const match = src.match(pattern);
        if (match && match[1]) {
          videoId = match[1];
          break;
        }
      }
      
      if (videoId) {
        // Create new embed URL with proper parameters
        const newSrc = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`;
        
        // Update iframe attributes
        iframe.setAttribute('src', newSrc);
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        iframe.style.border = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        
        // Wrap in responsive container if not already wrapped
        if (!iframe.parentElement?.classList.contains('video-container')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'video-container';
          wrapper.style.position = 'relative';
          wrapper.style.paddingBottom = '56.25%'; // 16:9 aspect ratio
          wrapper.style.height = '0';
          wrapper.style.overflow = 'hidden';
          wrapper.style.marginBottom = '1.5rem';
          
          iframe.style.position = 'absolute';
          iframe.style.top = '0';
          iframe.style.left = '0';
          
          iframe.parentNode?.insertBefore(wrapper, iframe);
          wrapper.appendChild(iframe);
        }
      }
    }
  });

  return tempDiv.innerHTML;
};
