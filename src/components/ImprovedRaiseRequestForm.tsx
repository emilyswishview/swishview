import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send,
  AlertCircle,
  X,
  Upload,
  FileText,
  Image,
  Trash2
} from "lucide-react";

interface ImprovedRaiseRequestFormProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  requestType?: string;
}

interface AttachedFile {
  file: File;
  preview?: string;
}

const ImprovedRaiseRequestForm = ({ 
  userId, 
  isOpen, 
  onClose, 
  requestType = 'general' 
}: ImprovedRaiseRequestFormProps) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      // Limit to 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    const newFiles: AttachedFile[] = validFiles.map(file => {
      const attachedFile: AttachedFile = { file };
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachedFile.preview = e.target?.result as string;
          setAttachedFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      }
      
      return attachedFile;
    });

    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const uploadFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const attachedFile of attachedFiles) {
      const fileName = `${userId}/${Date.now()}_${attachedFile.file.name}`;
      
      const { data, error } = await supabase.storage
        .from('request-attachments')
        .upload(fileName, attachedFile.file);
        
      if (error) {
        console.error('File upload error:', error);
        throw new Error(`Failed to upload ${attachedFile.file.name}`);
      }
      
      uploadedUrls.push(fileName);
    }
    
    return uploadedUrls;
  };

  const submitRequest = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Please provide both subject and message",
        variant: "destructive",
      });
      return;
    }

    try {
      setRequesting(true);

      // Upload files first
      const attachmentUrls = attachedFiles.length > 0 ? await uploadFiles() : [];

      // Get user profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      // Create request in user_requests table
      const { data: requestData, error: requestError } = await supabase
        .from('user_requests')
        .insert({
          user_id: userId,
          subject: subject.trim(),
          message: message.trim(),
          request_type: requestType,
          attachment_urls: attachmentUrls
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create admin notification for the request
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: 'admin', // This will be for admin notifications
          title: `New ${requestType.replace('_', ' ')} Request`,
          message: `${profile?.full_name || profile?.email || 'User'} submitted: ${subject.trim()}`,
          type: 'admin_alert'
        });

      if (notificationError) {
        console.error('Admin notification error:', notificationError);
      }

      // Call edge function to send email to support
      console.log('Calling send-support-email function with data:', {
        userEmail: profile?.email,
        userName: profile?.full_name || profile?.email,
        subject: subject.trim(),
        message: message.trim(),
        requestType: requestType,
        requestId: requestData.id,
        attachmentUrls: attachmentUrls
      });

      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-support-email', {
        body: {
          userEmail: profile?.email,
          userName: profile?.full_name || profile?.email,
          subject: subject.trim(),
          message: message.trim(),
          requestType: requestType,
          requestId: requestData.id,
          attachmentUrls: attachmentUrls
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      console.log('Email sent successfully:', emailData);

      toast({
        title: "Success",
        description: "Your request has been submitted successfully",
      });

      setSubject('');
      setMessage('');
      setAttachedFiles([]);
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send request",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Raise a Support Request
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Need help or have a question?</p>
                <p>Our support team will get back to you within 24 hours. You can attach files or screenshots to help us better understand your request.</p>
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="request_subject">Subject</Label>
            <Input
              id="request_subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your request..."
            />
          </div>
          
          <div>
            <Label htmlFor="request_message">Message</Label>
            <Textarea
              id="request_message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please provide detailed information about your request..."
              rows={5}
            />
          </div>

          {/* File Upload Section */}
          <div>
            <Label>Attachments (Optional)</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag & drop files here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline"
                >
                  browse files
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 10MB per file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Attached Files</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {attachedFiles.map((attachedFile, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                    {attachedFile.preview ? (
                      <img 
                        src={attachedFile.preview} 
                        alt="Preview" 
                        className="w-8 h-8 object-cover rounded"
                      />
                    ) : (
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    )}
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{attachedFile.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(attachedFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={submitRequest} 
              disabled={requesting || !subject.trim() || !message.trim()}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {requesting ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImprovedRaiseRequestForm;