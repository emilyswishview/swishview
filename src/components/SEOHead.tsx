
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getPageSEO, DEFAULT_SEO, SITE_URL, DEFAULT_OG_IMAGE } from '@/config/seo';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  structuredData?: any;
  canonical?: string;
  noindex?: boolean;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title: titleProp,
  description: descriptionProp,
  keywords: keywordsProp,
  image = DEFAULT_OG_IMAGE,
  url: urlProp,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  structuredData,
  canonical,
  noindex: noindexProp,
}) => {
  // Route-level defaults come from the single SEO control file
  // (src/config/seo.ts) so titles/descriptions can be edited in one place.
  let pathname = '/';
  try {
    pathname = useLocation().pathname;
  } catch {
    pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  }
  const page = getPageSEO(pathname);

  const title = titleProp || page.title || DEFAULT_SEO.title;
  const description = descriptionProp || page.description || DEFAULT_SEO.description;
  const keywords = keywordsProp || page.keywords || DEFAULT_SEO.keywords;
  const noindex = noindexProp ?? !!page.noindex;
  const url = urlProp || `${SITE_URL}${pathname === '/' ? '' : pathname}`;

  const fullImageUrl = image.startsWith('http') ? image : `https://www.swishview.com${image}`;

  const stripTrackingParams = (rawUrl: string): string => {
    try {
      const u = new URL(rawUrl, 'https://www.swishview.com');
      const toDelete: string[] = [];
      u.searchParams.forEach((_, key) => {
        if (/^utm_/i.test(key) || ['gclid', 'fbclid', 'mc_cid', 'mc_eid', 'ref', 'source'].includes(key.toLowerCase())) {
          toDelete.push(key);
        }
      });
      toDelete.forEach((k) => u.searchParams.delete(k));
      return u.toString().replace(/\/$/, '') || u.origin;
    } catch {
      return rawUrl;
    }
  };
  const canonicalUrl = stripTrackingParams(canonical || url);
  const robotsContent = noindex
    ? "noindex, nofollow"
    : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";
  return (
    <Helmet>
      {/* Title and Meta */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author || "Swish View Team"} />
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      <meta name="bingbot" content={robotsContent} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Language and Geographic Targeting */}
      <meta httpEquiv="content-language" content="en-US" />
      <meta name="language" content="English" />
      <meta name="geo.region" content="US" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:secure_url" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content="Swish View" />
      <meta property="og:locale" content="en_US" />
      {type === 'article' && publishedTime && (
        <>
          <meta property="article:published_time" content={publishedTime} />
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {author && <meta property="article:author" content={author} />}
          <meta property="article:section" content="YouTube Growth" />
          <meta property="article:tag" content={keywords} />
        </>
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@swishview" />
      <meta name="twitter:creator" content={author ? `@${author.replace(/\s+/g, '')}` : "@swishview"} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:image:alt" content={title} />
      {type === 'article' && (
        <>
          <meta name="twitter:label1" content="Reading time" />
          <meta name="twitter:data1" content="5 min read" />
          <meta name="twitter:label2" content="Written by" />
          <meta name="twitter:data2" content={author || "Swish View"} />
        </>
      )}

      {/* Optional favicon and charset */}
      <link rel="icon" href={image} type="image/png" />
      <meta charSet="UTF-8" />

      {/* JSON-LD Structured Data */}
      {structuredData ? (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      ) : (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Swish View",
            "url": "https://www.swishview.com",
            "logo": "https://www.swishview.com/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png",
            "description": "Swish View helps YouTube creators grow with real views, fast growth, and smart targeting. Trusted by creators worldwide for organic YouTube growth.",
            "sameAs": [
              "https://twitter.com/swishview",
              "https://youtube.com/swishview"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "Customer Service",
              "email": "support@swishview.com"
            }
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
