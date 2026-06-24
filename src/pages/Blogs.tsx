import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { TrendingUp, Calendar } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import SEOHead from '@/components/SEOHead';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  hero_image_url: string | null;
  creator_name: string | null;
  creator_slug: string | null;
  creator_profile_image: string | null;
  published_at: string | null;
  read_time_minutes: number | null;
  views_count: number | null;
}

// COMMENTED OUT FOR FUTURE USE WHEN WE HAVE MORE CREATORS
// interface Creator {
//   id: string;
//   slug: string;
//   name: string;
//   profile_image_url: string | null;
//   short_bio: string | null;
//   bio: string | null;
//   channel_url: string | null;
//   subscribers: number | null;
//   post_count: number;
// }

const Blogs = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      // Fetch all published blog posts
      const { data: postsData, error: postsError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (postsError) {
        console.error('Supabase error:', postsError);
        throw postsError;
      }

      const formattedPosts: BlogPost[] = postsData?.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        subtitle: post.subtitle,
        thumbnail_url: post.thumbnail_url,
        hero_image_url: post.hero_image_url,
        creator_name: post.creator_name,
        creator_slug: post.creator_slug,
        creator_profile_image: post.creator_profile_image,
        published_at: post.published_at,
        read_time_minutes: post.read_time_minutes,
        views_count: post.views_count,
      })) || [];

      console.log('Fetched posts:', formattedPosts);
      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blog posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const blogsStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Swish View Blog – YouTube Creator Stories & Growth Insights',
    description:
      'Read stories, case studies, and growth insights from top YouTube creators promoted by Swish View.',
    url: 'https://www.swishview.com/blogs',
    publisher: {
      '@type': 'Organization',
      name: 'Swish View',
      url: 'https://www.swishview.com',
      logo: 'https://www.swishview.com/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png',
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.slice(0, 20).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://www.swishview.com/blogs/${p.creator_slug}/${p.slug}`,
        name: p.title,
      })),
    },
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <SEOHead
        title="Swish View Blog | YouTube Creator Stories, Case Studies & Growth Insights"
        description="Explore the Swish View blog for YouTube creator stories, growth case studies, channel strategies, and SEO insights from real creators we've promoted."
        keywords="swishview blog, swish view blogs, youtube creator stories, youtube growth blog, youtube promotion case studies, creator interviews, youtube seo blog"
        url="https://www.swishview.com/blogs"
        canonical="https://www.swishview.com/blogs"
        type="website"
        structuredData={blogsStructuredData}
      />
      <div className="flex-1">
        {/* Hero Section */}
        <section className="relative py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary mb-4 sm:mb-6">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">SwishView Insights</span>
            </div>
            <h1 className="section-title mb-4 sm:mb-6 text-foreground">
              Featured Stories
            </h1>
            <p className="section-subtitle mx-auto px-2">
              Explore stories and insights from top YouTube creators
            </p>
          </div>
        </section>

        {/* Blog Posts List */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-20">
          {posts.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center">
              <p className="text-muted-foreground text-base sm:text-lg">No stories available yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8">
              {posts.map((post) => (
                <Card
                  key={post.slug}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border border-border"
                  onClick={() => {
                    if (post.creator_slug) {
                      navigate(`/blogs/${post.creator_slug}/${post.slug}`);
                    }
                  }}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Post Thumbnail */}
                    {(post.thumbnail_url || post.hero_image_url) && (
                      <div className="md:w-72 lg:w-80 w-full aspect-video md:aspect-auto overflow-hidden flex-shrink-0">
                        <img
                          src={post.thumbnail_url || post.hero_image_url || ''}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    {/* Post Content */}
                    <div className="flex-1 p-4 sm:p-6 space-y-3 sm:space-y-4">
                      {/* Creator Info - Clickable */}
                      {post.creator_name && (
                        <div 
                          className="flex items-center gap-2 sm:gap-3 w-fit hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (post.creator_slug) {
                              navigate(`/blogs/${post.creator_slug}`);
                            }
                          }}
                        >
                          {post.creator_profile_image ? (
                            <img
                              src={post.creator_profile_image}
                              alt={post.creator_name}
                              className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-primary/20"
                            />
                          ) : (
                            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-primary-foreground text-sm sm:text-base font-bold border-2 border-primary/20">
                              {post.creator_name[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-foreground truncate hover:text-primary transition-colors">
                              {post.creator_name}
                            </p>
                            {post.published_at && (
                              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span>{new Date(post.published_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      {/* Subtitle */}
                      {post.subtitle && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
                          {post.subtitle}
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-border text-xs sm:text-sm text-muted-foreground">
                        {post.read_time_minutes && (
                          <span>{post.read_time_minutes} min read</span>
                        )}
                        {post.views_count !== null && post.views_count > 0 && (
                          <span>{post.views_count.toLocaleString()} views</span>
                        )}
                        <span className="ml-auto text-primary font-medium group-hover:underline text-xs sm:text-sm">
                          Read Story →
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
      
      {/* Footer Line */}
      <footer className="py-4 sm:py-6 px-4 border-t border-border bg-background">
        <p className="text-center text-xs sm:text-sm text-muted-foreground">
          SwishView LLC – Registered in Wyoming, USA | Secure Checkout | Trusted by 10K+ Creators Worldwide
        </p>
      </footer>
    </div>
  );
};

export default Blogs;
