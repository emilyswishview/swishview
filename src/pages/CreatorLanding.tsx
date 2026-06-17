import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Calendar, Youtube, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { processYouTubeEmbeds } from '@/utils/processYouTubeEmbeds';
import LoadingSpinner from '@/components/LoadingSpinner';
import SEOHead from '@/components/SEOHead';

interface Creator {
  banner_url: string | null;
  page_title: string | null;
  about_content: string | null;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  read_time_minutes: number;
  created_at: string;
  featured_youtube_url: string | null;
  creator_name: string | null;
  creator_slug: string | null;
  creator_channel_url: string | null;
  creator_profile_image: string | null;
  creator_short_bio: string | null;
  creator_subscribers: number | null;
}

const CreatorLanding = () => {
  const { creatorSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorInfo, setCreatorInfo] = useState<BlogPost | null>(null);
  const [creatorDetails, setCreatorDetails] = useState<Creator | null>(null);
  const [page, setPage] = useState(1);
  const postsPerPage = 9;

  useEffect(() => {
    if (creatorSlug) {
      fetchCreatorPosts();
    }
  }, [creatorSlug]);

  const fetchCreatorPosts = async () => {
    try {
      // Fetch creator details
      const { data: authorData, error: authorError } = await (supabase as any)
        .from('blog_authors')
        .select('banner_url, page_title, about_content')
        .eq('slug', creatorSlug)
        .single();

      if (authorError) throw authorError;
      
      if (authorData) {
        setCreatorDetails(authorData);
      }

      // Fetch posts
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('creator_slug', creatorSlug)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setPosts(data);
        setCreatorInfo(data[0]);
      } else {
        toast({
          title: 'Creator not found',
          description: 'No posts found for this creator',
          variant: 'destructive',
        });
        navigate('/blogs');
      }
    } catch (error) {
      console.error('Error fetching creator posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load creator posts',
        variant: 'destructive',
      });
      navigate('/blogs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!creatorInfo) return null;

  const paginatedPosts = posts.slice(0, page * postsPerPage);
  const hasMore = posts.length > paginatedPosts.length;

  // Helper: ensure absolute URL for schema images
  const FALLBACK_IMAGE = "https://www.swishview.com/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png";
  const toAbsoluteUrl = (img: string | null | undefined): string => {
    if (!img || typeof img !== 'string' || img.trim() === '') return FALLBACK_IMAGE;
    const trimmed = img.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return `https://www.swishview.com${trimmed}`;
    return FALLBACK_IMAGE;
  };
  const personImage = toAbsoluteUrl(creatorInfo.creator_profile_image);

  // Canonical URL — must match the route this page is served at (/blogs/:slug)
  const canonicalUrl = `https://www.swishview.com/blogs/${creatorSlug}`;

  // Generate structured data
  const creatorStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${canonicalUrl}#person`,
        "name": creatorInfo.creator_name,
        "url": canonicalUrl,
        "image": personImage,
        "description": creatorInfo.creator_short_bio || `${creatorInfo.creator_name} on Swish View`,
        "sameAs": creatorInfo.creator_channel_url ? [creatorInfo.creator_channel_url] : [],
        "jobTitle": "Content Creator",
        "worksFor": {
          "@type": "Organization",
          "name": "YouTube"
        }
      },
      {
        "@type": "ProfilePage",
        "url": canonicalUrl,
        "name": `${creatorInfo.creator_name} - Creator Page | Swish View`,
        "description": `Discover content by ${creatorInfo.creator_name}${creatorInfo.creator_subscribers ? ` (${creatorInfo.creator_subscribers.toLocaleString()} subscribers)` : ''}. ${creatorInfo.creator_short_bio || ''}`,
        "image": personImage,
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": personImage
        },
        "mainEntity": {
          "@id": `${canonicalUrl}#person`
        }
      },
      {
        "@type": "ItemList",
        "itemListElement": paginatedPosts.map((post, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": `https://www.swishview.com/blogs/${post.creator_slug}/${post.slug}`
        }))
      }
    ]
  };

  const seoTitle = `${creatorInfo.creator_name} - Creator Profile | Swish View`;
  const seoDescription = `${creatorInfo.creator_short_bio || `Discover all content and blog posts by ${creatorInfo.creator_name}.`}${creatorInfo.creator_subscribers ? ` Join ${creatorInfo.creator_subscribers.toLocaleString()} subscribers on their YouTube journey.` : ''}`;
  const seoKeywords = `${creatorInfo.creator_name}, ${creatorInfo.creator_name} youtube, youtube creator, content creator, ${creatorSlug}`;

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        image={personImage}
        url={canonicalUrl}
        type="profile"
        author={creatorInfo.creator_name || undefined}
        structuredData={creatorStructuredData}
        canonical={canonicalUrl}
      />
      <div className="">
        {/* Breadcrumb */}
        {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/blogs')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to all creators</span>
          </button>
        </div> */}

        {/* Hero Banner with Creator Info */}
        <div 
          className="relative sm:h-[400px] overflow-hidden"
          style={{
            backgroundImage: creatorDetails?.banner_url 
              ? `url(${creatorDetails.banner_url})` 
              : 'linear-gradient(to bottom right, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.2))',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

          {/* Mobile: vertical centered stack */}
          <div className="relative flex flex-col items-center text-center gap-3 py-10 px-4 sm:hidden">
            {creatorInfo.creator_profile_image ? (
              <img
                src={creatorInfo.creator_profile_image}
                alt={creatorInfo.creator_name || 'Creator'}
                className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-xl">
                {creatorInfo.creator_name?.[0] || 'C'}
              </div>
            )}
            <h1 className="text-2xl font-bold text-white w-full" style={{ fontFamily: 'Brockmann, serif', wordBreak: 'break-word' }}>
              {creatorInfo.creator_name || 'Creator'}
            </h1>
            {creatorInfo.creator_short_bio && (
              <p className="text-sm text-white/90 px-2" style={{ wordBreak: 'break-word' }}>
                {creatorInfo.creator_short_bio}
              </p>
            )}
            {creatorInfo.creator_subscribers && (
              <div className="flex items-center gap-1.5 text-white">
                <Youtube className="w-4 h-4" />
                <span className="font-semibold text-sm">
                  {creatorInfo.creator_subscribers.toLocaleString()} subscribers
                </span>
              </div>
            )}
            {creatorInfo.creator_channel_url && (
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 text-sm mt-1"
                onClick={() => window.open(creatorInfo.creator_channel_url!, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                Visit Channel
              </Button>
            )}
          </div>

          {/* Desktop: horizontal layout */}
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 h-full hidden sm:flex items-end pb-12">
            <div className="flex items-center gap-6">
              {creatorInfo.creator_profile_image ? (
                <img
                  src={creatorInfo.creator_profile_image}
                  alt={creatorInfo.creator_name || 'Creator'}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-xl">
                  {creatorInfo.creator_name?.[0] || 'C'}
                </div>
              )}
              <div className="text-white">
                <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: 'Brockmann, serif' }}>
                  {creatorInfo.creator_name || 'Creator'}
                </h1>
                {creatorInfo.creator_short_bio && (
                  <p className="text-xl text-white/90 mb-3 max-w-2xl">
                    {creatorInfo.creator_short_bio}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  {creatorInfo.creator_subscribers && (
                    <div className="flex items-center gap-2">
                      <Youtube className="w-5 h-5" />
                      <span className="font-semibold">
                        {creatorInfo.creator_subscribers.toLocaleString()} subscribers
                      </span>
                    </div>
                  )}
                  {creatorInfo.creator_channel_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(creatorInfo.creator_channel_url!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Channel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        {creatorDetails?.about_content && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="bg-card rounded-lg p-8 shadow-sm border">
              {creatorDetails.page_title && (
                <h2 className="text-3xl font-bold text-foreground mb-6" style={{ fontFamily: 'Brockmann, serif' }}>
                  {creatorDetails.page_title}
                </h2>
              )}
              <div 
                className="prose prose-lg max-w-none prose-headings:font-bold prose-p:text-muted-foreground prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: processYouTubeEmbeds(creatorDetails.about_content) }}
              />
            </div>
          </div>
        )}

        {/* Posts Vertical List */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
          <h2 className="text-xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8" style={{ fontFamily: 'Brockmann, serif' }}>
            Featured Stories
          </h2>

          <div className="space-y-8 sm:space-y-12">
            {paginatedPosts.map((post) => (
              <div key={post.id}>
                <Card
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-0 shadow-none"
                  onClick={() => navigate(`/blogs/${creatorSlug}/${post.slug}`)}
                >
                  <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                     {/* Thumbnail Section - Left */}
                     <div className="md:w-80 w-full h-44 sm:h-56 md:h-52 flex-shrink-0">
                      {post.featured_youtube_url ? (
                        <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
                          <iframe
                            src={`https://www.youtube.com/embed/${post.featured_youtube_url.split('v=')[1]?.split('&')[0] || post.featured_youtube_url.split('/').pop()}`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : post.thumbnail_url ? (
                        <img
                          src={post.thumbnail_url}
                          alt={post.title}
                          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-orange-600/20 rounded-lg" />
                      )}
                    </div>

                    {/* Content Section - Right */}
                    <div className="flex-1 flex flex-col justify-center space-y-2 sm:space-y-3 px-1 sm:px-0">
                       <h3 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                         {post.title}
                       </h3>
                       {post.subtitle && (
                         <p className="text-muted-foreground text-sm sm:text-base line-clamp-2 sm:line-clamp-3">
                           {post.subtitle}
                         </p>
                       )}
                       <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground pt-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(post.created_at), 'MMM dd, yyyy')}</span>
                        </div>
                        <span>·</span>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{post.read_time_minutes} min read</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Separator */}
                <div className="mt-12 border-b border-gray-200"></div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-12">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setPage(page + 1)}
              >
                Load More Stories
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom text */}
      <div className="bg-white border-t py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            SwishView LLC – Registered in Wyoming, USA | Secure Checkout | Trusted by 10K+ Creators Worldwide
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreatorLanding;
