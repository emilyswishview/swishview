import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/looseClient";
import { notifyUserActivity } from "@/utils/notifyActivity";
import { Loader2, Send } from "lucide-react";

interface ContactInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactInfoModal = ({ open, onOpenChange }: ContactInfoModalProps) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("contact_messages").insert([
        {
          full_name: formData.fullName,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        },
      ]);

      if (error) throw error;

      await notifyUserActivity({
        type: "contact_message",
        data: {
          full_name: formData.fullName,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        },
      });

      toast({
        title: "Message sent successfully!",
        description: "Thank you for contacting us. We'll get back to you soon.",
      });

      setFormData({ fullName: "", email: "", subject: "", message: "" });
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Error sending message",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-8 pt-8 pb-4 text-center">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            Talk to our Growth Team
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Fill out the form below and we'll reach out to you shortly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="contact-fullName" className="text-sm font-medium text-foreground">
                Full Name <span className="text-orange-500">*</span>
              </label>
              <Input
                id="contact-fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="John Doe"
                className="h-12 rounded-xl border-border bg-background px-4"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contact-email" className="text-sm font-medium text-foreground">
                Email <span className="text-orange-500">*</span>
              </label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
                className="h-12 rounded-xl border-border bg-background px-4"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="contact-subject" className="text-sm font-medium text-foreground">
              Subject
            </label>
            <Input
              id="contact-subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleChange}
              placeholder="What is this about?"
              className="h-12 rounded-xl border-border bg-background px-4"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contact-message" className="text-sm font-medium text-foreground">
              Message <span className="text-orange-500">*</span>
            </label>
            <Textarea
              id="contact-message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              placeholder="Tell us more about your inquiry..."
              rows={4}
              className="rounded-xl border-border bg-background px-4 py-3 resize-none"
            />
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Or email us directly at{" "}
            <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
              support@swishview.com
            </a>
          </p>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactInfoModal;
