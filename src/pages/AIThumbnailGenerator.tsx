import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Download, Sparkles, Upload, Undo2, Redo2, Eye, Settings, Save, BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThumbnailGallery } from "@/components/ThumbnailGallery";
import { UserProfile } from "@/components/UserProfile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AIThumbnailGenerator() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [prompt, setPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [refinePrompt, setRefinePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [thumbnailTags, setThumbnailTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // History management
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const REFINEMENT_PRESETS = [
    { label: "More Vibrant", prompt: "Make colors more vibrant and saturated, increase color intensity" },
    { label: "Increase Contrast", prompt: "Increase contrast significantly, make darks darker and lights lighter" },
    { label: "Add Drama", prompt: "Add dramatic lighting effects, create intense atmosphere with shadows and highlights" },
    { label: "Sharpen Details", prompt: "Sharpen all details, increase clarity and definition throughout" },
    { label: "Boost Energy", prompt: "Add explosive energy, dynamic motion blur effects, increase visual excitement" },
    { label: "Make Bold", prompt: "Make everything bolder - stronger colors, thicker text, more impact" },
  ];

  const addToHistory = (imageUrl: string) => {
    const newHistory = imageHistory.slice(0, historyIndex + 1);
    newHistory.push(imageUrl);
    setImageHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setGeneratedImage(imageHistory[newIndex]);
      toast.success("Undone to previous version");
    }
  };

  const handleRedo = () => {
    if (historyIndex < imageHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setGeneratedImage(imageHistory[newIndex]);
      toast.success("Redone to next version");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
        body: { 
          prompt: `YouTube thumbnail: ${prompt}. High quality, eye-catching, professional, 16:9 aspect ratio`
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.image) {
        setGeneratedImage(data.image);
        addToHistory(data.image);
        setShowComparison(false);
        toast.success("Thumbnail generated!");
      } else {
        toast.error("No image received from API");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate thumbnail");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setEditedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = async () => {
    if (!uploadedImage) {
      toast.error("Please upload an image first");
      return;
    }

    if (!editPrompt.trim()) {
      toast.error("Please enter editing instructions");
      return;
    }

    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke("edit-thumbnail", {
        body: { 
          image: uploadedImage,
          prompt: `Edit this YouTube thumbnail: ${editPrompt}. Make it eye-catching and professional for YouTube`,
          customApiKey: customApiKey || undefined
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.image) {
        setEditedImage(data.image);
        toast.success("Thumbnail edited!");
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast.error("Failed to edit thumbnail");
    } finally {
      setIsEditing(false);
    }
  };

  const handleRefineGenerated = async (customPrompt?: string) => {
    if (!generatedImage) {
      toast.error("Please generate an image first");
      return;
    }

    const promptToUse = customPrompt || refinePrompt;
    if (!promptToUse.trim()) {
      toast.error("Please enter refinement instructions");
      return;
    }

    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("edit-thumbnail", {
        body: { 
          image: generatedImage,
          prompt: `Refine this YouTube thumbnail: ${promptToUse}. Keep the main concept but make it more eye-catching and professional`,
          customApiKey: customApiKey || undefined
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.image) {
        setGeneratedImage(data.image);
        addToHistory(data.image);
        if (!customPrompt) {
          setRefinePrompt("");
        }
        setShowComparison(true);
        toast.success("Thumbnail refined!");
      }
    } catch (error) {
      console.error("Refine error:", error);
      toast.error("Failed to refine thumbnail");
    } finally {
      setIsRefining(false);
    }
  };

  const handlePresetRefinement = (presetPrompt: string) => {
    handleRefineGenerated(presetPrompt);
  };

  const handleSaveToGallery = async () => {
    if (!generatedImage) {
      toast.error("No image to save");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to save thumbnails");
        return;
      }

      const tags = thumbnailTags
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { error } = await supabase.from("thumbnail_history").insert({
        user_id: user.id,
        image_url: generatedImage,
        prompt: prompt,
        tags: tags,
      });

      if (error) throw error;

      toast.success("Thumbnail saved to gallery!");
      setThumbnailTags("");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save thumbnail");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = (imageData: string, filename: string) => {
    const link = document.createElement("a");
    link.href = imageData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                AI Thumbnail Generator
              </h1>
              <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configure API Key</DialogTitle>
                    <DialogDescription>
                      Enter your API key to continue generating images when credits run out.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your API key"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        toast.success("API key configured!");
                        setShowApiKeyDialog(false);
                      }}
                      className="w-full"
                    >
                      Save API Key
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-muted-foreground text-lg">
              Create stunning YouTube thumbnails with AI
            </p>
          </div>
          
          <div className="absolute top-4 right-4">
            <UserProfile user={user} />
          </div>
        </div>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="edit" className="gap-2">
              <Upload className="w-4 h-4" />
              Edit Existing Image
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-2">
              <BookMarked className="w-4 h-4" />
              My Gallery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt" className="text-lg font-semibold">
                      Describe your thumbnail
                    </Label>
                    <Textarea
                      id="prompt"
                      placeholder="E.g., A dramatic scene with a person looking shocked at a laptop, bold text saying 'YOU WON'T BELIEVE THIS', bright yellow and red colors..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="mt-2 min-h-[120px]"
                    />
                  </div>

                  <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Thumbnail
                      </>
                    )}
                  </Button>

                  {generatedImage && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">Refine Result</Label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleUndo}
                            disabled={historyIndex <= 0 || isRefining}
                          >
                            <Undo2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleRedo}
                            disabled={historyIndex >= imageHistory.length - 1 || isRefining}
                          >
                            <Redo2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {REFINEMENT_PRESETS.map((preset) => (
                          <Badge
                            key={preset.label}
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => !isRefining && handlePresetRefinement(preset.prompt)}
                          >
                            {preset.label}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Or describe custom refinements..."
                          value={refinePrompt}
                          onChange={(e) => setRefinePrompt(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <Button 
                          onClick={() => handleRefineGenerated()} 
                          disabled={isRefining || !refinePrompt.trim()}
                          size="icon"
                          className="h-auto"
                        >
                          {isRefining ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Preview</Label>
                    {generatedImage && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowComparison(!showComparison)}
                          disabled={historyIndex < 1}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {showComparison ? "Hide" : "Compare"}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    {isGenerating ? (
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Creating your thumbnail...</p>
                      </div>
                    ) : generatedImage ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={generatedImage} 
                          alt="Generated thumbnail" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Your thumbnail will appear here</p>
                      </div>
                    )}
                  </div>

                  {showComparison && historyIndex > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Previous Version</Label>
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <img 
                          src={imageHistory[historyIndex - 1]} 
                          alt="Previous version" 
                          className="w-full h-full object-cover opacity-70"
                        />
                      </div>
                    </div>
                  )}

                  {generatedImage && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add tags (comma separated)"
                          value={thumbnailTags}
                          onChange={(e) => setThumbnailTags(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          onClick={handleSaveToGallery}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleDownload(generatedImage, "thumbnail.png")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Thumbnail
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="edit">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="upload" className="text-lg font-semibold">
                      Upload Image
                    </Label>
                    <div className="mt-2">
                      <Input
                        id="upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>

                  {uploadedImage && (
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="editPrompt" className="text-lg font-semibold">
                      Edit Instructions
                    </Label>
                    <Textarea
                      id="editPrompt"
                      placeholder="E.g., Add bold text 'SHOCKING REVEAL', make colors more vibrant, add a red arrow pointing to the main subject..."
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      className="mt-2 min-h-[120px]"
                    />
                  </div>

                  <Button 
                    onClick={handleEdit} 
                    disabled={isEditing || !uploadedImage}
                    className="w-full"
                    size="lg"
                  >
                    {isEditing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Editing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Edit Thumbnail
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Edited Result</Label>
                  
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    {isEditing ? (
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Editing your thumbnail...</p>
                      </div>
                    ) : editedImage ? (
                      <img 
                        src={editedImage} 
                        alt="Edited thumbnail" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-8">
                        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Edited result will appear here</p>
                      </div>
                    )}
                  </div>

                  {editedImage && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleDownload(editedImage, "edited-thumbnail.png")}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Edited Thumbnail
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="gallery">
            <ThumbnailGallery />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
