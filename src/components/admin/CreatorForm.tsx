import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import RichTextEditor from './RichTextEditor';
import ImageUploadField from './ImageUploadField';

interface Creator {
  id: string;
  name: string;
  bio: string | null;
  email: string | null;
  profile_image_url: string | null;
  slug?: string | null;
  channel_url?: string | null;
  subscribers?: number | null;
  short_bio?: string | null;
  banner_url?: string | null;
  page_title?: string | null;
  about_content?: string | null;
}

interface CreatorFormProps {
  creator: Creator | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Creator>) => Promise<void>;
}

const CreatorForm = ({ creator, isOpen, onClose, onSave }: CreatorFormProps) => {
  const [formData, setFormData] = useState({
    name: creator?.name || '',
    bio: creator?.bio || '',
    email: creator?.email || '',
    profile_image_url: creator?.profile_image_url || '',
    channel_url: creator?.channel_url || '',
    subscribers: creator?.subscribers || 0,
    short_bio: creator?.short_bio || '',
    banner_url: creator?.banner_url || '',
    page_title: creator?.page_title || '',
    about_content: creator?.about_content || '',
  });

  // Reset form data when dialog opens or creator changes
  useEffect(() => {
    if (isOpen) {
      if (creator) {
        setFormData({
          name: creator.name || '',
          bio: creator.bio || '',
          email: creator.email || '',
          profile_image_url: creator.profile_image_url || '',
          channel_url: creator.channel_url || '',
          subscribers: creator.subscribers || 0,
          short_bio: creator.short_bio || '',
          banner_url: creator.banner_url || '',
          page_title: creator.page_title || '',
          about_content: creator.about_content || '',
        });
      } else {
        setFormData({
          name: '',
          bio: '',
          email: '',
          profile_image_url: '',
          channel_url: '',
          subscribers: 0,
          short_bio: '',
          banner_url: '',
          page_title: '',
          about_content: '',
        });
      }
    }
  }, [isOpen, creator]);

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return; // HTML required attribute handles this, but double-check
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch {
      // Error is already handled by the parent via toast — keep dialog open so user can fix & retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{creator ? 'Edit Creator' : 'Add New Creator'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Creator Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="text"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="creator@example.com"
            />
          </div>

          <ImageUploadField
            label="Profile Image"
            value={formData.profile_image_url}
            onChange={(url) => setFormData({ ...formData, profile_image_url: url })}
            bucketName="assets"
            folderPath="creators/profiles"
            previewClassName="h-20 w-20 rounded-full object-cover"
          />

          <div className="space-y-2">
            <Label htmlFor="short_bio">Short Bio</Label>
            <Textarea
              id="short_bio"
              value={formData.short_bio}
              onChange={(e) => setFormData({ ...formData, short_bio: e.target.value })}
              placeholder="Brief one-liner for creator pages"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Full Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Detailed description of the creator"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel_url">YouTube Channel URL</Label>
            <Input
              id="channel_url"
              value={formData.channel_url}
              onChange={(e) => setFormData({ ...formData, channel_url: e.target.value })}
              placeholder="https://youtube.com/@channel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscribers">Subscribers</Label>
            <Input
              id="subscribers"
              type="number"
              value={formData.subscribers}
              onChange={(e) => setFormData({ ...formData, subscribers: parseInt(e.target.value) || 0 })}
              placeholder="1000000"
            />
          </div>

          <div className="border-t pt-4 mt-6">
            <h3 className="text-lg font-semibold mb-4">Creator Landing Page Content</h3>
            
            <ImageUploadField
              label="Banner Image"
              value={formData.banner_url}
              onChange={(url) => setFormData({ ...formData, banner_url: url })}
              bucketName="assets"
              folderPath="creators/banners"
              previewClassName="w-full h-48 object-cover rounded-lg"
            />

            <div className="space-y-2">
              <Label htmlFor="page_title">Page Title/Headline</Label>
              <Input
                id="page_title"
                value={formData.page_title}
                onChange={(e) => setFormData({ ...formData, page_title: e.target.value })}
                placeholder="About [Creator Name]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="about_content">About Content (Rich Text)</Label>
              <RichTextEditor
                value={formData.about_content}
                onChange={(value) => setFormData({ ...formData, about_content: value })}
              />
            </div>
          </div>

            <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (creator ? 'Update' : 'Create')} {saving ? '' : 'Creator'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CreatorForm;
