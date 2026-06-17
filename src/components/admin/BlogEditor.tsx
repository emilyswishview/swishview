import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Save, X } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { processYouTubeEmbeds } from '@/utils/processYouTubeEmbeds';
import YouTubeEmbed from '@/components/YouTubeEmbed';

interface BlogEditorProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  selectedCreator?: {
    id: string;
    name: string;
    bio: string | null;
    email: string | null;
    profile_image_url: string | null;
  };
}

const BlogEditor = ({ formData, setFormData, onSubmit, onCancel, isEditing, selectedCreator }: BlogEditorProps) => {
  const [showPreview, setShowPreview] = useState(false);

  if (showPreview) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-4">
          <h3 className="text-lg font-semibold">Preview</h3>
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            <X className="w-4 h-4 mr-2" />
            Close Preview
          </Button>
        </div>
        <ScrollArea className="h-[70vh]">
          <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-sm">
            {/* Preview Content */}
            <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Brockmann, serif' }}>
              {formData.title || 'Blog Title'}
            </h1>
            {formData.subtitle && (
              <p className="text-xl text-gray-600 mb-6">{formData.subtitle}</p>
            )}
            
            {/* Creator Info */}
            {formData.creator_name && (
              <div className="flex items-center gap-3 mb-6 pb-6 border-b">
                {formData.creator_profile_image && (
                  <img
                    src={formData.creator_profile_image}
                    alt={formData.creator_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold">{formData.creator_name}</p>
                  {formData.creator_subscribers > 0 && (
                    <p className="text-sm text-gray-500">
                      {formData.creator_subscribers.toLocaleString()} subscribers
                    </p>
                  )}
                </div>
              </div>
            )}

            {formData.thumbnail_url && (
              <img
                src={formData.thumbnail_url}
                alt="Thumbnail"
                className="w-full h-auto rounded-lg mb-6"
              />
            )}

            {formData.hero_video_url && (
              <div className="mb-6">
                <YouTubeEmbed url={formData.hero_video_url} title="Hero Video" />
              </div>
            )}

            {formData.featured_youtube_url && (
              <div className="mb-6">
                <YouTubeEmbed url={formData.featured_youtube_url} title="Featured Video" />
              </div>
            )}

            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: formData.content_html 
                  ? processYouTubeEmbeds(formData.content_html)
                  : '<p>Content will appear here...</p>' 
              }}
            />

            {/* CTA Preview */}
            {formData.cta_text && (
              <div className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-orange-500/10 rounded-lg text-center">
                <Button className="gap-2">
                  {formData.cta_text}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" onClick={() => setShowPreview(true)}>
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Update' : 'Create'} Post
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="creator">Creator</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="cta">CTA</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter an engaging title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Textarea
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="A brief description or hook"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <RichTextEditor
                  value={formData.content_html}
                  onChange={(value) => setFormData({ ...formData, content_html: value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="read_time">Read Time (minutes)</Label>
                  <Input
                    id="read_time"
                    type="number"
                    min="1"
                    value={formData.read_time_minutes}
                    onChange={(e) => setFormData({ ...formData, read_time_minutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail URL</Label>
                <Input
                  id="thumbnail"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                />
                {formData.thumbnail_url && (
                  <img
                    src={formData.thumbnail_url}
                    alt="Thumbnail preview"
                    className="mt-2 h-48 w-auto object-cover rounded-lg"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="featured_youtube">Featured YouTube URL</Label>
                <Input
                  id="featured_youtube"
                  value={formData.featured_youtube_url}
                  onChange={(e) => setFormData({ ...formData, featured_youtube_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
                <p className="text-sm text-muted-foreground">
                  Main video that will be featured in the blog post
                </p>
                {formData.featured_youtube_url && (() => {
                  const patterns = [
                    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
                    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
                    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
                  ];
                  let videoId: string | null = null;
                  for (const p of patterns) {
                    const m = formData.featured_youtube_url.match(p);
                    if (m) { videoId = m[1]; break; }
                  }
                  if (!videoId) return null;
                  return (
                    <div className="mt-2 space-y-2">
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                        alt="YouTube thumbnail preview"
                        className="h-48 w-auto object-cover rounded-lg"
                      />
                      <p className="text-xs text-muted-foreground">Thumbnail preview for video: {videoId}</p>
                    </div>
                  );
                })()}
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="hero_image">Hero Image URL</Label>
                <Input
                  id="hero_image"
                  value={formData.hero_image_url}
                  onChange={(e) => setFormData({ ...formData, hero_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div> */}

              {/* <div className="space-y-2">
                <Label htmlFor="hero_video">Hero Video URL</Label>
                <Input
                  id="hero_video"
                  value={formData.hero_video_url}
                  onChange={(e) => setFormData({ ...formData, hero_video_url: e.target.value })}
                  placeholder="https://..."
                />
              </div> */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Creator Tab - Show selected creator info */}
        <TabsContent value="creator" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Selected Creator</p>
                <div className="flex items-center gap-3">
                  {selectedCreator?.profile_image_url && (
                    <img
                      src={selectedCreator.profile_image_url}
                      alt={selectedCreator.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold">{selectedCreator?.name}</p>
                    {selectedCreator?.bio && (
                      <p className="text-sm text-muted-foreground">{selectedCreator.bio}</p>
                    )}
                    {selectedCreator?.email && (
                      <p className="text-xs text-muted-foreground">{selectedCreator.email}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Creator information is managed in the Creators section. This blog post will be automatically linked to this creator.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title">SEO Title</Label>
                <Input
                  id="seo_title"
                  value={formData.seo_title}
                  onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                  placeholder="Optimized title for search engines"
                  maxLength={99}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.seo_title?.length || 0}/99 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo_description">SEO Description</Label>
                <Textarea
                  id="seo_description"
                  value={formData.seo_description}
                  onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                  placeholder="Brief description for search results"
                  rows={3}
                  maxLength={999}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.seo_description?.length || 0}/999 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="focus_keyword">Focus Keyword</Label>
                <Input
                  id="focus_keyword"
                  value={formData.focus_keyword}
                  onChange={(e) => setFormData({ ...formData, focus_keyword: e.target.value })}
                  placeholder="main keyword"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="canonical_url">Canonical URL</Label>
                <Input
                  id="canonical_url"
                  value={formData.canonical_url}
                  onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_robots">Meta Robots</Label>
                <Input
                  id="meta_robots"
                  value={formData.meta_robots}
                  onChange={(e) => setFormData({ ...formData, meta_robots: e.target.value })}
                  placeholder="index, follow"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CTA Tab */}
        <TabsContent value="cta" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cta_text">CTA Text</Label>
                <Input
                  id="cta_text"
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  placeholder="Start Your Campaign"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta_url">CTA URL</Label>
                <Input
                  id="cta_url"
                  value={formData.cta_url}
                  onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  placeholder="/create-campaign"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta_style">CTA Style</Label>
                <select
                  id="cta_style"
                  value={formData.cta_style}
                  onChange={(e) => setFormData({ ...formData, cta_style: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="button">Button</option>
                  <option value="banner">Banner</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Publish Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this post visible to the public
                  </p>
                </div>
                <Switch
                  checked={formData.status === 'published'}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, status: checked ? 'published' : 'draft' })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Comments</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable commenting on this post
                  </p>
                </div>
                <Switch
                  checked={formData.allow_comments}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allow_comments: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include in Sitemap</Label>
                  <p className="text-sm text-muted-foreground">
                    Help search engines find this post
                  </p>
                </div>
                <Switch
                  checked={formData.sitemap_include}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, sitemap_include: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Create Child Video Pages</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate separate pages for each video
                  </p>
                </div>
                <Switch
                  checked={formData.create_child_video_pages}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, create_child_video_pages: checked })
                  }
                />
              </div>

                <div className="space-y-2">
                  <Label htmlFor="publish_at">Schedule Publishing</Label>
                  <Input
                    id="publish_at"
                    type="datetime-local"
                    value={formData.publish_at || ''}
                    onChange={(e) => setFormData({ ...formData, publish_at: e.target.value || null })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to publish immediately when status is set to published
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="created_at">Created Date {isEditing ? '' : '(optional)'}</Label>
                  <Input
                    id="created_at"
                    type="datetime-local"
                    value={formData.created_at || ''}
                    onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isEditing
                      ? 'Change the post\'s creation date (used for sorting and "posted on" display).'
                      : 'Leave empty to use the current date/time. Set a past date to backdate the post.'}
                  </p>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
};

export default BlogEditor;
