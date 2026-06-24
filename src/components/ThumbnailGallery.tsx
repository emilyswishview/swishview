import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Download, Trash2, Tag, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Thumbnail {
  id: string;
  image_url: string;
  prompt: string;
  tags: string[];
  created_at: string;
}

export function ThumbnailGallery() {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [filteredThumbnails, setFilteredThumbnails] = useState<Thumbnail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchThumbnails();
  }, []);

  useEffect(() => {
    filterThumbnails();
  }, [searchQuery, selectedTags, thumbnails]);

  const fetchThumbnails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view your thumbnails");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("thumbnail_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setThumbnails(data || []);
      
      // Extract all unique tags
      const tags = new Set<string>();
      data?.forEach(thumb => {
        thumb.tags?.forEach((tag: string) => tags.add(tag));
      });
      setAllTags(Array.from(tags));
    } catch (error) {
      console.error("Error fetching thumbnails:", error);
      toast.error("Failed to load thumbnails");
    } finally {
      setIsLoading(false);
    }
  };

  const filterThumbnails = () => {
    let filtered = thumbnails;

    if (searchQuery) {
      filtered = filtered.filter(thumb =>
        thumb.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(thumb =>
        selectedTags.some(tag => thumb.tags?.includes(tag))
      );
    }

    setFilteredThumbnails(filtered);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("thumbnail_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setThumbnails(prev => prev.filter(t => t.id !== id));
      toast.success("Thumbnail deleted");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting thumbnail:", error);
      toast.error("Failed to delete thumbnail");
    }
  };

  const handleDownload = (thumbnail: Thumbnail) => {
    const link = document.createElement("a");
    link.href = thumbnail.image_url;
    link.download = `${thumbnail.prompt.slice(0, 30)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading thumbnails...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {allTags.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filter by tags:</Label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTags([])}
                  className="h-6 px-2"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {filteredThumbnails.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {thumbnails.length === 0
              ? "No thumbnails yet. Generate your first one!"
              : "No thumbnails match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredThumbnails.map(thumbnail => (
            <Card key={thumbnail.id} className="overflow-hidden group">
              <div className="relative aspect-video">
                <img
                  src={thumbnail.image_url}
                  alt={thumbnail.prompt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownload(thumbnail)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteId(thumbnail.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm line-clamp-2">{thumbnail.prompt}</p>
                {thumbnail.tags && thumbnail.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {thumbnail.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(thumbnail.created_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thumbnail?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The thumbnail will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
