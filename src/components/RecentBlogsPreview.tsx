import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PenSquare, ArrowRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  userEmail: string | null | undefined;
  onViewAll?: () => void;
}

interface BlogPreview {
  id: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  hero_image_url: string | null;
  slug: string;
  creator_slug: string | null;
  created_at: string;
  status: string;
}

const RecentBlogsPreview = ({ userEmail, onViewAll }: Props) => {
  const [blogs, setBlogs] = useState<BlogPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    const fetchBlogs = async () => {
      try {
        // Find creators that match this user's email
        const { data: authors } = await supabase
          .from('blog_authors')
          .select('id')
          .ilike('email', userEmail);

        const authorIds = (authors || []).map((a) => a.id);
        if (authorIds.length === 0) {
          setBlogs([]);
          return;
        }

        const { data: posts } = await supabase
          .from('blog_posts')
          .select('id, title, subtitle, thumbnail_url, hero_image_url, slug, creator_slug, created_at, status')
          .in('author_id', authorIds)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(3);

        setBlogs(posts || []);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, [userEmail]);

  if (loading || blogs.length === 0) return null;

  return (
    <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm mt-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PenSquare className="h-5 w-5 text-primary" />
            Your Recent Blogs
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Latest stories we've published about your channel
          </p>
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="rounded-full">
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => {
            const img = blog.thumbnail_url || blog.hero_image_url;
            const url = `/blogs/${blog.creator_slug}/${blog.slug}`;
            return (
              <a
                key={blog.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-gray-100 hover:border-primary/40 hover:shadow-md transition-all overflow-hidden bg-white"
              >
                {img ? (
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={img}
                      alt={blog.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-orange-100 to-yellow-50 flex items-center justify-center">
                    <PenSquare className="h-8 w-8 text-orange-400" />
                  </div>
                )}
                <div className="p-3">
                  <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {blog.title}
                  </h4>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{format(new Date(blog.created_at), 'MMM d, yyyy')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentBlogsPreview;
