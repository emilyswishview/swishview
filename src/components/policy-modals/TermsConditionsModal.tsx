
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TermsConditionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TermsConditionsModal = ({ open, onOpenChange }: TermsConditionsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Terms & Conditions
          </DialogTitle>
          <DialogDescription className="sr-only">
            SwishView Terms and Conditions
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
          <p>
            SwishView helps YouTube content creators promote their videos to increase visibility
            and audience reach. You must provide accurate details and comply with YouTube
            policies.
          </p>
          <p>
            While we aim to improve your reach, we do not guarantee views or subscribers. All
            services are subject to fair use, and any attempt to misuse the platform may result in
            termination of service without notice.
          </p>
          <p>
            These terms are governed by the laws of India.
          </p>
          <p>
            Contact:{" "}
            <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
              support@swishview.com
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsConditionsModal;
