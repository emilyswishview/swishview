import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Youtube } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '@/components/LoadingSpinner';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content_html: string;
  creator_name: string | null;
  creator_slug: string | null;
  additional_videos: any;
  canonical_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  hero_video_url: string | null;
  featured_youtube_url: string | null;
}

interface Video {
  youtube_url: string;
  title: string;
  slug: string;
  short_description?: string;
  thumbnail_url?: string;
}

const BlogVideoPage = () => {
  const { creatorSlug, postSlug, videoSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postSlug && videoSlug) {
      fetchBlogPostAndVideo();
    }
  }, [postSlug, videoSlug]);

  const fetchBlogPostAndVideo = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('slug', postSlug)
        .eq('status', 'published')
        .single();

      if (error) throw error;

      if (data) {
        setPost(data);
        const videos: Video[] = data.additional_videos || [];
        setAllVideos(videos);
        
        const video = videos.find((v: Video) => v.slug === videoSlug);
        if (video) {
          setCurrentVideo(video);
        } else {
          toast({
            title: 'Video not found',
            description: 'The requested video could not be found',
            variant: 'destructive',
          });
          navigate(`/blogs/${creatorSlug}/${postSlug}`);
        }
      }
    } catch (error) {
      console.error('Error fetching blog post:', error);
      toast({
        title: 'Error',
        description: 'Failed to load video',
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

  if (!post || !currentVideo) return null;

  const canonicalUrl = post.canonical_url || `https://swishview.com/blogs/${creatorSlug}/${postSlug}`;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{currentVideo.title} - {post.creator_name || 'SwishView'}</title>
        <meta name="description" content={currentVideo.short_description || post.subtitle || ''} />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            "name": currentVideo.title,
            "description": currentVideo.short_description || '',
            "thumbnailUrl": currentVideo.thumbnail_url || post.thumbnail_url || '',
            "uploadDate": post.created_at,
            "contentUrl": currentVideo.youtube_url,
          })}
        </script>
      </Helmet>

      <Navbar />
      <div className="navbar-offset">
        {/* Breadcrumb */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/blogs')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Blogs
            </button>
            <span className="text-muted-foreground">›</span>
            <button
              onClick={() => navigate(`/blogs/${creatorSlug}`)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {post.creator_name}
            </button>
            <span className="text-muted-foreground">›</span>
            <button
              onClick={() => navigate(`/blogs/${creatorSlug}/${postSlug}`)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {post.title}
            </button>
            <span className="text-muted-foreground">›</span>
            <span className="text-foreground">{currentVideo.title}</span>
          </div>
        </div>

        {/* Video Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-6 space-y-6">
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Brockmann, serif' }}>
              {currentVideo.title}
            </h1>

            {currentVideo.short_description && (
              <p className="text-lg text-gray-600">{currentVideo.short_description}</p>
            )}

            <YouTubeEmbed url={currentVideo.youtube_url} title={currentVideo.title} />

            {allVideos.length > 1 && (
              <div className="pt-6 border-t">
                <h2 className="text-xl font-bold mb-4">More Videos in This Series</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allVideos
                    .filter((v) => v.slug !== videoSlug)
                    .map((video) => (
                      <Card
                        key={video.slug}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => navigate(`/blogs/${creatorSlug}/${postSlug}/${video.slug}`)}
                      >
                        <div className="p-4 flex items-center gap-3">
                          <Youtube className="w-8 h-8 text-primary flex-shrink-0" />
                          <div>
                            <h3 className="font-semibold line-clamp-1">{video.title}</h3>
                            {video.short_description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {video.short_description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigate(`/blogs/${creatorSlug}/${postSlug}`)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Main Post
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BlogVideoPage;
