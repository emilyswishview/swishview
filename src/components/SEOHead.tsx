
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = "Swish View | YouTube Promotion | Real Views. Real Growth.",
  description = "Boost your YouTube videos with Swish View — real views, fast growth, smart targeting. Trusted by creators worldwide for organic YouTube growth.",
  keywords = "swish view, youtube promotion, real views, video marketing, grow youtube, viral video campaign, organic youtube growth, youtube views, video promotion",
  image = "/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png",
  url = "https://www.swishview.com"
}) => {
  return (
    <Helmet>
      {/* Title and Meta */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Swish View Team" />
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Optional favicon and charset */}
      <link rel="icon" href={image} type="image/png" />
      <meta charSet="UTF-8" />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Swish View",
          "url": url,
          "logo": `${url}/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png`,
          "description": "Swish View helps YouTube creators grow with real views, fast growth, and smart targeting. Trusted by creators worldwide for organic YouTube growth.",
          "sameAs": [
            "https://twitter.com/swishview",
            "https://youtube.com/swishview"
          ],
          "keywords": "swish view, youtube promotion, real views, video marketing"
        })}
      </script>
    </Helmet>
  );
};

export default SEOHead;
