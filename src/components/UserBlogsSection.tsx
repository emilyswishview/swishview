import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PenSquare, ExternalLink, Sparkles, Loader2, Gift, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  userId: string;
  userEmail: string | null | undefined;
}

interface BlogPost {
  id: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  hero_image_url: string | null;
  slug: string;
  creator_slug: string | null;
  status: string;
  created_at: string;
  views_count: number | null;
  read_time_minutes: number | null;
}

const UserBlogsSection = ({ userId, userEmail }: Props) => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    fetchBlogs();
    checkExistingRequest();
  }, [userId, userEmail]);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      if (!userEmail) {
        setBlogs([]);
        return;
      }
      const { data: authors } = await supabase
        .from('blog_authors')
        .select('id')
        .ilike('email', userEmail);

      const authorIds = (authors || []).map((a) => a.id);
      if (authorIds.length === 0) {
        setBlogs([]);
        return;
      }

      const { data: posts, error } = await supabase
        .from('blog_posts')
        .select('id, title, subtitle, thumbnail_url, hero_image_url, slug, creator_slug, status, created_at, views_count, read_time_minutes')
        .in('author_id', authorIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(posts || []);
    } catch (e: any) {
      console.error('Error fetching user blogs:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRequest = async () => {
    try {
      const { data } = await supabase
        .from('user_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('request_type', 'blog_request')
        .in('status', ['pending', 'in_progress'])
        .maybeSingle();
      setAlreadyRequested(!!data);
    } catch (e) {
      // ignore
    }
  };

  const handleRequestBlog = async () => {
    if (!userId) return;
    setRequesting(true);
    try {
      // Get user profile for richer message
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, channel_name, channel_url')
        .eq('id', userId)
        .single();

      const subject = 'Free Blog Request';
      const message = `${profile?.full_name || profile?.email || 'A user'} has requested a free blog post about their channel.\n\nChannel: ${profile?.channel_name || 'N/A'}\nChannel URL: ${profile?.channel_url || 'N/A'}\nEmail: ${profile?.email || 'N/A'}`;

      const { data: requestData, error: insertError } = await supabase
        .from('user_requests')
        .insert({
          user_id: userId,
          subject,
          message,
          request_type: 'blog_request',
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Notify admins via existing edge function (best-effort, do not block)
      try {
        await supabase.functions.invoke('notify-user-activity', {
          body: {
            userId,
            subject,
            message,
            requestType: 'blog_request',
            requestId: requestData?.id,
          },
        });
      } catch (e) {
        console.warn('notify-user-activity failed (non-blocking):', e);
      }

      setAlreadyRequested(true);
      toast({
        title: 'Request sent! 🎉',
        description: "Your free blog request was sent to our team. We'll be in touch shortly via email.",
      });
    } catch (e: any) {
      console.error('Blog request error:', e);
      toast({
        title: 'Could not send request',
        description: e.message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state — show request CTA
  if (blogs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-0 shadow-elegant bg-gradient-to-br from-orange-50 via-yellow-50 to-white">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <Gift className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-gray-900">
              Get a Free Blog Post About Your Channel
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Our editorial team writes a high-quality, SEO-optimised feature about your channel — completely free for SwishView clients. Get more reach, backlinks, and discoverability.
            </p>

            {alreadyRequested ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-100 text-green-700 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                Request received — we'll email you soon
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleRequestBlog}
                disabled={requesting}
                className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-8 shadow-md"
              >
                {requesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending request...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Request my free blog
                  </>
                )}
              </Button>
            )}

            <p className="text-xs text-muted-foreground mt-6">
              No catch — we'll review your channel and reach out by email within 1-2 business days.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <PenSquare className="h-6 w-6 sm:h-8 sm:w-8" />
            Your Blogs
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            {blogs.length} blog{blogs.length === 1 ? '' : 's'} published about your channel
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {blogs.map((blog) => {
          const img = blog.thumbnail_url || blog.hero_image_url;
          const url = `/blogs/${blog.creator_slug}/${blog.slug}`;
          const isPublished = blog.status === 'published';
          return (
            <Card
              key={blog.id}
              className="border-0 shadow-elegant bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all overflow-hidden group"
            >
              <a
                href={isPublished ? url : '#'}
                target={isPublished ? '_blank' : undefined}
                rel={isPublished ? 'noopener noreferrer' : undefined}
                className={!isPublished ? 'pointer-events-none opacity-70' : ''}
              >
                {img ? (
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={img}
                      alt={blog.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-orange-100 to-yellow-50 flex items-center justify-center">
                    <PenSquare className="h-10 w-10 text-orange-400" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                        isPublished
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isPublished ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-muted-foreground">
                      {format(new Date(blog.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                    {blog.title}
                  </h3>
                  {blog.subtitle && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {blog.subtitle}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>{(blog.views_count || 0).toLocaleString()} views</span>
                    {isPublished && (
                      <span className="flex items-center gap-1 text-primary">
                        Read <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </CardContent>
              </a>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default UserBlogsSection;
