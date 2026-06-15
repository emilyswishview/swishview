import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Clock, Calendar, Bookmark, Share2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { format } from 'date-fns';
import { processYouTubeEmbeds } from '@/utils/processYouTubeEmbeds';
import LoadingSpinner from '@/components/LoadingSpinner';
import SEOHead from '@/components/SEOHead';

interface Blog {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content_html: string;
  thumbnail_url: string | null;
  read_time_minutes: number;
  created_at: string;
  status: string;
  creator_name: string | null;
  creator_slug: string | null;
  creator_channel_url: string | null;
  creator_profile_image: string | null;
  creator_short_bio: string | null;
  creator_subscribers: number | null;
  featured_youtube_url: string | null;
  hero_video_url: string | null;
}

const BlogPost = () => {
  const { slug, creatorSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchBlogPost();
    }
  }, [slug, creatorSlug]);

  useEffect(() => {
    if (blog) {
      fetchRelatedBlogs();
    }
  }, [blog?.id]);

  const fetchBlogPost = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      setBlog(data);
    } catch (error) {
      console.error('Error fetching blog post:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blog post',
        variant: 'destructive',
      });
      navigate('/blogs');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedBlogs = async () => {
    if (!blog) return; // Wait for blog to be loaded
    
    try {
      // Always filter by the current post's author to show only their posts
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .eq('creator_slug', blog.creator_slug)
        .neq('slug', slug)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRelatedBlogs(data || []);
    } catch (error) {
      console.error('Error fetching related blogs:', error);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubscribing(true);
    try {
      const { error } = await supabase
        .from('email_subscriptions')
        .insert([{ email }]);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already subscribed',
            description: 'This email is already subscribed to our newsletter',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Subscribed!',
          description: 'You\'ve successfully subscribed to our newsletter',
        });
        setEmail('');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Error',
        description: 'Failed to subscribe. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleSave = () => {
    if (!blog) return;
    const savedBlogs = JSON.parse(localStorage.getItem('savedBlogs') || '[]');
    if (savedBlogs.includes(blog.id)) {
      toast({
        title: 'Already saved',
        description: 'This blog is already in your saved list',
      });
    } else {
      savedBlogs.push(blog.id);
      localStorage.setItem('savedBlogs', JSON.stringify(savedBlogs));
      toast({
        title: 'Saved!',
        description: `"${blog.title}" has been saved`,
      });
    }
  };

  const handleShare = async () => {
    if (!blog) return;
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: blog.title,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied!',
        description: 'Blog link has been copied to clipboard',
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!blog) return null;

  const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const blogDescription = blog.subtitle || stripHtml(blog.content_html).slice(0, 160);
  const blogUrl = `https://www.swishview.com/blogs/${blog.creator_slug}/${blog.slug}`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: blog.title,
    description: blogDescription,
    image: blog.thumbnail_url || 'https://www.swishview.com/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png',
    datePublished: blog.created_at,
    dateModified: blog.created_at,
    author: {
      '@type': 'Person',
      name: blog.creator_name || 'Swish View',
      url: blog.creator_slug ? `https://www.swishview.com/blogs/${blog.creator_slug}` : undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Swish View',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.swishview.com/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png',
      },
    },
    mainEntityOfPage: blogUrl,
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`${blog.title}${blog.creator_name ? ` | ${blog.creator_name}` : ''} | Swish View`}
        description={blogDescription}
        keywords={`${blog.creator_name || ''}, ${blog.title}, swishview, youtube creator blog`}
        image={blog.thumbnail_url || undefined}
        url={blogUrl}
        canonical={blogUrl}
        type="article"
        author={blog.creator_name || undefined}
        publishedTime={blog.created_at}
        modifiedTime={blog.created_at}
        structuredData={articleSchema}
      />
      {/* <Navbar /> */}
      <div className="pt-4 sm:navbar-offset">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="mb-4 sm:mb-6 -ml-2 sm:-ml-4"
            onClick={() => navigate(creatorSlug ? `/blogs/${creatorSlug}` : '/blogs')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {creatorSlug ? `Back to ${blog.creator_name || 'Creator'}` : 'Back to Blog'}
          </Button>

          <div className="max-w-4xl">
            {/* Title */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4" style={{ fontFamily: 'Brockmann, serif' }}>
              {blog.title}
            </h1>

            {/* Subtitle */}
            {blog.subtitle && (
              <p className="text-base sm:text-xl text-muted-foreground mb-4 sm:mb-6">
                {blog.subtitle}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <img 
                  src="/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png" 
                  alt="SwishView" 
                  className="h-6 sm:h-8 w-auto object-contain"
                />
                <span className="font-medium text-foreground">SwishView Team</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{format(new Date(blog.created_at), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{blog.read_time_minutes} min read</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={handleSave}
              >
                <Bookmark className="w-4 h-4" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
            {/* Article Content */}
            <div className="lg:col-span-2">
              {blog.featured_youtube_url && (
                <div className="mb-6 sm:mb-8">
                  <YouTubeEmbed url={blog.featured_youtube_url} title={blog.title} />
                </div>
              )}
              
              <div 
                className="prose prose-sm sm:prose-lg max-w-none prose-headings:font-bold prose-h1:text-2xl sm:prose-h1:text-4xl prose-h2:text-xl sm:prose-h2:text-3xl prose-h3:text-lg sm:prose-h3:text-2xl prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-a:text-primary prose-img:rounded-lg prose-video:rounded-lg prose-video:w-full"
                dangerouslySetInnerHTML={{ __html: processYouTubeEmbeds(blog.content_html) }}
                style={{ fontFamily: 'Brockmann, serif' }}
              />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Other Posts by Creator */}
                {relatedBlogs.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Brockmann, serif' }}>
                      More from {blog.creator_name || 'this creator'}
                    </h3>
                    <div className="space-y-4">
                      {relatedBlogs.map((relatedBlog) => (
                        <div
                          key={relatedBlog.id}
                          className="group cursor-pointer"
                          onClick={() => navigate(creatorSlug ? `/blogs/${creatorSlug}/${relatedBlog.slug}` : `/blogs/${relatedBlog.slug}`)}
                        >
                          {relatedBlog.thumbnail_url && (
                            <img
                              src={relatedBlog.thumbnail_url}
                              alt={relatedBlog.title}
                              className="w-full h-32 object-cover rounded-lg mb-2 group-hover:opacity-90 transition-opacity"
                            />
                          )}
                          <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 text-sm mb-1">
                            {relatedBlog.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{relatedBlog.read_time_minutes} min read</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {blog.creator_slug && relatedBlogs.length > 0 && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => navigate(`/blogs/${blog.creator_slug}`)}
                      >
                        View all posts by {blog.creator_name}
                      </Button>
                    )}
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BlogPost;
