import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Calendar, Youtube, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import SEOHead from '@/components/SEOHead';

interface Creator {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  short_bio: string | null;
  email: string | null;
  profile_image_url: string | null;
  channel_url: string | null;
  subscribers: number | null;
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
}

const CreatorBlog = () => {
  const { creatorSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorInfo, setCreatorInfo] = useState<Creator | null>(null);

  useEffect(() => {
    if (creatorSlug) {
      fetchCreatorAndPosts();
    }
  }, [creatorSlug]);

  const fetchCreatorAndPosts = async () => {
    try {
      // First, fetch creator info from blog_authors
      const { data: creatorData, error: creatorError } = await supabase
        .from('blog_authors')
        .select('*')
        .eq('slug', creatorSlug)
        .single();

      if (creatorError) {
        console.error('Creator fetch error:', creatorError);
        toast({
          title: 'Creator not found',
          description: 'This creator does not exist',
          variant: 'destructive',
        });
        navigate('/blogs');
        return;
      }

      setCreatorInfo(creatorData);

      // Then fetch their published posts
      const { data: postsData, error: postsError } = await supabase
        .from('blog_posts')
        .select('id, slug, title, subtitle, thumbnail_url, read_time_minutes, created_at, featured_youtube_url')
        .eq('author_id', creatorData.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Posts fetch error:', postsError);
      }

      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching creator data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load creator information',
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

  // Generate structured data for creator (Person schema)
  const creatorStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `https://www.swishview.com/blogs/${creatorSlug}#person`,
        "name": creatorInfo.name,
        "url": `https://www.swishview.com/blogs/${creatorSlug}`,
        "image": creatorInfo.profile_image_url ? `https://www.swishview.com${creatorInfo.profile_image_url}` : undefined,
        "description": creatorInfo.short_bio || creatorInfo.bio,
        "sameAs": creatorInfo.channel_url ? [creatorInfo.channel_url] : [],
        "jobTitle": "Content Creator",
        "worksFor": {
          "@type": "Organization",
          "name": "YouTube"
        }
      },
      {
        "@type": "ProfilePage",
        "@id": `https://www.swishview.com/blogs/${creatorSlug}`,
        "url": `https://www.swishview.com/blogs/${creatorSlug}`,
        "name": `${creatorInfo.name} - Blog Posts | Swish View`,
        "description": `Explore all blog posts and content by ${creatorInfo.name}. ${creatorInfo.short_bio || ''}`,
        "mainEntity": {
          "@id": `https://www.swishview.com/blogs/${creatorSlug}#person`
        },
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://www.swishview.com"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Blogs",
              "item": "https://www.swishview.com/blogs"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": creatorInfo.name,
              "item": `https://www.swishview.com/blogs/${creatorSlug}`
            }
          ]
        }
      },
      {
        "@type": "ItemList",
        "itemListElement": posts.map((post, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": `https://www.swishview.com/blogs/${creatorSlug}/${post.slug}`
        }))
      }
    ]
  };

  const seoTitle = `${creatorInfo.name} - Blog Posts | Swish View`;
  const seoDescription = `Explore all blog posts by ${creatorInfo.name}${creatorInfo.subscribers ? ` (${creatorInfo.subscribers.toLocaleString()} subscribers)` : ''}. ${creatorInfo.short_bio || creatorInfo.bio || 'Discover insights, tips, and stories from a leading content creator.'}`;
  const seoKeywords = `${creatorInfo.name}, ${creatorInfo.name} blog, ${creatorInfo.name} youtube, youtube creator blog, content creator, ${creatorSlug}`;

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        image={creatorInfo.profile_image_url || "/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png"}
        url={`https://www.swishview.com/blogs/${creatorSlug}`}
        type="profile"
        author={creatorInfo.name}
        structuredData={creatorStructuredData}
        canonical={`https://www.swishview.com/blogs/${creatorSlug}`}
      />
      <Navbar />
      <div className="navbar-offset">
        {/* Hero Banner with Creator Info */}
        <div className="relative bg-gradient-to-br from-primary/20 to-orange-600/20">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Mobile: vertical stack, centered */}
            <div className="flex flex-col items-center text-center py-8 gap-3 sm:hidden">
              {creatorInfo.profile_image_url ? (
                <img
                  src={creatorInfo.profile_image_url}
                  alt={creatorInfo.name || 'Creator'}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-xl">
                  {creatorInfo.name?.[0] || 'C'}
                </div>
              )}
              <h1 className="text-2xl font-bold text-white w-full px-2" style={{ fontFamily: 'Brockmann, serif', wordBreak: 'break-word' }}>
                {creatorInfo.name || 'Creator'}
              </h1>
              {creatorInfo.short_bio && (
                <p className="text-sm text-white/90 px-4" style={{ wordBreak: 'break-word' }}>
                  {creatorInfo.short_bio}
                </p>
              )}
              {creatorInfo.subscribers && creatorInfo.subscribers > 0 && (
                <div className="flex items-center gap-1.5 text-white">
                  <Youtube className="w-4 h-4" />
                  <span className="font-semibold text-sm">
                    {creatorInfo.subscribers.toLocaleString()} subscribers
                  </span>
                </div>
              )}
              {creatorInfo.channel_url && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 text-sm mt-1"
                  onClick={() => window.open(creatorInfo.channel_url!, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit Channel
                </Button>
              )}
            </div>

            {/* Desktop: horizontal layout */}
            <div className="hidden sm:flex items-center gap-8 py-16">
              {creatorInfo.profile_image_url ? (
                <img
                  src={creatorInfo.profile_image_url}
                  alt={creatorInfo.name || 'Creator'}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-xl flex-shrink-0">
                  {creatorInfo.name?.[0] || 'C'}
                </div>
              )}
              <div className="text-white text-left">
                <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ fontFamily: 'Brockmann, serif' }}>
                  {creatorInfo.name || 'Creator'}
                </h1>
                {creatorInfo.short_bio && (
                  <p className="text-xl text-white/90 mb-4 max-w-2xl">
                    {creatorInfo.short_bio}
                  </p>
                )}
                <div className="flex items-center gap-6">
                  {creatorInfo.subscribers && creatorInfo.subscribers > 0 && (
                    <div className="flex items-center gap-2">
                      <Youtube className="w-5 h-5" />
                      <span className="font-semibold text-base">
                        {creatorInfo.subscribers.toLocaleString()} subscribers
                      </span>
                    </div>
                  )}
                  {creatorInfo.channel_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(creatorInfo.channel_url!, '_blank')}
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

        {/* Posts Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
          <h2 className="text-xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8" style={{ fontFamily: 'Brockmann, serif' }}>
            {posts.length > 0 ? 'Featured Stories' : 'No Stories Yet'}
          </h2>

          {posts.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center">
              <p className="text-muted-foreground text-base sm:text-lg">
                This creator hasn't published any stories yet. Check back soon!
              </p>
            </Card>
          ) : (
            <div className="space-y-8 sm:space-y-12">
              {posts.map((post) => (
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
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CreatorBlog;
