
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContactInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactInfoModal = ({ open, onOpenChange }: ContactInfoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
            📬 Contact Us
          </DialogTitle>
          <DialogDescription className="sr-only">
            SwishView Contact Information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
          <p>
            For any questions or support, reach out to us at{" "}
            <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
              support@swishview.com
            </a>. 
            We aim to reply within 12–24 hours on business days.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactInfoModal;
