import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PenSquare, Trash2, Eye, Edit, ExternalLink, UserPlus, ArrowLeft } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import BlogEditor from './BlogEditor';
import CreatorForm from './CreatorForm';

interface Creator {
  id: string;
  name: string;
  bio: string | null;
  email: string | null;
  profile_image_url: string | null;
  slug: string | null;
  channel_url: string | null;
  subscribers: number | null;
  short_bio: string | null;
  banner_url: string | null;
  page_title: string | null;
  about_content: string | null;
  created_at: string;
}

interface Blog {
  id: string;
  title: string;
  subtitle: string | null;
  content_html: string;
  thumbnail_url: string | null;
  status: string;
  read_time_minutes: number;
  author_id: string | null;
  created_at: string;
  slug: string;
  featured_youtube_url: string | null;
  hero_image_url: string | null;
  hero_video_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  meta_robots: string | null;
  cta_text: string | null;
  cta_url: string | null;
  cta_style: string | null;
  allow_comments: boolean;
  sitemap_include: boolean;
  create_child_video_pages: boolean;
  publish_at: string | null;
}

interface BlogsSectionProps {
  initialFilterEmail?: string | null;
}

const BlogsSection = ({ initialFilterEmail }: BlogsSectionProps = {}) => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorFormOpen, setIsCreatorFormOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
  const [isBlogDialogOpen, setIsBlogDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [emailFilter, setEmailFilter] = useState<string>(initialFilterEmail || '');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    content_html: '',
    thumbnail_url: '',
    status: 'draft',
    read_time_minutes: 5,
    featured_youtube_url: '',
    hero_image_url: '',
    hero_video_url: '',
    seo_title: '',
    seo_description: '',
    focus_keyword: '',
    canonical_url: '',
    meta_robots: 'index, follow',
    cta_text: 'Start Your Campaign',
    cta_url: '/create-campaign',
    cta_style: 'button',
    allow_comments: true,
    sitemap_include: true,
    create_child_video_pages: false,
    publish_at: null,
    created_at: '' as string | null,
  });

  useEffect(() => {
    fetchCreators();
  }, []);

  useEffect(() => {
    if (selectedCreator) {
      fetchBlogsForCreator(selectedCreator.id);
    }
  }, [selectedCreator]);

  const fetchCreators = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_authors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreators(data || []);
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast({
        title: 'Error',
        description: 'Failed to load creators',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogsForCreator = async (creatorId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('author_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blogs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCreatorErrorMessage = (error: any): string => {
    const msg = error?.message || error?.details || '';
    if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
      if (msg.includes('slug')) return 'A creator with this name already exists. Please use a different name.';
      if (msg.includes('email')) return 'A creator with this email already exists.';
      return 'A creator with these details already exists. Please check the name or email.';
    }
    if (msg.includes('violates row-level security')) return 'You don\'t have permission to perform this action. Please try logging in again.';
    if (msg.includes('null value in column') || msg.includes('not-null constraint')) {
      const colMatch = msg.match(/column "(\w+)"/);
      return `The "${colMatch?.[1] || 'required'}" field is missing. Please fill in all required fields.`;
    }
    if (msg.includes('network') || msg.includes('fetch')) return 'Network error — please check your internet connection and try again.';
    return `Something went wrong while saving the creator. Please try again. (${msg || 'Unknown error'})`;
  };

  const handleSaveCreator = async (data: Partial<Creator>) => {
    try {
      // Validate required fields
      if (!data.name || !data.name.trim()) {
        throw new Error('Creator name is required.');
      }

      if (editingCreator) {
        const { data: updatedCreator, error } = await supabase
          .from('blog_authors')
          .update(data)
          .eq('id', editingCreator.id)
          .select('*')
          .single();

        if (error) throw error;

        if (selectedCreator?.id === editingCreator.id) {
          setSelectedCreator(updatedCreator);
        }

        // Sync creator data to all their blog posts
        const { error: postsError } = await supabase
          .from('blog_posts')
          .update({
            creator_name: updatedCreator.name,
            creator_slug: updatedCreator.slug,
            creator_profile_image: updatedCreator.profile_image_url,
            creator_short_bio: updatedCreator.short_bio || updatedCreator.bio,
            creator_channel_url: updatedCreator.channel_url,
            creator_subscribers: updatedCreator.subscribers,
          })
          .eq('author_id', editingCreator.id);

        if (postsError) {
          console.error('Error syncing posts:', postsError);
          toast({
            title: 'Partial Success',
            description: 'Creator was updated, but some blog posts may not reflect the latest creator info. Try editing the creator again.',
          });
        } else {
          toast({
            title: 'Success',
            description: 'Creator and all blog posts updated successfully',
          });
        }
      } else {
        const { error } = await supabase.from('blog_authors').insert([data as any]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Creator created successfully',
        });
      }

      setEditingCreator(null);
      fetchCreators();
    } catch (error: any) {
      console.error('Error saving creator:', error);
      const friendlyMsg = getCreatorErrorMessage(error);
      toast({
        title: editingCreator ? 'Could not update creator' : 'Could not add creator',
        description: friendlyMsg,
        variant: 'destructive',
      });
      // Re-throw so the CreatorForm knows it failed and keeps the dialog open
      throw error;
    }
  };

  const handleDeleteCreator = async (id: string) => {
    if (!confirm('Are you sure? This will also delete all blog posts by this creator.')) return;

    try {
      // First delete all blog posts by this creator (to avoid FK constraint violation)
      const { error: postsError } = await supabase
        .from('blog_posts')
        .delete()
        .eq('author_id', id);

      if (postsError) throw postsError;

      // Then delete the creator
      const { error } = await supabase.from('blog_authors').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Creator and their blog posts deleted successfully',
      });
      fetchCreators();
      if (selectedCreator?.id === id) {
        setSelectedCreator(null);
      }
    } catch (error) {
      console.error('Error deleting creator:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete creator',
        variant: 'destructive',
      });
    }
  };

  const getBlogErrorMessage = (error: any): string => {
    const msg = error?.message || error?.details || '';
    if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
      if (msg.includes('slug')) return 'A blog post with this title (or a very similar one) already exists. Please change the title slightly.';
      return 'A blog post with these details already exists.';
    }
    if (msg.includes('violates row-level security')) return 'You don\'t have permission to save this blog. Please try logging in again.';
    if (msg.includes('null value in column') || msg.includes('not-null constraint')) {
      const colMatch = msg.match(/column "(\w+)"/);
      const col = colMatch?.[1];
      if (col === 'content_html') return 'Blog content is required. Please add some content before saving.';
      if (col === 'title') return 'Blog title is required.';
      return `The "${col || 'required'}" field is missing. Please fill in all required fields.`;
    }
    if (msg.includes('value too long')) return 'One of the fields has too much text. Please shorten it and try again.';
    if (msg.includes('network') || msg.includes('fetch')) return 'Network error — please check your internet connection and try again.';
    return `Something went wrong while saving the blog. Please try again. (${msg || 'Unknown error'})`;
  };

  const handleSubmitBlog = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCreator) {
      toast({
        title: 'No Creator Selected',
        description: 'Please go back and select a creator before creating a blog post.',
        variant: 'destructive',
      });
      return;
    }

    // Validate required fields with friendly messages
    if (!formData.title.trim()) {
      toast({ title: 'Title Required', description: 'Please enter a title for your blog post.', variant: 'destructive' });
      return;
    }
    if (!formData.content_html || formData.content_html.replace(/<[^>]*>/g, '').trim().length === 0) {
      toast({ title: 'Content Required', description: 'Please add some content to the blog post before saving.', variant: 'destructive' });
      return;
    }

    try {
      // Generate a unique slug
      let slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // For new posts, check slug uniqueness and append a suffix if needed
      if (!editingBlog) {
        const { data: existingSlugs } = await supabase
          .from('blog_posts')
          .select('slug')
          .like('slug', `${slug}%`);

        if (existingSlugs && existingSlugs.length > 0) {
          const slugSet = new Set(existingSlugs.map(s => s.slug));
          if (slugSet.has(slug)) {
            let counter = 1;
            while (slugSet.has(`${slug}-${counter}`)) counter++;
            slug = `${slug}-${counter}`;
          }
        }
      }

      // Convert empty strings to null for nullable DB columns
      const cleanFormData = { ...formData };
      const nullableFields = [
        'subtitle', 'thumbnail_url', 'featured_youtube_url', 'hero_image_url',
        'hero_video_url', 'seo_title', 'seo_description', 'focus_keyword',
        'canonical_url', 'publish_at'
      ] as const;
      
      for (const field of nullableFields) {
        if ((cleanFormData as any)[field] === '') {
          (cleanFormData as any)[field] = null;
        }
      }

      // Handle custom created_at: only include if user set it
      const customCreatedAt = cleanFormData.created_at && String(cleanFormData.created_at).trim() !== ''
        ? new Date(cleanFormData.created_at as string).toISOString()
        : null;
      delete (cleanFormData as any).created_at;

      const dataToSave: any = {
        ...cleanFormData,
        slug,
        author_id: selectedCreator.id,
        creator_name: selectedCreator.name,
        creator_slug: selectedCreator.slug,
        creator_profile_image: selectedCreator.profile_image_url,
        creator_short_bio: selectedCreator.short_bio || selectedCreator.bio,
        creator_channel_url: selectedCreator.channel_url,
        creator_subscribers: selectedCreator.subscribers,
        published_at: cleanFormData.status === 'published' ? new Date().toISOString() : null,
      };
      if (customCreatedAt) {
        dataToSave.created_at = customCreatedAt;
      }

      if (editingBlog) {
        const { error } = await supabase
          .from('blog_posts')
          .update(dataToSave)
          .eq('id', editingBlog.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Blog post updated successfully',
        });
      } else {
        const { error } = await supabase.from('blog_posts').insert([dataToSave]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Blog post created successfully',
        });
      }

      resetBlogForm();
      setIsBlogDialogOpen(false);
      fetchBlogsForCreator(selectedCreator.id);
    } catch (error: any) {
      console.error('Error saving blog:', error);
      const friendlyMsg = getBlogErrorMessage(error);
      toast({
        title: editingBlog ? 'Could not update blog post' : 'Could not create blog post',
        description: friendlyMsg,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Blog post deleted successfully',
      });
      if (selectedCreator) {
        fetchBlogsForCreator(selectedCreator.id);
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete blog post',
        variant: 'destructive',
      });
    }
  };

  const handleEditBlog = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      subtitle: blog.subtitle || '',
      content_html: blog.content_html,
      thumbnail_url: blog.thumbnail_url || '',
      status: blog.status,
      read_time_minutes: blog.read_time_minutes,
      featured_youtube_url: blog.featured_youtube_url || '',
      hero_image_url: blog.hero_image_url || '',
      hero_video_url: blog.hero_video_url || '',
      seo_title: blog.seo_title || '',
      seo_description: blog.seo_description || '',
      focus_keyword: blog.focus_keyword || '',
      canonical_url: blog.canonical_url || '',
      meta_robots: blog.meta_robots || 'index, follow',
      cta_text: blog.cta_text || 'Start Your Campaign',
      cta_url: blog.cta_url || '/create-campaign',
      cta_style: blog.cta_style || 'button',
      allow_comments: blog.allow_comments !== false,
      sitemap_include: blog.sitemap_include !== false,
      create_child_video_pages: blog.create_child_video_pages || false,
      publish_at: blog.publish_at || null,
      created_at: blog.created_at ? new Date(blog.created_at).toISOString().slice(0, 16) : '',
    });
    setIsBlogDialogOpen(true);
  };

  const handleTogglePublish = async (blog: Blog) => {
    try {
      const newStatus = blog.status === 'published' ? 'draft' : 'published';
      const updateData: { status: string; published_at?: string | null } = { status: newStatus };
      
      // Set published_at when publishing, clear it when unpublishing
      if (newStatus === 'published') {
        updateData.published_at = new Date().toISOString();
      } else {
        updateData.published_at = null;
      }
      
      const { error } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', blog.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Blog post ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`,
      });
      if (selectedCreator) {
        fetchBlogsForCreator(selectedCreator.id);
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update publish status',
        variant: 'destructive',
      });
    }
  };

  const resetBlogForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      content_html: '',
      thumbnail_url: '',
      status: 'draft',
      read_time_minutes: 5,
      featured_youtube_url: '',
      hero_image_url: '',
      hero_video_url: '',
      seo_title: '',
      seo_description: '',
      focus_keyword: '',
      canonical_url: '',
      meta_robots: 'index, follow',
      cta_text: 'Start Your Campaign',
      cta_url: '/create-campaign',
      cta_style: 'button',
      allow_comments: true,
      sitemap_include: true,
      create_child_video_pages: false,
      publish_at: null,
      created_at: '',
    });
    setEditingBlog(null);
  };

  // Apply email filter (case-insensitive contains)
  const filteredCreators = emailFilter.trim()
    ? creators.filter((c) =>
        (c.email || '').toLowerCase().includes(emailFilter.trim().toLowerCase())
      )
    : creators;

  // Creators View
  if (!selectedCreator) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight">Blog Management - Creators</h2>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingCreator(null);
              setIsCreatorFormOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4" />
            Add Creator
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle>All Creators</CardTitle>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={emailFilter}
                  onChange={(e) => setEmailFilter(e.target.value)}
                  placeholder="Filter by email..."
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-orange-500 min-w-[220px]"
                />
                {emailFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setEmailFilter('')}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading creators...</div>
            ) : filteredCreators.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {emailFilter
                  ? `No creators found matching "${emailFilter}". Add a creator with this email to start writing blogs for this user.`
                  : 'No creators yet. Add your first creator!'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreators.map((creator) => (
                    <TableRow
                      key={creator.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCreator(creator)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {creator.profile_image_url && (
                            <img
                              src={creator.profile_image_url}
                              alt={creator.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <div className="font-semibold">{creator.name}</div>
                            {creator.bio && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {creator.bio}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{creator.email || '—'}</TableCell>
                      <TableCell>
                        {format(new Date(creator.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCreator(creator);
                              setIsCreatorFormOpen(true);
                            }}
                            title="Edit creator"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCreator(creator.id)}
                            title="Delete creator"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <CreatorForm
          key={`${editingCreator?.id ?? 'new-creator'}-${isCreatorFormOpen ? 'open' : 'closed'}`}
          creator={editingCreator}
          isOpen={isCreatorFormOpen}
          onClose={() => {
            setIsCreatorFormOpen(false);
            setEditingCreator(null);
          }}
          onSave={handleSaveCreator}
        />
      </div>
    );
  }

  // Blogs View for Selected Creator
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCreator(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Creators
          </Button>
          <div className="flex items-center gap-3">
            {selectedCreator.profile_image_url && (
              <img
                src={selectedCreator.profile_image_url}
                alt={selectedCreator.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold">{selectedCreator.name}</h2>
              <p className="text-sm text-muted-foreground">Blog Posts</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingCreator(selectedCreator);
                setIsCreatorFormOpen(true);
              }}
              title="Edit creator info"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            resetBlogForm();
            // Auto-populate creator fields from selected creator
            if (selectedCreator) {
              setFormData({
                title: '',
                subtitle: '',
                content_html: '',
                thumbnail_url: '',
                status: 'draft',
                read_time_minutes: 5,
                featured_youtube_url: '',
                hero_image_url: '',
                hero_video_url: '',
                seo_title: '',
                seo_description: '',
                focus_keyword: '',
                canonical_url: '',
                meta_robots: 'index, follow',
                cta_text: 'Start Your Campaign',
                cta_url: '/create-campaign',
                cta_style: 'button',
                allow_comments: true,
                sitemap_include: true,
                create_child_video_pages: false,
                publish_at: null,
                created_at: '',
              });
            }
            setIsBlogDialogOpen(true);
          }}
        >
          <PenSquare className="w-4 h-4" />
          Create New Post
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blog Posts by {selectedCreator.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading blogs...</div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No blog posts yet. Create the first post for this creator!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogs.map((blog) => {
                  const blogUrl = `/blogs/${selectedCreator.slug}/${blog.slug}`;

                  return (
                    <TableRow key={blog.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate">{blog.title}</div>
                        {blog.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {blog.subtitle}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            blog.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {blog.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(blog.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {blog.status === 'published' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(blogUrl, '_blank')}
                              title="View post"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePublish(blog)}
                            title={blog.status === 'published' ? 'Unpublish' : 'Publish'}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditBlog(blog)}
                            title="Edit post"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBlog(blog.id)}
                            title="Delete post"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isBlogDialogOpen} onOpenChange={setIsBlogDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[75vh] pr-4">
            <BlogEditor
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmitBlog}
              onCancel={() => {
                setIsBlogDialogOpen(false);
                resetBlogForm();
              }}
              isEditing={!!editingBlog}
              selectedCreator={selectedCreator}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <CreatorForm
        key={`${editingCreator?.id ?? 'new-creator'}-${isCreatorFormOpen ? 'open' : 'closed'}`}
        creator={editingCreator}
        isOpen={isCreatorFormOpen}
        onClose={() => {
          setIsCreatorFormOpen(false);
          setEditingCreator(null);
        }}
        onSave={handleSaveCreator}
      />
    </div>
  );
};

export default BlogsSection;
